#!/usr/bin/env php
<?php
/**
 * PT MINDA AUTOMOTIVE INDONESIA - HSE PORTAL
 * Database Seeder CLI Script
 * Run: php bin/seed.php
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

echo "====================================================================\n";
echo "PT MINDA AUTOMOTIVE INDONESIA — HSE PORTAL DATABASE SEEDER\n";
echo "Timezone: UTC | Environment: Production Hardened\n";
echo "====================================================================\n\n";

// ----------------------------------------------------------------------------
// 1. SEED AKUN PETUGAS (7 Akun Resmi)
// ----------------------------------------------------------------------------
$accounts = [
    [
        'id'            => 'usr_purwanto',
        'email'         => 'purwanto@mindaauto.co.id',
        'name'          => 'Purwanto',
        'role'          => 'hse_admin',
        'department_id' => 'HSE',
        'position'      => 'Safety Officer Lead',
    ],
    [
        'id'            => 'usr_anita',
        'email'         => 'anita@mindaauto.co.id',
        'name'          => 'Anita',
        'role'          => 'hse_officer',
        'department_id' => 'HSE',
        'position'      => 'Safety Officer Inspector',
    ],
    [
        'id'            => 'usr_asep_permana',
        'email'         => 'asep.permana@mindaauto.co.id',
        'name'          => 'Asep Permana',
        'role'          => 'env_officer',
        'department_id' => 'HSE',
        'position'      => 'Env & Trans Supervisor',
    ],
    [
        'id'            => 'usr_hrga_admin',
        'email'         => 'hrga_admin@mindaauto.co.id',
        'name'          => 'HRGA Admin',
        'role'          => 'hrga_admin',
        'department_id' => 'HRGA',
        'position'      => 'HRGA Admin',
    ],
    [
        'id'            => 'usr_hse_supervisor',
        'email'         => 'hse_supervisor@mindaauto.co.id',
        'name'          => 'HSE Supervisor',
        'role'          => 'management_supervisor',
        'department_id' => 'HSE',
        'position'      => 'Supervisor HSE',
    ],
    [
        'id'            => 'usr_president_director',
        'email'         => 'president_director@mindaauto.co.id',
        'name'          => 'President Director',
        'role'          => 'management_director',
        'department_id' => 'MANAGEMENT',
        'position'      => 'President Director / Executive',
    ],
    [
        'id'            => 'usr_mozza_bunga',
        'email'         => 'mozza.bunga.tarmuji.07@gmail.com',
        'name'          => 'Mozza Bunga (HSE Admin)',
        'role'          => 'hse_admin',
        'department_id' => 'HSE',
        'position'      => 'HSE Administrator',
    ],
];

echo "[1/3] Memeriksa dan Menyemai Akun Petugas...\n";
$newlyCreatedAccounts = [];

$checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
$insertStmt = $pdo->prepare("
    INSERT INTO users (id, email, password_hash, name, role, department_id, position, must_change_password, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
");

foreach ($accounts as $acc) {
    $checkStmt->execute([$acc['email']]);
    $existing = $checkStmt->fetch();

    if ($existing) {
        echo "  [-] Akun telah ada: {$acc['email']} ({$acc['role']}) -> Dilewati, password tidak diubah.\n";
        continue;
    }

    // Buat password acak yang aman (12 karakter alfanumerik)
    $plainPassword = bin2hex(random_bytes(6));
    $passwordHash = password_hash($plainPassword, PASSWORD_BCRYPT, ['cost' => 12]);

    $insertStmt->execute([
        $acc['id'],
        $acc['email'],
        $passwordHash,
        $acc['name'],
        $acc['role'],
        $acc['department_id'],
        $acc['position'],
    ]);

    $newlyCreatedAccounts[] = [
        'name'     => $acc['name'],
        'email'    => $acc['email'],
        'role'     => $acc['role'],
        'password' => $plainPassword,
    ];

    echo "  [+] Akun BARU berhasil didaftarkan: {$acc['email']}\n";
}

if (!empty($newlyCreatedAccounts)) {
    echo "\n--------------------------------------------------------------------\n";
    echo "PERINGATAN KEAMANAN: KREDENSIAL AKUN BARU (DITAMPILKAN SEKALI INI SAJA)\n";
    echo "Harap salin kredensial berikut. User wajib mengganti password saat login pertama.\n";
    echo "--------------------------------------------------------------------\n";
    foreach ($newlyCreatedAccounts as $newAcc) {
        printf("Email   : %-38s | Peran   : %s\n", $newAcc['email'], $newAcc['role']);
        printf("Password: %-38s | Nama    : %s\n\n", $newAcc['password'], $newAcc['name']);
    }
    echo "--------------------------------------------------------------------\n\n";
} else {
    echo "  -> Seluruh akun sudah terpasang sebelumnya. Tidak ada kredensial baru yang dicetak.\n\n";
}

// ----------------------------------------------------------------------------
// 2. SEED NOTIFICATION RECIPIENTS (7 Penerima Asli dari SEED_RECIPIENTS)
// ----------------------------------------------------------------------------
echo "[2/3] Menyemai Notification Recipients (7 Penerima Resmi)...\n";

$defaultEvents = json_encode([
    'reportCreated'   => true,
    'statusUpdated'   => true,
    'reportCompleted' => true,
    'reminderDay3'    => true,
    'reminderDay7'    => true,
    'reminderDay14'   => true,
    'reminderDay30'   => true,
    'weeklyReport'    => true,
], JSON_UNESCAPED_SLASHES);

$recipients = [
    [
        'id'           => 'rec-supervisor-hse',
        'category'     => 'ALWAYS',
        'name'         => 'HSE Supervisor',
        'position'     => 'Supervisor HSE',
        'email'        => 'hse_supervisor@mindaauto.co.id',
        'role'         => 'management',
        'active'       => 1,
        'is_mandatory' => 1,
        'mode'         => 'all',
        'keywords'     => json_encode([]),
    ],
    [
        'id'           => 'rec-admin-mozza',
        'category'     => 'ALWAYS',
        'name'         => 'Mozza Bunga (HSE Admin)',
        'position'     => 'HSE Administrator',
        'email'        => 'mozza.bunga.tarmuji.07@gmail.com',
        'role'         => 'hse_admin',
        'active'       => 1,
        'is_mandatory' => 1,
        'mode'         => 'all',
        'keywords'     => json_encode([]),
    ],
    [
        'id'           => 'rec-officer-purwanto',
        'category'     => 'A',
        'name'         => 'Purwanto',
        'position'     => 'Safety Officer Lead',
        'email'        => 'purwanto@mindaauto.co.id',
        'role'         => 'hse_admin',
        'active'       => 1,
        'is_mandatory' => 0,
        'mode'         => 'keyword',
        'keywords'     => json_encode(['Safety', 'APD', 'Forklift', 'Listrik', 'Machine', 'Ergonomi', 'P3K']),
    ],
    [
        'id'           => 'rec-officer-anita',
        'category'     => 'A',
        'name'         => 'Anita',
        'position'     => 'Safety Officer Inspector',
        'email'        => 'anita@mindaauto.co.id',
        'role'         => 'hse_officer',
        'active'       => 1,
        'is_mandatory' => 0,
        'mode'         => 'keyword',
        'keywords'     => json_encode(['Safety', 'APD', 'Ergonomi', 'Housekeeping', 'Fire']),
    ],
    [
        'id'           => 'rec-officer-asep',
        'category'     => 'B',
        'name'         => 'Asep Permana',
        'position'     => 'Env & Trans Supervisor',
        'email'        => 'asep.permana@mindaauto.co.id',
        'role'         => 'env_officer',
        'active'       => 1,
        'is_mandatory' => 0,
        'mode'         => 'keyword',
        'keywords'     => json_encode(['Environment', 'Waste', 'Chemical', 'Parking', 'Toilet', 'Housekeeping', 'Spill', 'Limbah']),
    ],
    [
        'id'           => 'rec-officer-hrga',
        'category'     => 'A',
        'name'         => 'HRGA Admin',
        'position'     => 'HRGA Admin',
        'email'        => 'hrga_admin@mindaauto.co.id',
        'role'         => 'hrga_admin',
        'active'       => 1,
        'is_mandatory' => 0,
        'mode'         => 'keyword',
        'keywords'     => json_encode(['APD', 'Catering', 'Toilet', 'P3K', 'Food', 'Medical']),
    ],
    [
        'id'           => 'rec-director-president',
        'category'     => 'ALWAYS',
        'name'         => 'President Director',
        'position'     => 'President Director / Executive',
        'email'        => 'president_director@mindaauto.co.id',
        'role'         => 'management',
        'active'       => 1,
        'is_mandatory' => 0,
        'mode'         => 'all',
        'keywords'     => json_encode([]),
    ],
];

$recStmt = $pdo->prepare("
    INSERT INTO notification_recipients (id, category, name, position, email, role, active, is_mandatory, mode, keywords, notification_events, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE
        category = VALUES(category),
        name = VALUES(name),
        position = VALUES(position),
        role = VALUES(role),
        active = VALUES(active),
        is_mandatory = VALUES(is_mandatory),
        mode = VALUES(mode),
        keywords = VALUES(keywords),
        notification_events = VALUES(notification_events),
        updated_at = UTC_TIMESTAMP()
");

foreach ($recipients as $r) {
    $recStmt->execute([
        $r['id'],
        $r['category'],
        $r['name'],
        $r['position'],
        $r['email'],
        $r['role'],
        $r['active'],
        $r['is_mandatory'],
        $r['mode'],
        $r['keywords'],
        $defaultEvents,
    ]);
    echo "  [+] Penerima tersinkronisasi: {$r['name']} <{$r['email']}>\n";
}
echo "\n";

// ----------------------------------------------------------------------------
// 3. SEED NOTIFICATION TEMPLATES (4 Template & 23 Placeholders)
// ----------------------------------------------------------------------------
echo "[3/3] Menyemai Notification Templates (4 Template Utama)...\n";

$allPlaceholders = json_encode([
    'ticketId', 'ticket_id', 'title', 'description', 'reporterName', 'reporter_name',
    'employeeId', 'employee_id', 'department', 'area', 'category', 'subCategory',
    'severity', 'priority', 'assignedPIC', 'assignedEmail', 'createdDate',
    'updatedDate', 'resolvedDate', 'daysOpen', 'status', 'oldStatus', 'newStatus',
    'portalLink', 'company', 'generatedTime'
]);

$templates = [
    [
        'id'      => 'assigned',
        'name'    => 'New Hazard Assigned to PIC',
        'subject' => '[HSE PORTAL] New Hazard Report - {ticketId}',
        'body'    => "PENTING!!\n\nLaporan baru mengenai {category} telah diajukan melalui HSE Portal.\n\nDetail laporan:\n\n• Ticket ID: {ticketId}\n• Reporter: {reporterName}\n• Employee ID: {employeeId}\n• Department: {department}\n• Area: {area}\n• Category: {category}\n• Priority: {priority}\n• Description: {description}\n\nSilakan masuk ke HSE Portal untuk:\n\n• melihat detail laporan\n\n• memperbarui status\n\n• memberikan komentar\n\n• mengunduh Weekly Report PDF",
    ],
    [
        'id'      => 'status_updated',
        'name'    => 'Hazard Status Updated',
        'subject' => '[HSE Portal] Ticket {ticketId} Status Updated ({newStatus})',
        'body'    => "The status of Hazard Ticket {ticketId} (\"{title}\") has been updated from \"{oldStatus}\" to \"{newStatus}\".\nAssigned PIC: {assignedPIC}\nReporter: {reporterName} ({department})\nCategory Class: {category}\nUpdated Date: {updatedDate}.\n\nPlease check the portal for latest updates.\nDirect Link: {portalLink}",
    ],
    [
        'id'      => 'overdue',
        'name'    => 'Hazard Overdue',
        'subject' => '[Reminder] Hazard Ticket {ticketId} masih memerlukan tindak lanjut',
        'body'    => "PENTING!!\n\nHazard Ticket {ticketId} (\"{title}\") masih memerlukan tindak lanjut di Portal HSE PT MINDA Automotive Indonesia.\n\nDetail laporan:\n• Ticket ID: {ticketId}\n• Title: {title}\n• Current Status: {status}\n• Assigned PIC: {assignedPIC}\n• Reporter: {reporterName}\n• Days Open: {daysOpen} day(s)\n\nPortal Link: {portalLink}\n\nTerima kasih.\nPT MINDA Automotive Indonesia",
    ],
    [
        'id'      => 'completed',
        'name'    => 'Hazard Completed',
        'subject' => '[HSE Success] Hazard Ticket {ticketId} Completed',
        'body'    => "Excellent work! Hazard Ticket {ticketId} (\"{title}\") has been marked as COMPLETED on {resolvedDate} and is ready for final validation.\nAssigned PIC: {assignedPIC}\nReporter: {reporterName}.\n\nThank you for ensuring a zero-accident workspace.\nDirect Link: {portalLink}",
    ],
];

$tplStmt = $pdo->prepare("
    INSERT INTO notification_templates (id, name, subject, body, placeholders, updated_at)
    VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        subject = VALUES(subject),
        body = VALUES(body),
        placeholders = VALUES(placeholders),
        updated_at = UTC_TIMESTAMP()
");

foreach ($templates as $t) {
    $tplStmt->execute([
        $t['id'],
        $t['name'],
        $t['subject'],
        $t['body'],
        $allPlaceholders,
    ]);
    echo "  [+] Template tersinkronisasi: [{$t['id']}] {$t['name']}\n";
}

echo "\n====================================================================\n";
echo "SELESAI: Seluruh proses seeding awal basis data berhasil dijalankan.\n";
echo "====================================================================\n";
