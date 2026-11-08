#!/usr/bin/env php
<?php
/**
 * PT MINDA AUTOMOTIVE INDONESIA - HSE PORTAL
 * Supabase to MySQL Production Migration & Data Importer
 * Run: php bin/import-supabase.php --url=https://xyz.supabase.co --key=service_role_key
 */

declare(strict_types=1);

date_default_timezone_set('UTC');

require_once __DIR__ . '/../app/Core/Env.php';
require_once __DIR__ . '/../app/Core/Database.php';

use App\Core\Env;
use App\Core\Database;

Env::load(__DIR__ . '/../.env');

$pdo = Database::getConnection();
$pdo->exec("SET time_zone = '+00:00'");

// ----------------------------------------------------------------------------
// PARSING ARGUMEN CLI / ENV
// ----------------------------------------------------------------------------
$options = getopt('', ['url::', 'key::', 'file::']);
$supabaseUrl = $options['url'] ?? getenv('VITE_SUPABASE_URL') ?: getenv('SUPABASE_URL');
$supabaseKey = $options['key'] ?? getenv('SUPABASE_SERVICE_ROLE_KEY') ?: getenv('VITE_SUPABASE_ANON_KEY');
$localBackupFile = $options['file'] ?? null;

$uploadDir = __DIR__ . '/../storage/uploads/evidence';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// ----------------------------------------------------------------------------
// LOGIKA BISNIS: PORTING NORMALISASI, KLASIFIKASI & ROUTING DARI SUPABASE.TS
// ----------------------------------------------------------------------------

function isConsequenceOrAdminValue(string $val): bool {
    $clean = strtolower(trim($val));
    if ($clean === '' || $clean === '-' || $clean === '.' || $clean === 'n/a' || $clean === 'none') {
        return true;
    }
    $consequences = [
        'cedera ringan', 'cedera sedang', 'cedera berat', 'luka ringan', 'luka berat',
        'first aid', 'pertolongan pertama', 'fatality', 'korban jiwa', 'tidak ada korban',
        'ada korban', 'masih ada', 'sudah ditangani', 'selesai', 'open', 'closed'
    ];
    foreach ($consequences as $c) {
        if ($clean === $c || str_starts_with($clean, $c . ':') || str_starts_with($clean, $c . ' -')) {
            return true;
        }
    }
    return false;
}

function classifyHazardCategory(string $title = '', string $description = ''): string {
    $text = strtolower($title . ' ' . $description);

    // Kategori B: Lingkungan, Bising, Kimia, Limbah, 5S, Ergonomi
    $bKeywords = [
        'kebisingan', 'bising', 'noise', 'desibel', 'decibel', 'suara bising',
        'leak', 'bocor', 'spill', 'tumpahan', 'tumpah', 'chemical', 'kimia',
        'b3', 'oil', 'oli', 'gas', 'toxic', 'racun', 'waste', 'limbah',
        'sampah', 'garbage', 'trash', 'emissions', 'emisi', 'smoke', 'asap',
        'bau', 'odor', 'pollut', 'polusi', 'sirkulasi udara', 'ventilasi',
        'debu', 'dust', 'ergonomi', 'ergonomic', 'postur', 'posture', 'pegal',
        'housekeeping', '5s', 'kebersihan', 'kerapihan', 'cleaning', 'catering',
        'katering', 'kantin', 'sanitasi', 'toilet'
    ];
    foreach ($bKeywords as $kw) {
        if (str_contains($text, $kw)) return 'B';
    }

    // Kategori A: APD, Safety Fisik, Listrik, Api, Forklift, Mesin, Unsafe Act
    $aKeywords = [
        'helmet', 'helm', 'boot', 'shoes', 'sepatu', 'glasses', 'goggles',
        'kacamata', 'glove', 'sarung tangan', 'vest', 'rompi', 'mask', 'masker',
        'safety belt', 'harness', 'ear plug', 'earplug', 'earmuff', 'apd', 'ppe',
        'protect', 'shield', 'pelindung', 'fall', 'jatuh', 'slip', 'terpeleset',
        'licin', 'trip', 'tersandung', 'listrik', 'electric', 'kabel', 'setrum',
        'api', 'fire', 'kebakaran', 'percikan', 'forklift', 'tertabrak', 'terlindas',
        'terjepit', 'pinch', 'crush', 'lontaran', 'serpihan', 'tajam', 'cut',
        'mesin berputar', 'machine guard', 'unsafe act', 'near miss'
    ];
    foreach ($aKeywords as $kw) {
        if (str_contains($text, $kw)) return 'A';
    }

    // Kategori C: Infrastruktur Umum, Bangunan, Fasilitas, Mekanikal Gedung
    return 'C';
}

function normalizeCategory(?string $rawCat, string $title = '', string $description = ''): string {
    if ($rawCat !== null && trim($rawCat) !== '') {
        $c = strtolower(trim($rawCat));
        if (!isConsequenceOrAdminValue($c)) {
            if ($c === 'a' || $c === 'cat a' || $c === 'kat a' || $c === 'kategori a' || $c === 'class a') return 'A';
            if ($c === 'b' || $c === 'cat b' || $c === 'kat b' || $c === 'kategori b' || $c === 'class b') return 'B';
            if ($c === 'c' || $c === 'cat c' || $c === 'kat c' || $c === 'kategori c' || $c === 'class c') return 'C';

            if (str_contains($c, 'lingkungan') || str_contains($c, 'kebisingan') || str_contains($c, '5s') || str_contains($c, 'waste')) return 'B';
            if (str_contains($c, 'safety') || str_contains($c, 'apd') || str_contains($c, 'fire') || str_contains($c, 'listrik')) return 'A';
            if (str_contains($c, 'maintenance') || str_contains($c, 'fasilitas') || str_contains($c, 'gedung')) return 'C';
        }
    }

    return classifyHazardCategory($title, $description);
}

function mapStatusFromDB(?string $dbStatus): string {
    if (!$dbStatus) return 'NewReport';
    $cleaned = trim($dbStatus);
    switch ($cleaned) {
        case 'New':
        case 'NewReport':
        case 'New Report':
            return 'NewReport';
        case 'PendingValidation':
        case 'Pending Validation':
            return 'PendingValidation';
        case 'InProgress':
        case 'UnderInvestigation':
        case 'Under Investigation':
            return 'UnderInvestigation';
        case 'ActionRequired':
        case 'Action Required':
            return 'ActionRequired';
        case 'WaitingProcurement':
        case 'Waiting Procurement':
            return 'WaitingProcurement';
        case 'Implementation':
            return 'Implementation';
        case 'Completed':
            return 'Completed';
        case 'Resolved':
            return 'Resolved';
        default:
            return 'NewReport';
    }
}

function determinePICFromKeywords(string $title, string $description, string $category): array {
    $text = strtolower($title . ' ' . $description);

    if (str_contains($text, 'forklift')) {
        return [
            'picId'    => 'usr_hse_team',
            'picName'  => 'HSE Team',
            'picEmail' => 'hse_supervisor@mindaauto.co.id'
        ];
    }

    $hrgaKeywords = [
        'apd', 'ppe', 'safety shoes', 'helmet', 'helm', 'mask', 'masker',
        'gloves', 'sarung tangan', 'uniform', 'seragam', 'medicine', 'obat',
        'first aid', 'p3k', 'clinic', 'klinik', 'catering', 'katering',
        'employee welfare', 'welfare', 'medical'
    ];
    foreach ($hrgaKeywords as $kw) {
        if (str_contains($text, $kw)) {
            return [
                'picId'    => 'usr_hrga_admin',
                'picName'  => 'HRGA Admin',
                'picEmail' => 'hrga_admin@mindaauto.co.id'
            ];
        }
    }

    $asepKeywords = [
        'waste', 'trash', 'garbage', 'environment', 'environmental issue',
        'limbah', 'sampah', 'chemical spill', 'oil spill', 'spill', 'tumpahan',
        'drain', 'water leak', 'air bocor', 'bocor', 'pollution', 'transportation',
        'vehicle', 'truck', 'loading', 'unloading', 'ob', 'housekeeping', 'cleaning',
        'cleanliness', 'kebersihan', 'apar', 'fire extinguisher', 'ergonomi',
        'ergonomic', 'chair', 'desk', 'table', 'posture', 'driver', 'sopir', 'parking', 'parkir'
    ];
    foreach ($asepKeywords as $kw) {
        if (str_contains($text, $kw)) {
            return [
                'picId'    => 'usr_asep_permana',
                'picName'  => 'Asep Permana',
                'picEmail' => 'asep.permana@mindaauto.co.id'
            ];
        }
    }

    return [
        'picId'    => 'usr_hse_team',
        'picName'  => 'HSE Team',
        'picEmail' => 'hse_supervisor@mindaauto.co.id'
    ];
}

function resolveAssignedPIC(?string $assignedTo, string $title, string $description, string $category): array {
    if (!empty($assignedTo)) {
        $uuid = trim($assignedTo);
        if ($uuid === '33333333-3333-3333-3333-333333333333') {
            return [
                'picId'    => 'usr_hrga_admin',
                'picName'  => 'HRGA Admin',
                'picEmail' => 'hrga_admin@mindaauto.co.id'
            ];
        }
        if ($uuid === '44444444-4444-4444-4444-444444444444') {
            return [
                'picId'    => 'usr_asep_permana',
                'picName'  => 'Asep Permana',
                'picEmail' => 'asep.permana@mindaauto.co.id'
            ];
        }
        if ($uuid === '11111111-1111-1111-1111-111111111111' ||
            $uuid === '22222222-2222-2222-2222-222222222222' ||
            $uuid === '77777777-7777-7777-7777-777777777777' ||
            $uuid === 'usr_hse_team') {
            return [
                'picId'    => 'usr_hse_team',
                'picName'  => 'HSE Team',
                'picEmail' => 'hse_supervisor@mindaauto.co.id'
            ];
        }
    }

    return determinePICFromKeywords($title, $description, $category);
}

function downloadEvidencePhoto(string $url, string $destDir): ?string {
    if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
        return null;
    }

    $pathInfo = pathinfo(parse_url($url, PHP_URL_PATH) ?: '');
    $ext = !empty($pathInfo['extension']) ? strtolower($pathInfo['extension']) : 'jpg';
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
        $ext = 'jpg';
    }

    $filename = 'evidence_' . bin2hex(random_bytes(8)) . '.' . $ext;
    $targetPath = rtrim($destDir, '/') . '/' . $filename;

    $ch = curl_init($url);
    $fp = fopen($targetPath, 'wb');
    curl_setopt($ch, CURLOPT_FILE, $fp);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $success = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    fclose($fp);

    if ($success && $httpCode === 200 && filesize($targetPath) > 0) {
        return '/uploads/evidence/' . $filename;
    }

    if (file_exists($targetPath)) {
        @unlink($targetPath);
    }
    return null;
}

// ----------------------------------------------------------------------------
// EKSEKUSI PENGAMBILAN DATA DARI SUPABASE REST API
// ----------------------------------------------------------------------------

function fetchSupabaseTable(string $url, string $key, string $tableName): array {
    $endpoint = rtrim($url, '/') . '/rest/v1/' . $tableName . '?select=*';
    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $key,
        'Authorization: Bearer ' . $key,
        'Content-Type: application/json',
        'Prefer: count=exact'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 45);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300 && $response) {
        return json_decode($response, true) ?: [];
    }
    return [];
}

// ----------------------------------------------------------------------------
// PROSES MIGRASI UTAMA
// ----------------------------------------------------------------------------

echo "====================================================================\n";
echo "MIGRASI DATA SUPABASE KE MYSQL — PT MINDA AUTOMOTIVE INDONESIA\n";
echo "====================================================================\n\n";

if (!$supabaseUrl || !$supabaseKey) {
    echo "[INFO] Supabase URL atau Key tidak disediakan. Memeriksa file dump lokal atau mode seed.\n";
    echo "Penggunaan: php bin/import-supabase.php --url=https://xyz.supabase.co --key=service_role_key\n";
    exit(0);
}

echo "[1/4] Mengambil data dari tabel 'hazard_reports' di Supabase...\n";
$reports = fetchSupabaseTable($supabaseUrl, $supabaseKey, 'hazard_reports');
echo "  -> Ditemukan " . count($reports) . " baris hazard report.\n";

$insertReportStmt = $pdo->prepare("
    INSERT INTO hazard_reports (
        id, ticket_id, title, description, category, hazard_category,
        status, dfa_status, priority, department, area, detail_location,
        incident_date, reporter_name, reporter_email, employee_id, position,
        potential_impact, injury_status, temporary_action, current_condition,
        reported_to_leader, suggestion, photo_evidence_url, assigned_to,
        assigned_pic_id, assigned_pic_name, assigned_pic_email,
        severity, likelihood, risk_score, risk_level, otp_required,
        officer_comments, created_at, updated_at
    ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
    ) ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        category = VALUES(category),
        hazard_category = VALUES(hazard_category),
        status = VALUES(status),
        dfa_status = VALUES(dfa_status),
        priority = VALUES(priority),
        department = VALUES(department),
        area = VALUES(area),
        detail_location = VALUES(detail_location),
        incident_date = VALUES(incident_date),
        assigned_pic_id = VALUES(assigned_pic_id),
        assigned_pic_name = VALUES(assigned_pic_name),
        assigned_pic_email = VALUES(assigned_pic_email),
        photo_evidence_url = VALUES(photo_evidence_url),
        updated_at = VALUES(updated_at)
");

$failedPhotos = [];
$importedCount = 0;

foreach ($reports as $row) {
    $id = $row['id'] ?? bin2hex(random_bytes(16));
    $ticketId = $row['ticket_id'] ?? 'HZ-' . date('Y') . '-' . sprintf('%04d', $importedCount + 1);
    $rawTitle = $row['title'] ?? '';
    $rawDesc = $row['description'] ?? $row['hazard_description'] ?? '';
    $rawCat = $row['hazard_category'] ?? $row['category'] ?? null;

    $category = normalizeCategory($rawCat, $rawTitle, $rawDesc);
    $status = mapStatusFromDB($row['status'] ?? 'NewReport');
    $dfaStatus = $row['dfa_status'] ?? 'PendingValidation';
    $priority = !empty($row['priority']) ? $row['priority'] : 'Medium';

    // Auto title jika title awal kosong atau format administratif
    $title = $rawTitle;
    if (empty($title) || isConsequenceOrAdminValue($title)) {
        $areaName = !empty($row['area']) ? $row['area'] : 'General Facility';
        $title = "Bahaya K3 Kategori {$category} - {$areaName}";
    }

    $assignedTo = $row['assigned_to'] ?? null;
    $pic = resolveAssignedPIC($assignedTo, $title, $rawDesc, $category);

    // Tanggal kejadian (DATE)
    $incidentDate = !empty($row['incident_date']) ? date('Y-m-d', strtotime($row['incident_date'])) : date('Y-m-d');

    // Penanganan unduh foto bukti
    $localPhotoUrl = null;
    if (!empty($row['photo_evidence_url'])) {
        $downloaded = downloadEvidencePhoto($row['photo_evidence_url'], $uploadDir);
        if ($downloaded) {
            $localPhotoUrl = $downloaded;
        } else {
            $failedPhotos[] = [
                'ticketId' => $ticketId,
                'url'      => $row['photo_evidence_url']
            ];
            // Pertahankan url lama jika gagal diunduh
            $localPhotoUrl = $row['photo_evidence_url'];
        }
    }

    $createdAt = !empty($row['created_at']) ? gmdate('Y-m-d H:i:s', strtotime($row['created_at'])) : gmdate('Y-m-d H:i:s');
    $updatedAt = !empty($row['updated_at']) ? gmdate('Y-m-d H:i:s', strtotime($row['updated_at'])) : $createdAt;

    $insertReportStmt->execute([
        $id,
        $ticketId,
        $title,
        $rawDesc,
        $category,
        $row['hazard_category'] ?? null,
        $status,
        $dfaStatus,
        $priority,
        $row['department'] ?? 'Production',
        $row['area'] ?? 'Factory Floor',
        $row['detail_location'] ?? null,
        $incidentDate,
        $row['reporter_name'] ?? 'Anonymous Worker',
        $row['reporter_email'] ?? 'employee@mindaauto.co.id',
        $row['employee_id'] ?? 'EMP-0000',
        $row['position'] ?? null,
        $row['potential_impact'] ?? null,
        $row['injury_status'] ?? null,
        $row['temporary_action'] ?? null,
        $row['current_condition'] ?? null,
        $row['reported_to_leader'] ?? null,
        $row['suggestion'] ?? null,
        $localPhotoUrl,
        $assignedTo,
        $pic['picId'],
        $pic['picName'],
        $pic['picEmail'],
        (int)($row['severity'] ?? 2),
        (int)($row['likelihood'] ?? 2),
        (int)($row['risk_score'] ?? 4),
        $row['risk_level'] ?? 'Low',
        !empty($row['otp_required']) ? 1 : 0,
        $row['officer_comments'] ?? null,
        $createdAt,
        $updatedAt
    ]);

    $importedCount++;
}

echo "  [+] Berhasil mengimpor {$importedCount} tiket hazard ke MySQL.\n";

if (!empty($failedPhotos)) {
    echo "\n  [PERINGATAN] Terdapat " . count($failedPhotos) . " foto yang gagal diunduh dari remote Supabase Storage:\n";
    foreach ($failedPhotos as $fp) {
        echo "    - Tiket {$fp['ticketId']}: {$fp['url']}\n";
    }
}

// ----------------------------------------------------------------------------
// [2/4] AUDIT LOGS / AUDIT TRAIL
// ----------------------------------------------------------------------------
echo "\n[2/4] Mengambil tabel 'audit_trail' / 'audit_logs'...\n";
$auditLogs = fetchSupabaseTable($supabaseUrl, $supabaseKey, 'audit_trail');
if (empty($auditLogs)) {
    $auditLogs = fetchSupabaseTable($supabaseUrl, $supabaseKey, 'audit_logs');
}

$insertAuditStmt = $pdo->prepare("
    INSERT INTO audit_logs (id, hazard_id, user_id, user_email, action, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE action = VALUES(action), details = VALUES(details)
");

$auditCount = 0;
foreach ($auditLogs as $log) {
    $insertAuditStmt->execute([
        $log['id'] ?? bin2hex(random_bytes(16)),
        $log['hazard_id'] ?? '',
        $log['user_id'] ?? 'system',
        $log['user_email'] ?? 'system@mindaauto.co.id',
        $log['action'] ?? 'Update',
        $log['details'] ?? '',
        !empty($log['created_at']) ? gmdate('Y-m-d H:i:s', strtotime($log['created_at'])) : gmdate('Y-m-d H:i:s')
    ]);
    $auditCount++;
}
echo "  [+] Berhasil mengimpor {$auditCount} baris audit log.\n";

// ----------------------------------------------------------------------------
// [3/4] NOTIFIKASI
// ----------------------------------------------------------------------------
echo "\n[3/4] Mengambil tabel 'notifications'...\n";
$notifs = fetchSupabaseTable($supabaseUrl, $supabaseKey, 'notifications');
$insertNotifStmt = $pdo->prepare("
    INSERT INTO notifications (id, type, title, message, hazard_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE title = VALUES(title), message = VALUES(message)
");

$notifCount = 0;
foreach ($notifs as $n) {
    $insertNotifStmt->execute([
        $n['id'] ?? bin2hex(random_bytes(16)),
        $n['type'] ?? 'info',
        $n['title'] ?? 'HSE Notification',
        $n['message'] ?? '',
        $n['hazard_id'] ?? '',
        !empty($n['read']) || !empty($n['is_read']) ? 1 : 0,
        !empty($n['created_at']) ? gmdate('Y-m-d H:i:s', strtotime($n['created_at'])) : gmdate('Y-m-d H:i:s')
    ]);
    $notifCount++;
}
echo "  [+] Berhasil mengimpor {$notifCount} baris notifikasi.\n";

// ----------------------------------------------------------------------------
// [4/4] WEEKLY REPORTS
// ----------------------------------------------------------------------------
echo "\n[4/4] Mengambil tabel 'weekly_reports'...\n";
$weekly = fetchSupabaseTable($supabaseUrl, $supabaseKey, 'weekly_reports');
$insertWeeklyStmt = $pdo->prepare("
    INSERT INTO weekly_reports (
        id, week_starting, week_ending, total_reports, open_reports,
        in_progress_reports, completed_reports, overdue_reports, avg_resolution_time,
        category_stats, department_stats, area_stats, monthly_trend, top_categories,
        outstanding_hazards, overdue_hazards, executive_summary, file_location_pdf, created_at
    ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
    ) ON DUPLICATE KEY UPDATE total_reports = VALUES(total_reports)
");

$weeklyCount = 0;
foreach ($weekly as $w) {
    $insertWeeklyStmt->execute([
        $w['id'] ?? bin2hex(random_bytes(16)),
        $w['week_starting'] ?? date('Y-m-d', strtotime('-7 days')),
        $w['week_ending'] ?? date('Y-m-d'),
        (int)($w['total_reports'] ?? 0),
        (int)($w['open_reports'] ?? 0),
        (int)($w['in_progress_reports'] ?? 0),
        (int)($w['completed_reports'] ?? 0),
        (int)($w['overdue_reports'] ?? 0),
        (float)($w['avg_resolution_time'] ?? 0.0),
        is_array($w['category_stats'] ?? null) ? json_encode($w['category_stats']) : ($w['category_stats'] ?? '{}'),
        is_array($w['department_stats'] ?? null) ? json_encode($w['department_stats']) : ($w['department_stats'] ?? '{}'),
        is_array($w['area_stats'] ?? null) ? json_encode($w['area_stats']) : ($w['area_stats'] ?? '{}'),
        is_array($w['monthly_trend'] ?? null) ? json_encode($w['monthly_trend']) : ($w['monthly_trend'] ?? '{}'),
        is_array($w['top_categories'] ?? null) ? json_encode($w['top_categories']) : ($w['top_categories'] ?? '[]'),
        is_array($w['outstanding_hazards'] ?? null) ? json_encode($w['outstanding_hazards']) : ($w['outstanding_hazards'] ?? '[]'),
        is_array($w['overdue_hazards'] ?? null) ? json_encode($w['overdue_hazards']) : ($w['overdue_hazards'] ?? '[]'),
        $w['executive_summary'] ?? null,
        $w['file_location_pdf'] ?? null,
        !empty($w['created_at']) ? gmdate('Y-m-d H:i:s', strtotime($w['created_at'])) : gmdate('Y-m-d H:i:s')
    ]);
    $weeklyCount++;
}
echo "  [+] Berhasil mengimpor {$weeklyCount} arsip laporan mingguan.\n";

echo "\n====================================================================\n";
echo "MIGRASI DATA SUPABASE SELESAI DENGAN SUKSES.\n";
echo "====================================================================\n";
