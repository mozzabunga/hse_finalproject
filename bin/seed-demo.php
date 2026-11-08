#!/usr/bin/env php
<?php
/**
 * PT MINDA AUTOMOTIVE INDONESIA - HSE PORTAL
 * Development Demo Tickets Seeder (DO NOT EXECUTE IN PRODUCTION)
 * Run: php bin/seed-demo.php
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
echo "PT MINDA AUTOMOTIVE INDONESIA — HSE PORTAL DEMO SEEDER\n";
echo "KHUSUS PENGEMBANGAN / XAMPP (JANGAN DIJALANKAN DI PRODUKSI)\n";
echo "====================================================================\n\n";

$demoTickets = [
    [
        'id'                 => 'demo-uuid-0001',
        'ticket_id'          => 'HZ-2026-0001',
        'title'              => '[DEMO] Kabel Tegangan Tinggi Terkelupas - Injection Molding Area 3',
        'description'        => "[Title] Kabel Tegangan Tinggi Terkelupas - Injection Molding Area 3\n\nDetail Temuan: Ditemukan kabel power 380V terkelupas di dekat jalur pendingin mesin Injection #3. Berpotensi menimbulkan sengatan listrik atau korsleting.\nKondisi Saat Dilaporkan: Kabel masih aktif beraliran listrik\nStatus Korban: Tidak ada korban\nPotensi Dampak: Sengatan Listrik & Kebakaran Pabrik\nTindakan Sementara: Area dipasang pembatas dan dimatikan sementara\nSaran Perbaikan: Ganti kabel dengan conduit tahan gesek dan pasang sensor interlock\nDetail Lokasi: Mesin Injection #3 Line B",
        'category'           => 'A',
        'hazard_category'    => 'Kategori A (Safety / APD)',
        'status'             => 'UnderInvestigation',
        'dfa_status'         => 'UnderInvestigation',
        'priority'           => 'High',
        'department'         => 'Production',
        'area'               => 'Injection Molding Area 3',
        'detail_location'    => 'Mesin Injection #3 Line B',
        'incident_date'      => date('Y-m-d', strtotime('-4 days')),
        'reporter_name'      => 'Ahmad Fauzi [DEMO]',
        'reporter_email'     => 'employee@mindaauto.co.id',
        'employee_id'        => 'EMP-9021',
        'position'           => 'Injection Operator',
        'potential_impact'   => 'Sengatan Listrik & Kebakaran Pabrik',
        'injury_status'      => 'Tidak ada korban',
        'temporary_action'   => 'Area dipasang pembatas dan dimatikan sementara',
        'current_condition'  => 'Kabel masih aktif beraliran listrik',
        'reported_to_leader' => 'Sudah ke Supervisor',
        'suggestion'         => 'Ganti kabel dengan conduit tahan gesek dan pasang sensor interlock',
        'assigned_to'        => '44444444-4444-4444-4444-444444444444',
        'assigned_pic_id'    => 'usr_asep_permana',
        'assigned_pic_name'  => 'Asep Permana',
        'assigned_pic_email' => 'asep.permana@mindaauto.co.id',
        'severity'           => 4,
        'likelihood'         => 3,
        'risk_score'         => 12,
        'risk_level'         => 'High',
        'otp_required'       => 1,
        'otp_program_name'   => 'OTP-2026-ELECTRICAL-01 (Isolasi Cable High Voltage Injection)',
        'additional_control' => 'Rekayasa Teknik: Pemasangan Conduit Cable Cover & Interlock Relay Power',
        'created_at'         => gmdate('Y-m-d H:i:s', strtotime('-4 days')),
        'updated_at'         => gmdate('Y-m-d H:i:s', strtotime('-4 days')),
    ],
    [
        'id'                 => 'demo-uuid-0002',
        'ticket_id'          => 'HZ-2026-0002',
        'title'              => '[DEMO] Tumpahan Oli Hidrolik Mesin Press - Press Machine Section',
        'description'        => "[Title] Tumpahan Oli Hidrolik Mesin Press - Press Machine Section\n\nDetail Temuan: Kebocoran oli hidrolik di bawah Mesin Press #12 seluas 2x2 meter, lantai sangat licin membahayakan forklift dan operator.\nKondisi Saat Dilaporkan: Oli masih menetes dari seal silinder\nStatus Korban: 1 operator terpeleset tanpa luka parah\nPotensi Dampak: Terpeleset & Pencemaran Saluran Limbah\nTindakan Sementara: Ditaburi serbuk gergaji dan dipasang oil absorbent\nSaran Perbaikan: Ganti seal hidrolik mesin press #12 secara menyeluruh\nDetail Lokasi: Lantai Press Stamping Bay 2",
        'category'           => 'B',
        'hazard_category'    => 'Kategori B (Lingkungan / 5S)',
        'status'             => 'ActionRequired',
        'dfa_status'         => 'ActionRequired',
        'priority'           => 'Medium',
        'department'         => 'Maintenance',
        'area'               => 'Press Machine Section',
        'detail_location'    => 'Lantai Press Stamping Bay 2',
        'incident_date'      => date('Y-m-d', strtotime('-6 days')),
        'reporter_name'      => 'Budi Santoso [DEMO]',
        'reporter_email'     => 'employee@mindaauto.co.id',
        'employee_id'        => 'EMP-4402',
        'position'           => 'Press Operator',
        'potential_impact'   => 'Terpeleset & Pencemaran Saluran Limbah',
        'injury_status'      => '1 operator terpeleset tanpa luka parah',
        'temporary_action'   => 'Ditaburi serbuk gergaji dan dipasang oil absorbent',
        'current_condition'  => 'Oli masih menetes dari seal silinder',
        'reported_to_leader' => 'Sudah ke Leader Press',
        'suggestion'         => 'Ganti seal hidrolik mesin press #12 secara menyeluruh',
        'assigned_to'        => '44444444-4444-4444-4444-444444444444',
        'assigned_pic_id'    => 'usr_asep_permana',
        'assigned_pic_name'  => 'Asep Permana',
        'assigned_pic_email' => 'asep.permana@mindaauto.co.id',
        'severity'           => 2,
        'likelihood'         => 4,
        'risk_score'         => 8,
        'risk_level'         => 'Moderate',
        'otp_required'       => 0,
        'additional_control' => 'Substitusi & Administrasi: Penggunaan Oil Absorbent Pad & Penjadwalan Preventif Seal Replacement',
        'created_at'         => gmdate('Y-m-d H:i:s', strtotime('-6 days')),
        'updated_at'         => gmdate('Y-m-d H:i:s', strtotime('-4 days')),
    ],
    [
        'id'                 => 'demo-uuid-0003',
        'ticket_id'          => 'HZ-2026-0003',
        'title'              => '[DEMO] Operator Gudang Bekerja Tanpa Helm Safety - Loading Bay',
        'description'        => "[Title] Operator Gudang Bekerja Tanpa Helm Safety - Loading Bay\n\nDetail Temuan: Tiga orang operator di loading bay menurunkan peti komponen berat dari rak tinggi tanpa mengenakan helm keselamatan dan sepatu safety.\nKondisi Saat Dilaporkan: Aktivitas loading masih berlangsung\nStatus Korban: Tidak ada korban\nPotensi Dampak: Tertimpa barang berat dari ketinggian rak\nTindakan Sementara: Petugas menghentikan aktivitas dan menginstruksikan pemakaian APD\nSaran Perbaikan: Cek ketersediaan APD di locker logistik dan briefing K3 ulang\nDetail Lokasi: Loading Bay Rak 4B",
        'category'           => 'A',
        'hazard_category'    => 'Kategori A (Safety / APD)',
        'status'             => 'NewReport',
        'dfa_status'         => 'PendingValidation',
        'priority'           => 'Medium',
        'department'         => 'Logistics',
        'area'               => 'Loading Bay Shelf Racks',
        'detail_location'    => 'Loading Bay Rak 4B',
        'incident_date'      => date('Y-m-d', strtotime('-1 days')),
        'reporter_name'      => 'Anita (Safety Officer) [DEMO]',
        'reporter_email'     => 'anita@mindaauto.co.id',
        'employee_id'        => 'OFF-0112',
        'position'           => 'Safety Officer Inspector',
        'potential_impact'   => 'Tertimpa barang berat dari ketinggian rak',
        'injury_status'      => 'Tidak ada korban',
        'temporary_action'   => 'Petugas menghentikan aktivitas dan menginstruksikan pemakaian APD',
        'current_condition'  => 'Aktivitas loading masih berlangsung',
        'reported_to_leader' => 'Sudah disampaikan ke Ka. Logistik',
        'suggestion'         => 'Cek ketersediaan APD di locker logistik dan briefing K3 ulang',
        'assigned_to'        => '33333333-3333-3333-3333-333333333333',
        'assigned_pic_id'    => 'usr_hrga_admin',
        'assigned_pic_name'  => 'HRGA Admin',
        'assigned_pic_email' => 'hrga_admin@mindaauto.co.id',
        'severity'           => 2,
        'likelihood'         => 2,
        'risk_score'         => 4,
        'risk_level'         => 'Low',
        'otp_required'       => 0,
        'created_at'         => gmdate('Y-m-d H:i:s', strtotime('-1 days')),
        'updated_at'         => gmdate('Y-m-d H:i:s', strtotime('-1 days')),
    ],
    [
        'id'                 => 'demo-uuid-0004',
        'ticket_id'          => 'HZ-2026-0004',
        'title'              => '[DEMO] Kunci Panic Bar Pintu Darurat Macet - Assembly Line B Exit',
        'description'        => "[Title] Kunci Panic Bar Pintu Darurat Macet - Assembly Line B Exit\n\nDetail Temuan: Mekanisme kunci panic bar pada pintu darurat utama Assembly Line B macet berkarat, tidak dapat didorong keluar saat simulasi evakuasi.\nKondisi Saat Dilaporkan: Pintu darurat terkunci mati\nStatus Korban: Tidak ada korban\nPotensi Dampak: Terperangkap saat terjadi kebakaran pabrik\nTindakan Sementara: Pintu dibuka paksa dan diganjal sementara selama jam kerja\nSaran Perbaikan: Pasang panic hardware standar UL/FM baru\nDetail Lokasi: Pintu Darurat Timur Line B",
        'category'           => 'C',
        'hazard_category'    => 'Kategori C (General / Maintenance)',
        'status'             => 'Resolved',
        'dfa_status'         => 'Resolved',
        'priority'           => 'Medium',
        'department'         => 'Quality',
        'area'               => 'Assembly Line B Exit',
        'detail_location'    => 'Pintu Darurat Timur Line B',
        'incident_date'      => date('Y-m-d', strtotime('-12 days')),
        'reporter_name'      => 'Lina Kartika [DEMO]',
        'reporter_email'     => 'employee@mindaauto.co.id',
        'employee_id'        => 'EMP-1192',
        'position'           => 'QC Inspector',
        'potential_impact'   => 'Terperangkap saat terjadi kebakaran pabrik',
        'injury_status'      => 'Tidak ada korban',
        'temporary_action'   => 'Pintu dibuka paksa dan diganjal sementara selama jam kerja',
        'current_condition'  => 'Pintu darurat terkunci mati',
        'reported_to_leader' => 'Sudah ke Maintenance Supervisor',
        'suggestion'         => 'Pasang panic hardware standar UL/FM baru',
        'assigned_to'        => '11111111-1111-1111-1111-111111111111',
        'assigned_pic_id'    => 'usr_hse_team',
        'assigned_pic_name'  => 'HSE Team',
        'assigned_pic_email' => 'hse_supervisor@mindaauto.co.id',
        'severity'           => 3,
        'likelihood'         => 2,
        'risk_score'         => 6,
        'risk_level'         => 'Moderate',
        'otp_required'       => 0,
        'additional_control' => 'Rekayasa Teknik: Pengantian Panic Hardware Fire Door Standar K3',
        'created_at'         => gmdate('Y-m-d H:i:s', strtotime('-12 days')),
        'updated_at'         => gmdate('Y-m-d H:i:s', strtotime('-11 days')),
    ],
];

$stmt = $pdo->prepare("
    INSERT INTO hazard_reports (
        id, ticket_id, title, description, category, hazard_category,
        status, dfa_status, priority, department, area, detail_location,
        incident_date, reporter_name, reporter_email, employee_id, position,
        potential_impact, injury_status, temporary_action, current_condition,
        reported_to_leader, suggestion, assigned_to, assigned_pic_id,
        assigned_pic_name, assigned_pic_email, severity, likelihood,
        risk_score, risk_level, otp_required, otp_program_name, additional_control,
        created_at, updated_at
    ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
    ) ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        status = VALUES(status),
        updated_at = VALUES(updated_at)
");

foreach ($demoTickets as $t) {
    $stmt->execute([
        $t['id'],
        $t['ticket_id'],
        $t['title'],
        $t['description'],
        $t['category'],
        $t['hazard_category'],
        $t['status'],
        $t['dfa_status'],
        $t['priority'],
        $t['department'],
        $t['area'],
        $t['detail_location'],
        $t['incident_date'],
        $t['reporter_name'],
        $t['reporter_email'],
        $t['employee_id'],
        $t['position'],
        $t['potential_impact'],
        $t['injury_status'],
        $t['temporary_action'],
        $t['current_condition'],
        $t['reported_to_leader'],
        $t['suggestion'],
        $t['assigned_to'],
        $t['assigned_pic_id'],
        $t['assigned_pic_name'],
        $t['assigned_pic_email'],
        $t['severity'],
        $t['likelihood'],
        $t['risk_score'],
        $t['risk_level'],
        $t['otp_required'],
        $t['otp_program_name'] ?? null,
        $t['additional_control'] ?? null,
        $t['created_at'],
        $t['updated_at']
    ]);

    echo "  [+] Demo Ticket tersimpan: {$t['ticket_id']} — {$t['title']}\n";
}

// Tambahkan contoh komentar publik demo pada tiket 0001
$pdo->prepare("
    INSERT INTO hazard_comments (id, hazard_id, user_id, user_name, user_role, comment, is_internal_only, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE comment = VALUES(comment)
")->execute([
    'demo-comment-1',
    'demo-uuid-0001',
    'usr_asep_permana',
    'Asep Permana',
    'env_officer',
    'Tim maintenance telah melakukan pemadaman sementara pada jalur 380V. Penggantian conduit sedang dikoordinasikan dengan tim elektrikal.'
]);

echo "  [+] Demo Comment ditambahkan pada tiket HZ-2026-0001\n";

echo "\n====================================================================\n";
echo "SELESAI: 4 tiket demo berhasil disemai untuk pengetesan XAMPP.\n";
echo "Coba lacak tiket: HZ-2026-0001, HZ-2026-0002, HZ-2026-0003, HZ-2026-0004\n";
echo "====================================================================\n";
