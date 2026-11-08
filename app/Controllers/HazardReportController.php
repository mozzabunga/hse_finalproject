<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Models\HazardReport;
use App\Models\AuditLog;
use App\Services\CategoryClassifier;
use App\Services\RiskMatrixEvaluator;

/**
 * Hazard Report Controller (Form Submission, Photo Upload, and Processing)
 */
class HazardReportController extends Controller
{
    public function showForm(Request $request): void
    {
        $this->render('report/form', [
            'pageTitle' => 'Formulir Laporan Bahaya K3',
        ]);
    }

    public function submit(Request $request): void
    {
        $this->validateCsrf($request);

        $reporterName   = trim((string)$request->input('reporter_name', ''));
        $employeeId     = trim((string)$request->input('employee_id', ''));
        $reporterEmail  = trim((string)$request->input('reporter_email', ''));
        $position       = trim((string)$request->input('position', 'Operator'));
        $department     = trim((string)$request->input('department', ''));
        $deptOther      = trim((string)$request->input('department_other', ''));
        $area           = trim((string)$request->input('area', ''));
        $areaOther      = trim((string)$request->input('area_other', ''));
        $detailLocation = trim((string)$request->input('detail_location', ''));
        $incidentDate   = trim((string)$request->input('incident_date', date('Y-m-d')));
        $categoryInput  = trim((string)$request->input('hazard_category', ''));
        $catOther       = trim((string)$request->input('hazard_category_other', ''));
        $potentialImpact= trim((string)$request->input('potential_impact', ''));
        $impactOther    = trim((string)$request->input('potential_impact_other', ''));
        $injuryStatus   = trim((string)$request->input('injury_status', 'Tidak Ada'));
        $injuryOther    = trim((string)$request->input('injury_status_other', ''));
        $temporaryAction= trim((string)$request->input('temporary_action', ''));
        $currentCond    = trim((string)$request->input('current_condition', 'Masih Ada'));
        $condOther      = trim((string)$request->input('current_condition_other', ''));
        $reportedLeader = trim((string)$request->input('reported_to_leader', 'Belum'));
        $suggestion     = trim((string)$request->input('suggestion', ''));

        // Resolve "Others" custom text
        $finalDept      = ($department === 'Others' && $deptOther !== '') ? $deptOther : $department;
        $finalArea      = ($area === 'Others' && $areaOther !== '') ? $areaOther : $area;
        $finalCategory  = ($categoryInput === 'Others' && $catOther !== '') ? $catOther : $categoryInput;
        $finalImpact    = ($potentialImpact === 'Others' && $impactOther !== '') ? $impactOther : $potentialImpact;
        $finalInjury    = ($injuryStatus === 'Others' && $injuryOther !== '') ? $injuryOther : $injuryStatus;
        $finalCondition = ($currentCond === 'Others' && $condOther !== '') ? $condOther : $currentCond;

        // Validation
        $errors = [];
        if ($reporterName === '') $errors[] = 'Nama Pelapor wajib diisi.';
        if ($employeeId === '') $errors[] = 'ID Karyawan / NIK wajib diisi.';
        if ($reporterEmail === '' || !filter_var($reporterEmail, FILTER_VALIDATE_EMAIL)) $errors[] = 'Email Perusahaan valid wajib diisi.';
        if ($finalDept === '') $errors[] = 'Departemen wajib dipilih.';
        if ($finalArea === '') $errors[] = 'Area Pabrik wajib dipilih.';
        if ($finalCategory === '') $errors[] = 'Jenis Temuan / Bahaya K3 wajib dipilih.';
        if ($detailLocation === '') $errors[] = 'Detail Lokasi wajib diisi.';
        if ($temporaryAction === '') $errors[] = 'Tindakan Sementara wajib diisi.';
        if ($suggestion === '') $errors[] = 'Saran Perbaikan wajib diisi.';

        if (!empty($errors)) {
            $this->render('report/form', [
                'errors'    => $errors,
                'old'       => $request->all(),
                'pageTitle' => 'Formulir Laporan Bahaya K3',
            ]);
            return;
        }

        // Handle Photo Evidence Upload (Base64 from canvas compression or standard $_FILES)
        $photoEvidenceUrl = null;
        $photoBase64 = $request->input('photo_base64');
        if (!empty($photoBase64) && str_starts_with($photoBase64, 'data:image/')) {
            $commaPos = strpos($photoBase64, ',');
            if ($commaPos !== false) {
                $meta = substr($photoBase64, 0, $commaPos);
                $encodedData = substr($photoBase64, $commaPos + 1);
                $decoded = base64_decode($encodedData);
                if ($decoded !== false) {
                    $ext = str_contains($meta, 'png') ? 'png' : (str_contains($meta, 'webp') ? 'webp' : 'jpg');
                    $filename = 'evidence_' . bin2hex(random_bytes(8)) . '.' . $ext;
                    $destPath = __DIR__ . '/../../storage/uploads/evidence/' . $filename;
                    if (file_put_contents($destPath, $decoded) !== false) {
                        $photoEvidenceUrl = '/uploads/evidence/' . $filename;
                    }
                }
            }
        } elseif (isset($_FILES['photo_file']) && $_FILES['photo_file']['error'] === UPLOAD_ERR_OK) {
            $tmpName = $_FILES['photo_file']['tmp_name'];
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($tmpName);
            $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            if (in_array($mime, $allowedMimes, true)) {
                $ext = match ($mime) {
                    'image/png'  => 'png',
                    'image/webp' => 'webp',
                    default      => 'jpg',
                };
                $filename = 'evidence_' . bin2hex(random_bytes(8)) . '.' . $ext;
                $destPath = __DIR__ . '/../../storage/uploads/evidence/' . $filename;
                if (move_uploaded_file($tmpName, $destPath)) {
                    $photoEvidenceUrl = '/uploads/evidence/' . $filename;
                }
            }
        }

        // Automatic Title and Formatted Description Mapping
        $reportTitle = "{$finalCategory} - {$finalArea}";
        $reportDesc = "[Jenis Temuan: {$finalCategory}]\n\nDetail Lokasi: {$detailLocation}\nPotensi Dampak: {$finalImpact}\nKondisi Korban: {$finalInjury}\nTindakan Sementara: {$temporaryAction}\nKondisi Saat Dilaporkan: {$finalCondition}\nDisampaikan ke Atasan: {$reportedLeader}\nSaran Perbaikan: {$suggestion}";

        // Classify Category A/B/C & Determine PIC
        $classifiedCategory = CategoryClassifier::classify($reportTitle, $reportDesc);
        $pic = CategoryClassifier::determinePIC($reportTitle, $reportDesc, $classifiedCategory);

        // Generate Ticket ID
        $ticketId = HazardReport::generateTicketId();
        $reportUuid = bin2hex(random_bytes(16));

        // Evaluate IK-01 Risk (Default Severity 2, Likelihood 2 for initial submissions)
        $risk = RiskMatrixEvaluator::evaluate(2, 2);

        $db = \App\Core\Database::getConnection();
        $stmt = $db->prepare("
            INSERT INTO hazard_reports (
                id, ticket_id, title, description, category, hazard_category,
                status, dfa_status, priority, department, area, detail_location,
                incident_date, reporter_name, reporter_email, employee_id, position,
                potential_impact, injury_status, temporary_action, current_condition,
                reported_to_leader, suggestion, photo_evidence_url, assigned_to,
                assigned_pic_id, assigned_pic_name, assigned_pic_email,
                severity, likelihood, risk_score, risk_level, otp_required,
                created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                'NewReport', 'PendingValidation', 'Medium', ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?, ?,
                UTC_TIMESTAMP(), UTC_TIMESTAMP()
            )
        ");

        $stmt->execute([
            $reportUuid,
            $ticketId,
            $reportTitle,
            $reportDesc,
            $classifiedCategory,
            $finalCategory,
            $finalDept,
            $finalArea,
            $detailLocation,
            $incidentDate,
            $reporterName,
            $reporterEmail,
            $employeeId,
            $position,
            $finalImpact,
            $finalInjury,
            $temporaryAction,
            $finalCondition,
            $reportedLeader,
            $suggestion,
            $photoEvidenceUrl,
            null, // assigned_to
            $pic['picId'],
            $pic['picName'],
            $pic['picEmail'],
            $risk['severity'],
            $risk['likelihood'],
            $risk['score'],
            $risk['level'],
            $risk['isOtpRequired'] ? 1 : 0
        ]);

        // Insert Audit Log Entry
        $db->prepare("
            INSERT INTO audit_logs (id, hazard_id, user_id, user_email, action, details, created_at)
            VALUES (?, ?, ?, ?, 'Report Submitted', ?, UTC_TIMESTAMP())
        ")->execute([
            bin2hex(random_bytes(16)),
            $ticketId,
            $employeeId ?: 'EMPLOYEE',
            $reporterEmail,
            "Hazard report filed via web portal by {$reporterName}. Auto-routed to {$pic['picName']} ({$pic['picEmail']})."
        ]);

        // Trigger Cloudflare Worker Webhook asynchronously via curl (non-blocking)
        $this->dispatchWorkerNotification([
            'ticketId'        => $ticketId,
            'triggerAction'   => 'REPORT_CREATED',
            'reporterName'    => $reporterName,
            'reporterEmail'   => $reporterEmail,
            'department'      => $finalDept,
            'area'            => $finalArea,
            'category'        => $classifiedCategory,
            'title'           => $reportTitle,
            'assignedPIC'     => $pic['picName'],
            'assignedEmail'   => $pic['picEmail'],
        ]);

        // Redirect to animated processing / submitted screen
        $this->redirect("/processing?ticket=" . urlencode($ticketId));
    }

    public function processing(Request $request): void
    {
        $ticketId = $request->get('ticket', '');
        $this->render('report/processing', [
            'ticketId'  => $ticketId,
            'pageTitle' => 'Memproses Laporan K3',
        ]);
    }

    public function submitted(Request $request): void
    {
        $ticketId = $request->get('ticket', '');
        $report = HazardReport::findById($ticketId);

        $this->render('report/success', [
            'ticketId'  => $ticketId,
            'report'    => $report,
            'pageTitle' => 'Laporan Berhasil Terkirim',
        ]);
    }

    private function dispatchWorkerNotification(array $payload): void
    {
        $webhookUrl = getenv('NOTIFICATION_WEBHOOK_URL') ?: 'https://minda-hse-connector.mozza-bunga-tarmuji-07.workers.dev/api/v1/hazards/realtime-notify';
        if (empty($webhookUrl)) {
            return;
        }

        $jsonPayload = json_encode($payload);
        $ch = curl_init($webhookUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT_MS, 1500); // Fast non-blocking timeout
        curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
        curl_exec($ch);
        curl_close($ch);
    }
}
