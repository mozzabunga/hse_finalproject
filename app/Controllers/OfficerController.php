<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Core\Database;
use App\Core\AuthMiddleware;
use App\Core\Policy;
use App\Services\RiskMatrixEvaluator;
use App\Services\HazardPresentation;
use App\Services\DateFormatter;
use App\Services\DFAValidationEngine;
use App\Lib\PDF\HSEDocumentGenerator;

class OfficerController extends Controller
{
    /**
     * Pastikan pengguna terotentikasi sebagai petugas K3
     */
    protected function authenticate(): array
    {
        $user = Session::user();
        if (!$user || !Policy::isOfficer($user)) {
            Session::flash('error', 'Sesi berakhir atau Anda tidak memiliki akses ke portal petugas.');
            Response::redirect(url('/login'));
            exit;
        }
        return $user;
    }

    /**
     * Sub-tab 1: Dashboard Utama & KPI Manajerial
     */
    public function index(Request $request): void
    {
        $this->dashboard($request);
    }

    public function dashboard(Request $request): void
    {
        $user = $this->authenticate();
        $pdo = Database::getConnection();

        // Ambil semua laporan bahaya untuk kalkulasi metrik eksekutif
        $stmt = $pdo->query("SELECT * FROM hazard_reports ORDER BY created_at DESC");
        $reports = $stmt->fetchAll() ?: [];

        $totalReports = count($reports);
        $closedCount = 0;
        $overdueCount = 0;
        $now = time();

        $totalResDurationSec = 0;
        $resolvedCountWithDates = 0;

        $pendingValidationCount = 0;
        $underReviewCount = 0;
        $resolvedTodayCount = 0;

        $todayWib = (new \DateTime('now', new \DateTimeZone('Asia/Jakarta')))->format('Y-m-d');

        $depMap = [];
        $catMap = ['A' => 0, 'B' => 0, 'C' => 0];
        $statusMap = [
            'NewReport'          => 0,
            'PendingValidation'  => 0,
            'UnderInvestigation' => 0,
            'ActionRequired'     => 0,
            'WaitingProcurement' => 0,
            'Implementation'     => 0,
            'Completed'          => 0,
            'Resolved'           => 0
        ];

        // 5x5 Risk Matrix Cell Counts
        $riskMatrixCellCounts = [];
        for ($s = 1; $s <= 5; $s++) {
            for ($l = 1; $l <= 5; $l++) {
                $riskMatrixCellCounts["{$s}_{$l}"] = 0;
            }
        }

        // Location Heatmap
        $heatmapMap = [];

        // Monthly Trend
        $monthlyTrend = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthKey = date('Y') . '-' . sprintf('%02d', $m);
            $monthLabel = date('M', mktime(0, 0, 0, $m, 1));
            $monthlyTrend[$monthKey] = [
                'month'    => $monthLabel,
                'created'  => 0,
                'resolved' => 0
            ];
        }

        foreach ($reports as $r) {
            $status = $r['status'] ?? 'NewReport';
            $isResolved = in_array($status, ['Completed', 'Resolved'], true);
            $createdAtTs = !empty($r['created_at']) ? strtotime($r['created_at']) : $now;
            $updatedAtTs = !empty($r['updated_at']) ? strtotime($r['updated_at']) : $createdAtTs;

            // Increment status count
            if (isset($statusMap[$status])) {
                $statusMap[$status]++;
            }

            if ($isResolved) {
                $closedCount++;

                // Duration in seconds
                $dur = $updatedAtTs - $createdAtTs;
                if ($dur > 0) {
                    $totalResDurationSec += $dur;
                    $resolvedCountWithDates++;
                }

                // Check resolved today (WIB)
                $updatedWib = (new \DateTime($r['updated_at'] ?? 'now', new \DateTimeZone('UTC')))
                    ->setTimezone(new \DateTimeZone('Asia/Jakarta'))
                    ->format('Y-m-d');
                if ($updatedWib === $todayWib) {
                    $resolvedTodayCount++;
                }

                // Monthly resolved
                $mKey = date('Y-m', $updatedAtTs);
                if (isset($monthlyTrend[$mKey])) {
                    $monthlyTrend[$mKey]['resolved']++;
                }
            } else {
                // Check SLA overdue (> 3 days / 72 hours)
                $elapsed = $now - $createdAtTs;
                if ($elapsed > (3 * 86400)) {
                    $overdueCount++;
                }
            }

            // Monthly created
            $mKeyCreate = date('Y-m', $createdAtTs);
            if (isset($monthlyTrend[$mKeyCreate])) {
                $monthlyTrend[$mKeyCreate]['created']++;
            }

            // Status stage buckets
            if ($status === 'NewReport' || $status === 'PendingValidation') {
                $pendingValidationCount++;
            } elseif ($status === 'UnderInvestigation' || $status === 'ActionRequired') {
                $underReviewCount++;
            }

            // Department
            $dept = !empty($r['department']) ? $r['department'] : 'Production';
            $depMap[$dept] = ($depMap[$dept] ?? 0) + 1;

            // Category
            $cat = !empty($r['category']) ? $r['category'] : 'C';
            if (isset($catMap[$cat])) {
                $catMap[$cat]++;
            }

            // 5x5 Matrix Key
            $s = (int)($r['severity'] ?? 2);
            $l = (int)($r['likelihood'] ?? 2);
            if ($s < 1 || $s > 5) $s = 2;
            if ($l < 1 || $l > 5) $l = 2;
            $cellKey = "{$s}_{$l}";
            $riskMatrixCellCounts[$cellKey] = ($riskMatrixCellCounts[$cellKey] ?? 0) + 1;

            // Heatmap
            $area = !empty($r['area']) ? $r['area'] : 'General Facility';
            $heatKey = "{$area}__{$dept}";
            if (!isset($heatmapMap[$heatKey])) {
                $heatmapMap[$heatKey] = [
                    'area'         => $area,
                    'dept'         => $dept,
                    'count'        => 0,
                    'highestScore' => 0
                ];
            }
            $heatmapMap[$heatKey]['count']++;
            $score = (int)($r['risk_score'] ?? ($s * $l));
            if ($score > $heatmapMap[$heatKey]['highestScore']) {
                $heatmapMap[$heatKey]['highestScore'] = $score;
            }
        }

        $openCount = $totalReports - $closedCount;
        $slaComplianceRate = $totalReports > 0 ? (int)round((($totalReports - $overdueCount) / $totalReports) * 100) : 100;
        $avgResolutionDays = $resolvedCountWithDates > 0
            ? number_format($totalResDurationSec / ($resolvedCountWithDates * 86400), 1)
            : '1.2';

        // Top Department
        $topDepartment = 'None';
        $maxDep = 0;
        foreach ($depMap as $dName => $dCount) {
            if ($dCount > $maxDep) {
                $maxDep = $dCount;
                $topDepartment = $dName;
            }
        }

        // Top Category
        $topCategory = 'Cat A (PPE / APD)';
        $maxCat = 0;
        foreach ($catMap as $cKey => $cCount) {
            if ($cCount > $maxCat) {
                $maxCat = $cCount;
                $topCategory = $cKey === 'A' ? 'Cat A (PPE / APD)' : ($cKey === 'B' ? 'Cat B (Environmental)' : 'Cat C (Maintenance)');
            }
        }

        // Heatmap sorted
        usort($heatmapMap, fn($a, $b) => $b['count'] <=> $a['count']);
        $heatmapList = array_slice($heatmapMap, 0, 8);

        $metrics = [
            'totalReports'           => $totalReports,
            'openCount'              => $openCount,
            'closedCount'            => $closedCount,
            'avgResolutionDays'      => $avgResolutionDays,
            'slaComplianceRate'      => $slaComplianceRate,
            'topDepartment'          => $topDepartment,
            'topCategory'            => $topCategory,
            'pendingValidationCount' => $pendingValidationCount,
            'underReviewCount'       => $underReviewCount,
            'resolvedTodayCount'     => $resolvedTodayCount,
            'overdueCount'           => $overdueCount,
            'statusMap'              => $statusMap,
            'depMap'                 => $depMap,
            'catMap'                 => $catMap,
            'riskMatrixCellCounts'   => $riskMatrixCellCounts,
            'heatmapList'            => $heatmapList,
            'monthlyTrend'           => array_values($monthlyTrend)
        ];

        Response::render('officer/index', [
            'pageTitle'    => 'Portal Petugas K3 — PT Minda Automotive Indonesia',
            'currentNav'   => 'admin',
            'currentUser'  => $user,
            'activeSubtab' => 'dashboard',
            'metrics'      => $metrics
        ]);
    }

    /**
     * Sub-tab 2: Safety Tickets Ledger & DFA State Transitions
     */
    public function tickets(Request $request): void
    {
        $user = $this->authenticate();
        $pdo = Database::getConnection();

        // 1. Ambil Parameter Filter
        $searchQuery        = trim((string)$request->get('searchQuery', $request->get('q', '')));
        $searchTicketId     = trim((string)$request->get('searchTicketId', ''));
        $searchEmployeeId   = trim((string)$request->get('searchEmployeeId', ''));
        $searchReporterName = trim((string)$request->get('searchReporterName', ''));
        $filterStatus       = (string)$request->get('filterStatus', 'all');
        $filterCategory     = (string)$request->get('filterCategory', 'all');
        $filterDepartment   = (string)$request->get('filterDepartment', 'all');
        $dateRangePreset    = (string)$request->get('dateRangePreset', 'all');
        $customStartDate    = (string)$request->get('customStartDate', '');
        $customEndDate      = (string)$request->get('customEndDate', '');

        $hasActiveFilters = ($searchQuery !== '' || $searchTicketId !== '' || $searchEmployeeId !== '' ||
            $searchReporterName !== '' || $filterStatus !== 'all' || $filterCategory !== 'all' ||
            $filterDepartment !== 'all' || $dateRangePreset !== 'all');

        $showFilters = ($request->get('showFilters') === '1' || $hasActiveFilters);

        // 2. Bangun Query Filter Dinamis
        $sql = "SELECT * FROM hazard_reports WHERE 1=1";
        $params = [];

        if ($searchQuery !== '') {
            $sql .= " AND (title LIKE :sq OR description LIKE :sq2 OR area LIKE :sq3)";
            $params['sq']  = '%' . $searchQuery . '%';
            $params['sq2'] = '%' . $searchQuery . '%';
            $params['sq3'] = '%' . $searchQuery . '%';
        }

        if ($searchTicketId !== '') {
            $sql .= " AND ticket_id LIKE :st";
            $params['st'] = '%' . $searchTicketId . '%';
        }

        if ($searchEmployeeId !== '') {
            $sql .= " AND employee_id LIKE :se";
            $params['se'] = '%' . $searchEmployeeId . '%';
        }

        if ($searchReporterName !== '') {
            $sql .= " AND reporter_name LIKE :sr";
            $params['sr'] = '%' . $searchReporterName . '%';
        }

        if ($filterStatus !== 'all') {
            $sql .= " AND status = :stt";
            $params['stt'] = $filterStatus;
        }

        if ($filterCategory !== 'all') {
            $sql .= " AND category = :cat";
            $params['cat'] = $filterCategory;
        }

        if ($filterDepartment !== 'all') {
            $sql .= " AND department = :dept";
            $params['dept'] = $filterDepartment;
        }

        // Date range
        $now = time();
        if ($dateRangePreset === 'last24h') {
            $sql .= " AND created_at >= :d24";
            $params['d24'] = date('Y-m-d H:i:s', $now - 86400);
        } elseif ($dateRangePreset === 'last7d') {
            $sql .= " AND created_at >= :d7";
            $params['d7'] = date('Y-m-d H:i:s', $now - (7 * 86400));
        } elseif ($dateRangePreset === 'last30d') {
            $sql .= " AND created_at >= :d30";
            $params['d30'] = date('Y-m-d H:i:s', $now - (30 * 86400));
        } elseif ($dateRangePreset === 'custom') {
            if ($customStartDate !== '') {
                $sql .= " AND created_at >= :cstart";
                $params['cstart'] = $customStartDate . ' 00:00:00';
            }
            if ($customEndDate !== '') {
                $sql .= " AND created_at <= :cend";
                $params['cend'] = $customEndDate . ' 23:59:59';
            }
        }

        $sql .= " ORDER BY created_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filteredReports = $stmt->fetchAll() ?: [];

        // 3. Tentukan Tiket yang Dipilih
        $selectedId = (string)$request->get('id', '');
        $selectedReport = null;

        if ($selectedId !== '') {
            foreach ($filteredReports as $r) {
                if ($r['id'] === $selectedId || $r['ticket_id'] === $selectedId) {
                    $selectedReport = $r;
                    break;
                }
            }
            if (!$selectedReport) {
                // Cari langsung di DB jika tidak ada di filtered result
                $sStmt = $pdo->prepare("SELECT * FROM hazard_reports WHERE id = :id OR ticket_id = :tid LIMIT 1");
                $sStmt->execute(['id' => $selectedId, 'tid' => $selectedId]);
                $selectedReport = $sStmt->fetch() ?: null;
            }
        } elseif (!empty($filteredReports)) {
            $selectedReport = $filteredReports[0];
        }

        // 4. Data Terkait Tiket Terpilih (Komentar & Riwayat Status)
        $comments = [];
        $statusHistory = [];
        $parsedDetails = null;
        $evalRes = null;

        if ($selectedReport) {
            $cStmt = $pdo->prepare("
                SELECT id, hazard_id, user_id, user_name, user_role, comment AS comment_text, is_internal_only, created_at 
                FROM hazard_comments 
                WHERE hazard_id = :hid 
                ORDER BY created_at ASC
            ");
            $cStmt->execute(['hid' => $selectedReport['id']]);
            $comments = $cStmt->fetchAll() ?: [];

            $hStmt = $pdo->prepare("
                SELECT * FROM status_history 
                WHERE hazard_id = :hid 
                ORDER BY created_at DESC
            ");
            $hStmt->execute(['hid' => $selectedReport['id']]);
            $statusHistory = $hStmt->fetchAll() ?: [];

            $parsedDetails = HazardPresentation::parseDetails($selectedReport);
            $evalRes = RiskMatrixEvaluator::evaluate(
                (int)($selectedReport['severity'] ?? 2),
                (int)($selectedReport['likelihood'] ?? 2)
            );
        }

        Response::render('officer/index', [
            'pageTitle'          => 'Safety Tickets Ledger & DFA Transitions — PT Minda Automotive Indonesia',
            'currentNav'         => 'admin',
            'currentUser'        => $user,
            'activeSubtab'       => 'tickets',
            'filteredReports'    => $filteredReports,
            'selectedReport'     => $selectedReport,
            'comments'           => $comments,
            'statusHistory'      => $statusHistory,
            'parsedDetails'      => $parsedDetails,
            'evalRes'            => $evalRes,
            'filters'            => [
                'searchQuery'        => $searchQuery,
                'searchTicketId'     => $searchTicketId,
                'searchEmployeeId'   => $searchEmployeeId,
                'searchReporterName' => $searchReporterName,
                'filterStatus'       => $filterStatus,
                'filterCategory'     => $filterCategory,
                'filterDepartment'   => $filterDepartment,
                'dateRangePreset'    => $dateRangePreset,
                'customStartDate'    => $customStartDate,
                'customEndDate'      => $customEndDate,
                'showFilters'        => $showFilters,
            ],
            'successMessage'     => Session::flash('success'),
            'errorMessage'       => Session::flash('error'),
        ]);
    }

    /**
     * Update Hazard Controls & DFA State Transition
     */
    public function updateTicket(Request $request, string $id): void
    {
        AuthMiddleware::requireWritable($request);
        $user = Session::user();
        $pdo = Database::getConnection();

        // Cari tiket berdasarkan id atau ticket_id
        $stmt = $pdo->prepare("SELECT * FROM hazard_reports WHERE id = :id OR ticket_id = :tid LIMIT 1");
        $stmt->execute(['id' => $id, 'tid' => $id]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            Session::flash('error', 'Tiket bahaya tidak ditemukan.');
            Response::redirect(url('/admin/tickets'));
            return;
        }

        $currentStatus = $ticket['status'];
        $newStatus     = trim((string)$request->post('status', $currentStatus));

        // Validasi DFA State Machine jika status berubah
        if ($newStatus !== $currentStatus) {
            if (!DFAValidationEngine::isValidTransition($currentStatus, $newStatus)) {
                $allowed = implode(', ', array_map([DFAValidationEngine::class, 'mapStatusToLabel'], DFAValidationEngine::getNextAllowedStates($currentStatus)));
                Session::flash('error', "Transisi DFA tidak valid dari '{$currentStatus}' ke '{$newStatus}'. Status yang diizinkan berikutnya: {$allowed}");
                Response::redirect(url('/admin/tickets?id=' . urlencode($ticket['id'])));
                return;
            }
        }

        // PIC Mapping
        $picCode = trim((string)$request->post('assigned_pic', 'usr_hse_team'));
        $picMap = [
            'usr_hrga_admin'   => ['id' => 'usr_hrga_admin', 'name' => 'HRGA Admin', 'email' => 'hrga_admin@mindaauto.co.id'],
            'usr_asep_permana' => ['id' => 'usr_asep_permana', 'name' => 'Asep Permana', 'email' => 'asep.permana@mindaauto.co.id'],
            'usr_hse_team'     => ['id' => 'usr_hse_team', 'name' => 'HSE Team', 'email' => 'hse_team@mindaauto.co.id'],
        ];
        $picInfo = $picMap[$picCode] ?? $picMap['usr_hse_team'];

        // Risk Evaluation
        $severity   = (int)$request->post('severity', 2);
        $likelihood = (int)$request->post('likelihood', 2);
        $eval = RiskMatrixEvaluator::evaluate($severity, $likelihood);

        $officerComments   = trim((string)$request->post('officer_comments', ''));
        $additionalControl = trim((string)$request->post('additional_control', ''));
        $otpProgramName    = $eval['isOtpRequired'] ? trim((string)$request->post('otp_program_name', '')) : null;

        // Tentukan resolved_at jika status selesai
        $resolvedAt = in_array($newStatus, ['Completed', 'Resolved'], true) ? date('Y-m-d H:i:s') : $ticket['resolved_at'];

        // Update database
        $upSql = "
            UPDATE hazard_reports SET
                status = :status,
                dfa_status = :dfa_status,
                assigned_to = :assigned_to,
                assigned_pic_id = :pic_id,
                assigned_pic_name = :pic_name,
                assigned_pic_email = :pic_email,
                severity = :severity,
                likelihood = :likelihood,
                risk_score = :risk_score,
                risk_level = :risk_level,
                otp_required = :otp_required,
                otp_program_name = :otp_program_name,
                additional_control = :additional_control,
                officer_comments = :officer_comments,
                officer_reviewed = 1,
                officer_review_date = NOW(),
                resolved_at = :resolved_at,
                updated_at = NOW()
            WHERE id = :id
        ";
        $upStmt = $pdo->prepare($upSql);
        $upStmt->execute([
            'status'             => $newStatus,
            'dfa_status'         => $newStatus,
            'assigned_to'        => $picInfo['id'],
            'pic_id'             => $picInfo['id'],
            'pic_name'           => $picInfo['name'],
            'pic_email'          => $picInfo['email'],
            'severity'           => $eval['severity'],
            'likelihood'         => $eval['likelihood'],
            'risk_score'         => $eval['score'],
            'risk_level'         => $eval['level'],
            'otp_required'       => $eval['isOtpRequired'] ? 1 : 0,
            'otp_program_name'   => $otpProgramName,
            'additional_control' => $additionalControl ?: null,
            'officer_comments'   => $officerComments ?: null,
            'resolved_at'        => $resolvedAt,
            'id'                 => $ticket['id'],
        ]);

        // Catat ke status_history jika status berubah
        if ($newStatus !== $currentStatus) {
            $shStmt = $pdo->prepare("
                INSERT INTO status_history (
                    id, hazard_id, previous_status, new_status, changed_by_id, changed_by_name, changed_by_email, notes, created_at
                ) VALUES (
                    :id, :hazard_id, :prev, :next, :by_id, :by_name, :by_email, :notes, NOW()
                )
            ");
            $shStmt->execute([
                'id'        => bin2hex(random_bytes(16)),
                'hazard_id' => $ticket['id'],
                'prev'      => $currentStatus,
                'next'      => $newStatus,
                'by_id'     => $user['id'],
                'by_name'   => $user['name'],
                'by_email'  => $user['email'],
                'notes'     => $officerComments ?: "Transisi status DFA dari {$currentStatus} ke {$newStatus}",
            ]);
        }

        // Catat ke audit_logs dengan ticket_id
        $auditStmt = $pdo->prepare("
            INSERT INTO audit_logs (
                id, hazard_id, ticket_id, user_id, user_email, action, details, created_at
            ) VALUES (
                :id, :hazard_id, :ticket_id, :user_id, :user_email, :action, :details, NOW()
            )
        ");
        $auditStmt->execute([
            'id'          => bin2hex(random_bytes(16)),
            'hazard_id'   => $ticket['id'],
            'ticket_id'   => $ticket['ticket_id'],
            'user_id'     => $user['id'],
            'user_email'  => $user['email'],
            'action'      => 'UPDATE_HAZARD_TICKET',
            'details'     => json_encode([
                'status_from'   => $currentStatus,
                'status_to'     => $newStatus,
                'pic_assigned'  => $picInfo['name'],
                'risk_score'    => $eval['score'],
                'risk_level'    => $eval['level'],
            ], JSON_UNESCAPED_SLASHES),
        ]);

        Session::flash('success', "Tiket {$ticket['ticket_id']} berhasil diperbarui.");
        Response::redirect(url('/admin/tickets?id=' . urlencode($ticket['id'])));
    }

    /**
     * Edit Dialog Modal Data (Full Report Edit)
     */
    public function editReport(Request $request, string $id): void
    {
        AuthMiddleware::requireWritable($request);
        $user = Session::user();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM hazard_reports WHERE id = :id OR ticket_id = :tid LIMIT 1");
        $stmt->execute(['id' => $id, 'tid' => $id]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            Session::flash('error', 'Tiket tidak ditemukan.');
            Response::redirect(url('/admin/tickets'));
            return;
        }

        $reporterName = trim((string)$request->post('reporter_name', $ticket['reporter_name']));
        $employeeId   = trim((string)$request->post('employee_id', $ticket['employee_id']));
        $department   = trim((string)$request->post('department', $ticket['department']));
        $area         = trim((string)$request->post('area', $ticket['area']));
        $category     = trim((string)$request->post('category', $ticket['category']));
        $description  = trim((string)$request->post('description', $ticket['description']));
        $priority     = trim((string)$request->post('priority', $ticket['priority']));
        $status       = trim((string)$request->post('status', $ticket['status']));
        $comments     = trim((string)$request->post('officer_comments', $ticket['officer_comments']));

        // Normalisasi kategori A/B/C
        if (!in_array($category, ['A', 'B', 'C'], true)) {
            $category = 'C';
        }

        $upStmt = $pdo->prepare("
            UPDATE hazard_reports SET
                reporter_name = :rep_name,
                employee_id = :emp_id,
                department = :dept,
                area = :area,
                category = :cat,
                description = :desc,
                priority = :prio,
                status = :stat,
                dfa_status = :dfa,
                officer_comments = :comm,
                updated_at = NOW()
            WHERE id = :id
        ");
        $upStmt->execute([
            'rep_name' => $reporterName,
            'emp_id'   => $employeeId,
            'dept'     => $department,
            'area'     => $area,
            'cat'      => $category,
            'desc'     => $description,
            'prio'     => $priority,
            'stat'     => $status,
            'dfa'      => $status,
            'comm'     => $comments ?: null,
            'id'       => $ticket['id'],
        ]);

        // Audit log
        $auditStmt = $pdo->prepare("
            INSERT INTO audit_logs (id, hazard_id, ticket_id, user_id, user_email, action, details, created_at)
            VALUES (:id, :hazard_id, :ticket_id, :user_id, :user_email, :action, :details, NOW())
        ");
        $auditStmt->execute([
            'id'          => bin2hex(random_bytes(16)),
            'hazard_id'   => $ticket['id'],
            'ticket_id'   => $ticket['ticket_id'],
            'user_id'     => $user['id'],
            'user_email'  => $user['email'],
            'action'      => 'EDIT_HAZARD_REPORT',
            'details'     => json_encode([
                'ticket_id' => $ticket['ticket_id'],
                'reporter'  => $reporterName,
                'area'      => $area,
                'status'    => $status,
            ], JSON_UNESCAPED_SLASHES),
        ]);

        Session::flash('success', "Informasi tiket {$ticket['ticket_id']} berhasil disimpan.");
        Response::redirect(url('/admin/tickets?id=' . urlencode($ticket['id'])));
    }

    /**
     * Tambah Komentar Petugas (Internal / Publik)
     */
    public function addTicketComment(Request $request, string $id): void
    {
        AuthMiddleware::requireWritable($request);
        $user = Session::user();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM hazard_reports WHERE id = :id OR ticket_id = :tid LIMIT 1");
        $stmt->execute(['id' => $id, 'tid' => $id]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            Session::flash('error', 'Tiket tidak ditemukan.');
            Response::redirect(url('/admin/tickets'));
            return;
        }

        $commentText = trim((string)$request->post('comment_text', ''));
        if ($commentText === '') {
            Session::flash('error', 'Teks komentar tidak boleh kosong.');
            Response::redirect(url('/admin/tickets?id=' . urlencode($ticket['id'])));
            return;
        }

        $isInternal = !empty($request->post('is_internal'));
        if ($isInternal && !str_starts_with($commentText, '[INTERNAL]')) {
            $commentText = '[INTERNAL] ' . $commentText;
        }

        $cStmt = $pdo->prepare("
            INSERT INTO hazard_comments (
                id, hazard_id, user_id, user_name, user_role, comment, is_internal_only, created_at
            ) VALUES (
                :id, :hazard_id, :user_id, :user_name, :user_role, :comment, :is_internal, NOW()
            )
        ");
        $cStmt->execute([
            'id'          => bin2hex(random_bytes(16)),
            'hazard_id'   => $ticket['id'],
            'user_id'     => $user['id'],
            'user_name'   => $user['name'],
            'user_role'   => $user['role'],
            'comment'     => $commentText,
            'is_internal' => $isInternal ? 1 : 0,
        ]);

        // Audit log
        $auditStmt = $pdo->prepare("
            INSERT INTO audit_logs (id, hazard_id, ticket_id, user_id, user_email, action, details, created_at)
            VALUES (:id, :hazard_id, :ticket_id, :user_id, :user_email, :action, :details, NOW())
        ");
        $auditStmt->execute([
            'id'          => bin2hex(random_bytes(16)),
            'hazard_id'   => $ticket['id'],
            'ticket_id'   => $ticket['ticket_id'],
            'user_id'     => $user['id'],
            'user_email'  => $user['email'],
            'action'      => 'ADD_TICKET_COMMENT',
            'details'     => json_encode([
                'ticket_id'   => $ticket['ticket_id'],
                'is_internal' => $isInternal,
            ], JSON_UNESCAPED_SLASHES),
        ]);

        Session::flash('success', 'Catatan komentar berhasil diposting.');
        Response::redirect(url('/admin/tickets?id=' . urlencode($ticket['id'])));
    }

    /**
     * Hapus Tiket Bahaya (Khusus Administrator HSE)
     */
    public function deleteTicket(Request $request, string $id): void
    {
        AuthMiddleware::requireHseAdmin($request);
        $user = Session::user();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM hazard_reports WHERE id = :id OR ticket_id = :tid LIMIT 1");
        $stmt->execute(['id' => $id, 'tid' => $id]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            Session::flash('error', 'Tiket tidak ditemukan atau sudah dihapus.');
            Response::redirect(url('/admin/tickets'));
            return;
        }

        $ticketId = $ticket['ticket_id'];

        // Catat ke audit_logs SEBELUM baris dihapus (hazard_id NULL, ticket_id terisi)
        $auditStmt = $pdo->prepare("
            INSERT INTO audit_logs (id, hazard_id, ticket_id, user_id, user_email, action, details, created_at)
            VALUES (:id, NULL, :ticket_id, :user_id, :user_email, :action, :details, NOW())
        ");
        $auditStmt->execute([
            'id'         => bin2hex(random_bytes(16)),
            'ticket_id'  => $ticketId,
            'user_id'    => $user['id'],
            'user_email' => $user['email'],
            'action'     => 'DELETE_HAZARD_REPORT',
            'details'    => json_encode([
                'ticket_id'    => $ticketId,
                'title'        => $ticket['title'],
                'category'     => $ticket['category'],
                'department'   => $ticket['department'],
                'deleted_by'   => $user['email'],
            ], JSON_UNESCAPED_SLASHES),
        ]);

        // Hapus tiket dari hazard_reports
        $delStmt = $pdo->prepare("DELETE FROM hazard_reports WHERE id = :id");
        $delStmt->execute(['id' => $ticket['id']]);

        Session::flash('success', "Tiket {$ticketId} berhasil dihapus permanen dari sistem.");
        Response::redirect(url('/admin/tickets'));
    }

    /**
     * Ekspor PDF Ringkasan Single Ticket
     */
    public function exportTicketPdf(Request $request, string $id): void
    {
        $this->authenticate();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM hazard_reports WHERE id = :id OR ticket_id = :tid LIMIT 1");
        $stmt->execute(['id' => $id, 'tid' => $id]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            Session::flash('error', 'Tiket tidak ditemukan untuk dicetak.');
            Response::redirect(url('/admin/tickets'));
            return;
        }

        $pdfBytes = HSEDocumentGenerator::generateTicketSummary($ticket);

        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="HSE_Ticket_' . preg_replace('/[^A-Za-z0-9_-]/', '_', $ticket['ticket_id']) . '.pdf"');
        header('Content-Length: ' . strlen($pdfBytes));
        echo $pdfBytes;
        exit;
    }

    /**
     * Ekspor PDF Ringkasan Eksekutif
     */
    public function exportExecutivePdf(Request $request): void
    {
        $this->authenticate();
        $pdo = Database::getConnection();

        $stmt = $pdo->query("SELECT * FROM hazard_reports ORDER BY created_at DESC");
        $reports = $stmt->fetchAll() ?: [];

        $total = count($reports);
        $closed = 0;
        $overdue = 0;
        $now = time();
        $durSum = 0;
        $durCount = 0;

        foreach ($reports as $r) {
            $isClosed = in_array($r['status'] ?? '', ['Completed', 'Resolved'], true);
            $cTs = strtotime($r['created_at'] ?? 'now');
            $uTs = strtotime($r['updated_at'] ?? 'now');
            if ($isClosed) {
                $closed++;
                if ($uTs > $cTs) {
                    $durSum += ($uTs - $cTs);
                    $durCount++;
                }
            } else {
                if (($now - $cTs) > (3 * 86400)) {
                    $overdue++;
                }
            }
        }

        $open = $total - $closed;
        $slaRate = $total > 0 ? (int)round((($total - $overdue) / $total) * 100) : 100;
        $avgDays = $durCount > 0 ? number_format($durSum / ($durCount * 86400), 1) : '1.2';

        $summaryData = [
            'total_reports'       => $total,
            'open_reports'        => $open,
            'closed_reports'      => $closed,
            'overdue_reports'     => $overdue,
            'sla_compliance_rate' => $slaRate,
            'avg_resolution_time' => $avgDays . ' Hari',
            'notes'               => 'Laporan ringkasan status K3 resmi diekspor langsung dari Portal HSE PT Minda Automotive Indonesia.'
        ];

        $pdfBytes = HSEDocumentGenerator::generateExecutiveSummary($summaryData);

        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="HSE_Executive_Summary_' . date('Ymd_His') . '.pdf"');
        header('Content-Length: ' . strlen($pdfBytes));
        echo $pdfBytes;
        exit;
    }
}
