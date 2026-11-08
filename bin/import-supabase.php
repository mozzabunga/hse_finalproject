#!/usr/bin/env php
<?php
/**
 * PT MINDA AUTOMOTIVE INDONESIA - HSE PORTAL
 * Supabase & LocalStorage Backup to MySQL Importer
 * 
 * Penggunaan:
 *   Mode API Remote:
 *     php bin/import-supabase.php --url=https://xyz.supabase.co
 *     (Catatan: SUPABASE_SERVICE_ROLE_KEY atau SUPABASE_KEY dibaca HANYA dari file .env / environment variable)
 * 
 *   Mode Dump File / LocalStorage JSON:
 *     php bin/import-supabase.php --file=path/to/backup.json
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
// PARSING ARGUMEN CLI (KEY HANYA DARI ENV VAR SESUAI PERINTAH)
// ----------------------------------------------------------------------------
$options = getopt('', ['url::', 'file::']);
$supabaseUrl = $options['url'] ?? getenv('VITE_SUPABASE_URL') ?: getenv('SUPABASE_URL');
$localBackupFile = $options['file'] ?? null;

// Keamanan: Baca key HANYA dari environment variable (.env / OS env)
$supabaseKey = getenv('SUPABASE_SERVICE_ROLE_KEY') ?: getenv('SUPABASE_KEY') ?: getenv('VITE_SUPABASE_ANON_KEY') ?: '';

$uploadDir = __DIR__ . '/../storage/uploads/evidence';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// ----------------------------------------------------------------------------
// ENUM DEFINITIONS UNTUK VALIDASI KETAT
// ----------------------------------------------------------------------------
$validCategories = ['A', 'B', 'C'];
$validStatuses = [
    'NewReport',
    'PendingValidation',
    'UnderInvestigation',
    'ActionRequired',
    'WaitingProcurement',
    'Implementation',
    'Completed',
    'Resolved'
];
$validRiskLevels = ['Low', 'Moderate', 'High', 'Extreme'];
$validRecipientCategories = ['ALWAYS', 'A', 'B', 'C'];
$validRecipientModes = ['all', 'keyword'];

// Penyimpanan daftar baris yang ditolak
$rejectedSummary = [];

// ----------------------------------------------------------------------------
// FUNGSI NORMALISASI & KLASIFIKASI KATEGORI
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
// PENGAMBILAN DATA DARI REST API SUPABASE
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
// PENGAMBILAN DATA DARI DUMP FILE / LOCALSTORAGE JSON
// ----------------------------------------------------------------------------
function loadLocalDump(string $filePath): array {
    if (!file_exists($filePath)) {
        throw new \RuntimeException("File dump '{$filePath}' tidak ditemukan.");
    }
    $raw = file_get_contents($filePath);
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new \RuntimeException("File dump bukan format JSON yang valid.");
    }

    // Normalisasi struktur jika berasal dari localStorage dump (key-value string)
    $normalized = [];
    foreach ($data as $key => $val) {
        $actualVal = $val;
        if (is_string($val)) {
            $decoded = json_decode($val, true);
            if (is_array($decoded)) {
                $actualVal = $decoded;
            }
        }

        $keyLower = strtolower($key);
        if (str_contains($keyLower, 'hazard') && !str_contains($keyLower, 'comment')) {
            $normalized['hazard_reports'] = $actualVal;
        } elseif (str_contains($keyLower, 'comment')) {
            $normalized['hazard_comments'] = $actualVal;
        } elseif (str_contains($keyLower, 'audit')) {
            $normalized['audit_logs'] = $actualVal;
        } elseif (str_contains($keyLower, 'recipient')) {
            $normalized['notification_recipients'] = $actualVal;
        } elseif (str_contains($keyLower, 'template')) {
            $normalized['notification_templates'] = $actualVal;
        } elseif (str_contains($keyLower, 'notif')) {
            $normalized['notifications'] = $actualVal;
        } elseif (str_contains($keyLower, 'weekly')) {
            $normalized['weekly_reports'] = $actualVal;
        } else {
            $normalized[$key] = $actualVal;
        }
    }

    return $normalized;
}

// ----------------------------------------------------------------------------
// MULAI EKSEKUSI IMPORTER
// ----------------------------------------------------------------------------
echo "====================================================================\n";
echo "MIGRASI DATA SUPABASE / DUMP KE MYSQL — PT MINDA AUTOMOTIVE INDONESIA\n";
echo "====================================================================\n\n";

$dataset = [];

if ($localBackupFile) {
    echo "[MODE] Menggunakan file dump lokal / localStorage: {$localBackupFile}\n";
    $dataset = loadLocalDump($localBackupFile);
} elseif ($supabaseUrl && $supabaseKey) {
    echo "[MODE] Menggunakan Supabase REST API: {$supabaseUrl}\n";
    echo "  (Kunci otentikasi dimuat secara aman dari environment variable)\n";
} else {
    echo "[ERROR] Tidak ada sumber data valid!\n";
    echo "Gunakan salah satu dari opsi berikut:\n";
    echo "  1. Mode API: Isi SUPABASE_SERVICE_ROLE_KEY di .env, jalankan:\n";
    echo "     php bin/import-supabase.php --url=https://xyz.supabase.co\n";
    echo "  2. Mode File: Jalankan dengan parameter --file:\n";
    echo "     php bin/import-supabase.php --file=storage/dump.json\n";
    exit(1);
}

// ----------------------------------------------------------------------------
// 1. HAZARD REPORTS (TRANSAKSI + VALIDASI ENUM)
// ----------------------------------------------------------------------------
echo "\n[1/7] Memproses tabel 'hazard_reports'...\n";
$reports = $dataset['hazard_reports'] ?? ($supabaseUrl ? fetchSupabaseTable($supabaseUrl, $supabaseKey, 'hazard_reports') : []);
echo "  -> Data ditemukan: " . count($reports) . " baris.\n";

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
$importedReports = 0;
$rejectedSummary['hazard_reports'] = [];

$pdo->beginTransaction();
try {
    foreach ($reports as $idx => $row) {
        $id = $row['id'] ?? bin2hex(random_bytes(16));
        $ticketId = $row['ticket_id'] ?? 'HZ-' . date('Y') . '-' . sprintf('%04d', $importedReports + 1);
        $rawTitle = trim((string)($row['title'] ?? ''));
        $rawDesc = trim((string)($row['description'] ?? $row['hazard_description'] ?? ''));
        $rawCat = $row['hazard_category'] ?? $row['category'] ?? null;

        $category = normalizeCategory($rawCat, $rawTitle, $rawDesc);
        if (!in_array($category, $validCategories, true)) {
            $rejectedSummary['hazard_reports'][] = [
                'id' => $id,
                'reason' => "Kategori '{$category}' tidak valid dalam ENUM(A, B, C)."
            ];
            continue;
        }

        $status = mapStatusFromDB($row['status'] ?? 'NewReport');
        if (!in_array($status, $validStatuses, true)) {
            $rejectedSummary['hazard_reports'][] = [
                'id' => $id,
                'reason' => "Status '{$status}' tidak valid dalam ENUM status hazard."
            ];
            continue;
        }

        $riskLevel = $row['risk_level'] ?? 'Low';
        if (!in_array($riskLevel, $validRiskLevels, true)) {
            $riskLevel = 'Low'; // fallback safe
        }

        $dfaStatus = $row['dfa_status'] ?? 'PendingValidation';
        $priority = !empty($row['priority']) ? $row['priority'] : 'Medium';

        // Auto title jika format kosong atau deskriptif administratif
        $title = $rawTitle;
        if (empty($title) || isConsequenceOrAdminValue($title)) {
            $areaName = !empty($row['area']) ? $row['area'] : 'General Facility';
            $title = "Bahaya K3 Kategori {$category} - {$areaName}";
        }

        $assignedTo = $row['assigned_to'] ?? null;
        $pic = resolveAssignedPIC($assignedTo, $title, $rawDesc, $category);
        $incidentDate = !empty($row['incident_date']) ? date('Y-m-d', strtotime($row['incident_date'])) : date('Y-m-d');

        // Unduh foto bukti jika ada
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
            $riskLevel,
            !empty($row['otp_required']) ? 1 : 0,
            $row['officer_comments'] ?? null,
            $createdAt,
            $updatedAt
        ]);

        $importedReports++;
    }
    $pdo->commit();
    echo "  [+] Transaksi hazard_reports berhasil di-commit: {$importedReports} baris tersimpan.\n";
} catch (\Throwable $e) {
    $pdo->rollBack();
    echo "  [ERROR] Transaksi hazard_reports GAGAL dan di-rollback: " . $e->getMessage() . "\n";
}

if (!empty($rejectedSummary['hazard_reports'])) {
    echo "  [!] Baris ditolak pada hazard_reports (" . count($rejectedSummary['hazard_reports']) . "):\n";
    foreach ($rejectedSummary['hazard_reports'] as $rej) {
        echo "      - ID: {$rej['id']} | {$rej['reason']}\n";
    }
}

// ----------------------------------------------------------------------------
// 2. HAZARD COMMENTS (TRANSAKSI + VALIDASI INTEGRITAS)
// ----------------------------------------------------------------------------
echo "\n[2/7] Memproses tabel 'hazard_comments'...\n";
$comments = $dataset['hazard_comments'] ?? ($supabaseUrl ? fetchSupabaseTable($supabaseUrl, $supabaseKey, 'hazard_comments') : []);
echo "  -> Data ditemukan: " . count($comments) . " baris.\n";

$insertCommentStmt = $pdo->prepare("
    INSERT INTO hazard_comments (id, hazard_id, user_id, user_name, user_role, comment, is_internal_only, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE comment = VALUES(comment), is_internal_only = VALUES(is_internal_only)
");

$importedComments = 0;
$rejectedSummary['hazard_comments'] = [];

$pdo->beginTransaction();
try {
    // Ambil daftar valid hazard_id di database
    $validHazardIds = $pdo->query("SELECT id FROM hazard_reports")->fetchAll(\PDO::FETCH_COLUMN);
    $validHazardSet = array_flip($validHazardIds);

    foreach ($comments as $c) {
        $id = $c['id'] ?? bin2hex(random_bytes(16));
        $hazardId = trim((string)($c['hazard_id'] ?? ''));

        if (empty($hazardId) || !isset($validHazardSet[$hazardId])) {
            $rejectedSummary['hazard_comments'][] = [
                'id' => $id,
                'reason' => "hazard_id '{$hazardId}' tidak ditemukan di tabel hazard_reports."
            ];
            continue;
        }

        $userId = $c['user_id'] ?? 'system';
        $userName = $c['user_name'] ?? 'System';
        $userRole = $c['user_role'] ?? 'System';
        $commentText = trim((string)($c['comment'] ?? $c['message'] ?? ''));

        if ($commentText === '') {
            $rejectedSummary['hazard_comments'][] = [
                'id' => $id,
                'reason' => "Teks komentar kosong."
            ];
            continue;
        }

        $isInternalOnly = !empty($c['is_internal_only']) || !empty($c['internal_only']) ? 1 : 0;
        $createdAt = !empty($c['created_at']) ? gmdate('Y-m-d H:i:s', strtotime($c['created_at'])) : gmdate('Y-m-d H:i:s');

        $insertCommentStmt->execute([
            $id,
            $hazardId,
            $userId,
            $userName,
            $userRole,
            $commentText,
            $isInternalOnly,
            $createdAt
        ]);
        $importedComments++;
    }
    $pdo->commit();
    echo "  [+] Transaksi hazard_comments berhasil di-commit: {$importedComments} baris tersimpan.\n";
} catch (\Throwable $e) {
    $pdo->rollBack();
    echo "  [ERROR] Transaksi hazard_comments GAGAL dan di-rollback: " . $e->getMessage() . "\n";
}

if (!empty($rejectedSummary['hazard_comments'])) {
    echo "  [!] Baris ditolak pada hazard_comments (" . count($rejectedSummary['hazard_comments']) . "):\n";
    foreach ($rejectedSummary['hazard_comments'] as $rej) {
        echo "      - ID: {$rej['id']} | {$rej['reason']}\n";
    }
}

// ----------------------------------------------------------------------------
// 3. AUDIT LOGS (TRANSAKSI)
// ----------------------------------------------------------------------------
echo "\n[3/7] Memproses tabel 'audit_logs' / 'audit_trail'...\n";
$auditLogs = $dataset['audit_logs'] ?? ($supabaseUrl ? fetchSupabaseTable($supabaseUrl, $supabaseKey, 'audit_trail') : []);
if (empty($auditLogs) && $supabaseUrl) {
    $auditLogs = fetchSupabaseTable($supabaseUrl, $supabaseKey, 'audit_logs');
}
echo "  -> Data ditemukan: " . count($auditLogs) . " baris.\n";

$insertAuditStmt = $pdo->prepare("
    INSERT INTO audit_logs (id, hazard_id, user_id, user_email, action, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE action = VALUES(action), details = VALUES(details)
");

$importedAudits = 0;
$rejectedSummary['audit_logs'] = [];

$pdo->beginTransaction();
try {
    foreach ($auditLogs as $log) {
        $id = $log['id'] ?? bin2hex(random_bytes(16));
        $hazardId = !empty($log['hazard_id']) ? trim((string)$log['hazard_id']) : null;
        $userId = $log['user_id'] ?? 'system';
        $userEmail = $log['user_email'] ?? 'system@mindaauto.co.id';
        $action = trim((string)($log['action'] ?? 'Update'));
        $details = is_array($log['details'] ?? null) ? json_encode($log['details']) : (string)($log['details'] ?? '');
        $createdAt = !empty($log['created_at']) ? gmdate('Y-m-d H:i:s', strtotime($log['created_at'])) : gmdate('Y-m-d H:i:s');

        $insertAuditStmt->execute([$id, $hazardId, $userId, $userEmail, $action, $details, $createdAt]);
        $importedAudits++;
    }
    $pdo->commit();
    echo "  [+] Transaksi audit_logs berhasil di-commit: {$importedAudits} baris tersimpan.\n";
} catch (\Throwable $e) {
    $pdo->rollBack();
    echo "  [ERROR] Transaksi audit_logs GAGAL dan di-rollback: " . $e->getMessage() . "\n";
}

// ----------------------------------------------------------------------------
// 4. NOTIFICATIONS (TRANSAKSI + NULLABLE HAZARD_ID)
// ----------------------------------------------------------------------------
echo "\n[4/7] Memproses tabel 'notifications'...\n";
$notifs = $dataset['notifications'] ?? ($supabaseUrl ? fetchSupabaseTable($supabaseUrl, $supabaseKey, 'notifications') : []);
echo "  -> Data ditemukan: " . count($notifs) . " baris.\n";

$insertNotifStmt = $pdo->prepare("
    INSERT INTO notifications (id, type, title, message, hazard_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE title = VALUES(title), message = VALUES(message)
");

$importedNotifs = 0;
$rejectedSummary['notifications'] = [];

$pdo->beginTransaction();
try {
    foreach ($notifs as $n) {
        $id = $n['id'] ?? bin2hex(random_bytes(16));
        $type = $n['type'] ?? 'info';
        $title = trim((string)($n['title'] ?? 'HSE Notification'));
        $message = trim((string)($n['message'] ?? ''));
        $hazardId = !empty($n['hazard_id']) ? trim((string)$n['hazard_id']) : null;
        $isRead = !empty($n['read']) || !empty($n['is_read']) ? 1 : 0;
        $createdAt = !empty($n['created_at']) ? gmdate('Y-m-d H:i:s', strtotime($n['created_at'])) : gmdate('Y-m-d H:i:s');

        $insertNotifStmt->execute([$id, $type, $title, $message, $hazardId, $isRead, $createdAt]);
        $importedNotifs++;
    }
    $pdo->commit();
    echo "  [+] Transaksi notifications berhasil di-commit: {$importedNotifs} baris tersimpan.\n";
} catch (\Throwable $e) {
    $pdo->rollBack();
    echo "  [ERROR] Transaksi notifications GAGAL dan di-rollback: " . $e->getMessage() . "\n";
}

// ----------------------------------------------------------------------------
// 5. NOTIFICATION RECIPIENTS (TRANSAKSI + VALIDASI ENUM)
// ----------------------------------------------------------------------------
echo "\n[5/7] Memproses tabel 'notification_recipients'...\n";
$recipients = $dataset['notification_recipients'] ?? ($supabaseUrl ? fetchSupabaseTable($supabaseUrl, $supabaseKey, 'notification_recipients') : []);
echo "  -> Data ditemukan: " . count($recipients) . " baris.\n";

$insertRecipientStmt = $pdo->prepare("
    INSERT INTO notification_recipients (
        id, category, name, position, email, role, active, is_mandatory, mode, keywords, notification_events, created_at, updated_at
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    ) ON DUPLICATE KEY UPDATE
        category = VALUES(category),
        name = VALUES(name),
        position = VALUES(position),
        role = VALUES(role),
        active = VALUES(active),
        is_mandatory = VALUES(is_mandatory),
        mode = VALUES(mode),
        keywords = VALUES(keywords),
        notification_events = VALUES(notification_events),
        updated_at = VALUES(updated_at)
");

$importedRecipients = 0;
$rejectedSummary['notification_recipients'] = [];

$pdo->beginTransaction();
try {
    foreach ($recipients as $r) {
        $id = $r['id'] ?? bin2hex(random_bytes(16));
        $category = strtoupper(trim((string)($r['category'] ?? 'ALWAYS')));
        if (!in_array($category, $validRecipientCategories, true)) {
            $rejectedSummary['notification_recipients'][] = [
                'id' => $id,
                'reason' => "Kategori recipient '{$category}' tidak valid dalam ENUM(ALWAYS, A, B, C)."
            ];
            continue;
        }

        $email = trim((string)($r['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $rejectedSummary['notification_recipients'][] = [
                'id' => $id,
                'reason' => "Format email '{$email}' tidak valid."
            ];
            continue;
        }

        $mode = strtolower(trim((string)($r['mode'] ?? 'all')));
        if (!in_array($mode, $validRecipientModes, true)) {
            $mode = 'all';
        }

        $keywords = is_array($r['keywords'] ?? null) ? json_encode($r['keywords']) : (string)($r['keywords'] ?? '[]');
        $events = is_array($r['notification_events'] ?? null) ? json_encode($r['notification_events']) : (string)($r['notification_events'] ?? '[]');
        $createdAt = !empty($r['created_at']) ? gmdate('Y-m-d H:i:s', strtotime($r['created_at'])) : gmdate('Y-m-d H:i:s');
        $updatedAt = !empty($r['updated_at']) ? gmdate('Y-m-d H:i:s', strtotime($r['updated_at'])) : $createdAt;

        $insertRecipientStmt->execute([
            $id,
            $category,
            $r['name'] ?? 'Recipient',
            $r['position'] ?? 'Staff',
            $email,
            $r['role'] ?? 'HSE Team',
            !empty($r['active']) ? 1 : 0,
            !empty($r['is_mandatory']) ? 1 : 0,
            $mode,
            $keywords,
            $events,
            $createdAt,
            $updatedAt
        ]);
        $importedRecipients++;
    }
    $pdo->commit();
    echo "  [+] Transaksi notification_recipients berhasil di-commit: {$importedRecipients} baris tersimpan.\n";
} catch (\Throwable $e) {
    $pdo->rollBack();
    echo "  [ERROR] Transaksi notification_recipients GAGAL dan di-rollback: " . $e->getMessage() . "\n";
}

if (!empty($rejectedSummary['notification_recipients'])) {
    echo "  [!] Baris ditolak pada notification_recipients (" . count($rejectedSummary['notification_recipients']) . "):\n";
    foreach ($rejectedSummary['notification_recipients'] as $rej) {
        echo "      - ID: {$rej['id']} | {$rej['reason']}\n";
    }
}

// ----------------------------------------------------------------------------
// 6. NOTIFICATION TEMPLATES (TRANSAKSI + 23 PLACEHOLDERS)
// ----------------------------------------------------------------------------
echo "\n[6/7] Memproses tabel 'notification_templates'...\n";
$templates = $dataset['notification_templates'] ?? ($supabaseUrl ? fetchSupabaseTable($supabaseUrl, $supabaseKey, 'notification_templates') : []);
echo "  -> Data ditemukan: " . count($templates) . " baris.\n";

$insertTemplateStmt = $pdo->prepare("
    INSERT INTO notification_templates (id, name, subject, body, placeholders, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        subject = VALUES(subject),
        body = VALUES(body),
        placeholders = VALUES(placeholders),
        updated_at = VALUES(updated_at)
");

$importedTemplates = 0;
$rejectedSummary['notification_templates'] = [];

$pdo->beginTransaction();
try {
    foreach ($templates as $t) {
        $id = trim((string)($t['id'] ?? ''));
        if (empty($id)) {
            $rejectedSummary['notification_templates'][] = [
                'id' => '(empty)',
                'reason' => "Template ID kosong."
            ];
            continue;
        }

        $placeholders = is_array($t['placeholders'] ?? null) ? json_encode($t['placeholders']) : (string)($t['placeholders'] ?? '[]');
        $updatedAt = !empty($t['updated_at']) ? gmdate('Y-m-d H:i:s', strtotime($t['updated_at'])) : gmdate('Y-m-d H:i:s');

        $insertTemplateStmt->execute([
            $id,
            $t['name'] ?? $id,
            $t['subject'] ?? 'HSE Notification',
            $t['body'] ?? '',
            $placeholders,
            $updatedAt
        ]);
        $importedTemplates++;
    }
    $pdo->commit();
    echo "  [+] Transaksi notification_templates berhasil di-commit: {$importedTemplates} baris tersimpan.\n";
} catch (\Throwable $e) {
    $pdo->rollBack();
    echo "  [ERROR] Transaksi notification_templates GAGAL dan di-rollback: " . $e->getMessage() . "\n";
}

// ----------------------------------------------------------------------------
// 7. WEEKLY REPORTS (TRANSAKSI)
// ----------------------------------------------------------------------------
echo "\n[7/7] Memproses tabel 'weekly_reports'...\n";
$weekly = $dataset['weekly_reports'] ?? ($supabaseUrl ? fetchSupabaseTable($supabaseUrl, $supabaseKey, 'weekly_reports') : []);
echo "  -> Data ditemukan: " . count($weekly) . " baris.\n";

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

$importedWeekly = 0;
$pdo->beginTransaction();
try {
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
        $importedWeekly++;
    }
    $pdo->commit();
    echo "  [+] Transaksi weekly_reports berhasil di-commit: {$importedWeekly} baris tersimpan.\n";
} catch (\Throwable $e) {
    $pdo->rollBack();
    echo "  [ERROR] Transaksi weekly_reports GAGAL dan di-rollback: " . $e->getMessage() . "\n";
}

echo "\n====================================================================\n";
echo "MIGRASI DATA SELESAI\n";
echo "Total Disimpan:\n";
echo "  - Hazard Reports:          {$importedReports}\n";
echo "  - Hazard Comments:         {$importedComments}\n";
echo "  - Audit Logs:              {$importedAudits}\n";
echo "  - Notifications:           {$importedNotifs}\n";
echo "  - Notification Recipients: {$importedRecipients}\n";
echo "  - Notification Templates:  {$importedTemplates}\n";
echo "  - Weekly Reports:          {$importedWeekly}\n";

$totalRejected = array_sum(array_map('count', $rejectedSummary));
if ($totalRejected > 0) {
    echo "\nTotal Baris Ditolak: {$totalRejected}\n";
    foreach ($rejectedSummary as $tbl => $rows) {
        if (!empty($rows)) {
            echo "  - {$tbl}: " . count($rows) . " baris ditolak\n";
        }
    }
} else {
    echo "\nSemua baris memenuhi validasi skema dan relasi integritas (0 ditolak).\n";
}
echo "====================================================================\n";
