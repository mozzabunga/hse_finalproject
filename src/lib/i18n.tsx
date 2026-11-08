import React, { createContext, useContext, useState } from 'react';

export type Language = 'id' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const translations = {
  id: {
    // Header & Navigation
    'company.name': 'PT MINDA AUTOMOTIVE INDONESIA',
    'portal.title': 'Portal K3 & Sistem SLA',
    'nav.home': 'Dashboard Utama',
    'nav.report': 'Lacak & Laporkan Bahaya',
    'nav.officer': 'Portal Petugas K3',
    'nav.workflow': 'SOP K3',
    'header.officerLogin': 'Login Petugas',
    'header.logout': 'Keluar Sesi',
    'header.notifications': 'Pemberitahuan',
    'header.recentNotifs': 'Notifikasi Terbaru',
    'header.markAllRead': 'Tandai Semua Dibaca',
    'header.noNotifs': 'Tidak ada pemberitahuan baru',
    'header.dismiss': 'Tutup',

    // Footer
    'footer.rights': 'Hak Cipta Dilindungi Undang-Undang.',
    'footer.slaText': 'Sistem Pemantauan Kepatuhan SLA v2.10',
    'footer.k3Text': 'Standar K3 (Budaya Nihil Kecelakaan Kerja / Zero Accident)',

    // Home / Public Tracker Landing
    'landing.title': 'Portal Pelaporan Bahaya & Hampir Celaka K3',
    'landing.subtitle': 'Standar Keselamatan dan Kesehatan Kerja (K3) PT Minda Automotive Indonesia. Karyawan dapat melaporkan potensi bahaya atau memantau status penanganan perbaikan secara real-time.',
    'landing.makeReport': 'Buat Laporan Baru',
    'landing.makeReportDesc': 'Laporkan potensi bahaya, tindakan tidak aman, kerusakan APD, atau kondisi hampir celaka langsung melalui Portal HSE ini.',
    'landing.trackReport': 'Lacak Laporan Anda',
    'landing.trackReportDesc': 'Cek kemajuan perbaikan, petugas penanggung jawab (PIC), log riwayat, dan catatan resmi menggunakan ID Tiket atau kata kunci.',

    // Redirect Modal / Processing
    'redirect.title': 'Formulir Laporan Bahaya HSE Portal',
    'redirect.desc': 'Kirim laporan bahaya langsung ke sistem K3 PT Minda Automotive Indonesia dengan penugasan PIC otomatis.',
    'redirect.infoTitle': 'Informasi Pelaporan Langsung',
    'redirect.infoStep1': 'Laporan langsung tersimpan ke database sistem HSE.',
    'redirect.infoStep2': 'SLA dan notifikasi ke PIC terkirim secara instan.',
    'redirect.infoStep3': 'Gunakan ID Tiket untuk memantau perkembangan tindak lanjut.',
    'redirect.infoStep4': 'Sertakan foto bukti agar proses verifikasi lebih cepat.',
    'redirect.goBack': 'Kembali',
    'redirect.openForm': 'Buka Formulir Laporan →',
    'redirect.viewProcessing': 'Lihat Daftar Periksa Pemrosesan Sistem →',

    // Search Tracker
    'track.searchTitle': 'Cari Laporan Insiden Bahaya K3',
    'track.searchDesc': 'Masukkan ID Tiket K3 unik Anda (contoh: HZ-2026-0001) atau kata kunci pencarian untuk melacak alur penanganan perbaikan.',
    'track.placeholder': 'HZ-2026-0001 atau Area Injeksi Molding',
    'track.searchBtn': 'Cari Laporan',
    'track.guidelinesTitle': 'Panduan & Kriteria Pencarian:',
    'track.guidelineTicket': 'ID Tiket: Pencarian tepat sesuai nomor referensi (contoh: HZ-2026-0001).',
    'track.guidelineKeyword': 'Kata Kunci: Pencarian berdasarkan departemen, area lokasi, nama pelapor, atau kata dalam judul/deskripsi.',
    'track.results': 'Hasil Pencarian',
    'track.noResults': 'Laporan tidak ditemukan',
    'track.noResultsDesc': 'Tidak ada data yang sesuai dengan kata kunci pencarian Anda. Pastikan format ID Tiket benar atau gunakan kata kunci yang lebih umum.',
    'track.timelineTitle': 'Siklus Hidup Perbaikan Insiden K3',
    'track.currentStage': 'Tahap Saat Ini',
    'track.updatesTitle': 'Catatan & Perkembangan Perbaikan dari Petugas',
    'track.noComments': 'Belum ada catatan atau pembaharuan publik yang diterbitkan untuk tiket ini.',
    'track.k3Advisory': 'HIMBAUAN KEAMANAN K3: Berdasarkan kebijakan privasi perusahaan, riwayat kemajuan tiket ini bersifat khusus baca. Karyawan umum tidak dapat mengubah isi tiket. Untuk perubahan atau konfirmasi tambahan, silakan hubungi Tim HSE / Safety Officer (Bu Anita).',

    // Employee Report Section
    'form.title': 'Laporkan Hampir Celaka / Bahaya K3',
    'form.desc': 'PT Minda Automotive Indonesia menerapkan Kebijakan Nihil Kecelakaan (Zero Accident K3). Gunakan formulir ini untuk melaporkan potensi bahaya secara transparan. Sistem aturan otomatis kami akan memproses laporan ke PIC terkait.',
    'form.empId': 'ID Karyawan / NIK *',
    'form.name': 'Nama Lengkap *',
    'form.email': 'Email Perusahaan *',
    'form.hazardTitle': 'Judul Bahaya / Kejadian *',
    'form.department': 'Lokasi Departemen',
    'form.area': 'Area Spesifik Pabrik',
    'form.description': 'Jelaskan Detail Bahaya & Risiko Dampak *',
    'form.descPlaceholder': 'Jelaskan potensi bahaya secara rinci. Sertakan dampak potensial, mesin yang terdampak, atau kejadian hampir celaka yang terjadi.',
    'form.submitBtn': 'Kirim Laporan Bahaya',
    'form.submitting': 'Mengirim Tiket...',
    'form.successTitle': 'Tiket Berhasil Terkirim!',
    'form.successDesc': 'Laporan Anda telah dicatat dengan Nomor Referensi Tiket',
    'form.filtersBtn': 'Filter Lanjutan',
    'form.clearFilters': 'Hapus Filter',

    // SOP / Workflow Section
    'sop.title': 'Prosedur Operasional Standar K3 (SOP)',
    'sop.desc': 'PT Minda Automotive Indonesia menerapkan lingkungan kerja bebas kecelakaan di bawah protokol industri K3. Portal ini mengotomatiskan seluruh alur pelaporan bahaya dengan pengawasan SLA dan verifikasi status.',
    'sop.stage1Title': 'Identifikasi & Pelaporan',
    'sop.stage1Desc': 'Setiap karyawan atau warden mengidentifikasi potensi hampir celaka, peralatan rusak, atau pelanggaran K3 dan melaporkannya melalui portal.',
    'sop.stage2Title': 'Routing Otomatis Aturan DFA',
    'sop.stage2Desc': 'Mesin aturan mengategorikan masalah: Kelas A (APD), Kelas B (Lingkungan), atau Kelas C (Perawatan/Mesin), lalu mengalokasikan petugas terkait secara instan.',
    'sop.stage3Title': 'Pelacakan SLA & Pengingat',
    'sop.stage3Desc': 'Hitung mundur SLA dimulai. Tiket yang belum selesai setelah 3 hari mengirimkan peringatan kepatuhan kepada PIC. Pelanggaran berat memicu eskalasi langsung.',
    'sop.stage4Title': 'Verifikasi DFA & Penutupan',
    'sop.stage4Desc': 'Petugas memperbarui status sesuai aturan otomata berhingga deterministik (DFA). Perbaikan memerlukan verifikasi sebelum penutupan tiket.',

    // Status Labels
    'status.NewReport': 'Laporan Baru',
    'status.PendingValidation': 'Menunggu Validasi',
    'status.UnderInvestigation': 'Dalam Investigasi',
    'status.ActionRequired': 'Tindakan Diperlukan',
    'status.WaitingProcurement': 'Menunggu Pengadaan',
    'status.Implementation': 'Pelaksanaan Perbaikan',
    'status.Completed': 'Selesai Dikerjakan',
    'status.Resolved': 'Terverifikasi Selesai (SOP)',

    // Timeline Stages
    'stage.NewReport': 'Dicatat',
    'stage.PendingValidation': 'Validasi Lokasi',
    'stage.UnderInvestigation': 'Investigasi / Penilaian Risiko',
    'stage.ActionRequired': 'Tindakan Perbaikan',
    'stage.WaitingProcurement': 'Pengadaan Material/PO',
    'stage.Implementation': 'Proses Perbaikan',
    'stage.Completed': 'Perbaikan Selesai',
    'stage.Resolved': 'Penutupan Verifikasi K3',

    // Officer Login Page
    'login.title': 'Autentikasi Petugas K3',
    'login.desc': 'Akses khusus untuk petugas keselamatan & administrator PT Minda Automotive Indonesia.',
    'login.username': 'Username / Email Perusahaan',
    'login.password': 'Kata Sandi / Passcode',
    'login.remember': 'Ingat Saya',
    'login.submit': 'Masuk ke Portal',
    'login.verifying': 'Memverifikasi Sesi...',
    'login.back': 'Kembali ke Portal Karyawan',
    'login.notice': 'Hanya akun resmi yang terdaftar yang dapat mengakses Portal Petugas untuk menjaga keamanan data dan keakuratan investigasi K3 PT Minda Automotive Indonesia.',

    // Submission Processing Screen
    'proc.title': 'Terima Kasih Telah Melaporkan Bahaya K3',
    'proc.desc1': 'Laporan Bahaya / Hampir Celaka Anda telah berhasil diterima oleh PT MINDA AUTOMOTIVE INDONESIA.',
    'proc.desc2': 'Sistem Manajemen K3 kami sedang melakukan validasi otomatis dan pemrosesan internal untuk memastikan laporan Anda ditangani oleh personel penanggung jawab sesuai prosedur perusahaan.',
    'proc.progressTitle': 'Kemajuan Sinkronisasi Sistem',
    'proc.checklistTitle': 'Daftar Periksa Pemrosesan Sistem',
    'proc.notice1': 'Anda dapat menutup halaman ini kapan saja.',
    'proc.notice2': 'Laporan Anda akan terus diproses secara otomatis di latar belakang.',
    'proc.notice3': 'Setelah sinkronisasi selesai, laporan dapat dipantau melalui fitur Lacak Laporan Anda.',
    'proc.btnHome': 'Kembali ke Portal Utama',
    'proc.btnTrack': 'Lacak Laporan Anda',

    // Officer Panel Subtabs
    'officer.tabDashboard': 'Dashboard Utama & KPI',
    'officer.tabTickets': 'Kelola Tiket Bahaya',
    'officer.tabRecipients': 'Daftar Penerima Notifikasi',
    'officer.tabWeekly': 'Laporan Mingguan Manajerial',
    'officer.tabSla': 'Pemeriksaan Eskalasi SLA',
    'officer.tabLogs': 'Log Audit Sistem',
    'officer.tabTemplates': 'Template Email Notifikasi',

    // Officer Panel Controls & Labels
    'officer.roleLabel': 'Peran Operator',
    'officer.exportExecPdf': 'Ekspor Ringkasan Eksekutif (PDF)',
    'officer.totalReports': 'Total Laporan Bahaya',
    'officer.openReports': 'Laporan Terbuka (Aktif)',
    'officer.resolvedReports': 'Laporan Selesai & Dibatalkan',
    'officer.overdueSla': 'Lewat Batas Waktu SLA (>3 Hari)',
    'officer.slaRate': 'Tingkat Kepatuhan SLA',
    'officer.avgResolution': 'Rata-Rata Waktu Perbaikan',
    'officer.topDept': 'Departemen Terbanyak',
    'officer.topCategory': 'Kategori Terbanyak',
    'officer.searchPlaceholder': 'Cari tiket, judul, lokasi, atau pelapor...',
    'officer.filterAllStatus': 'Semua Status',
    'officer.filterAllCategory': 'Semua Kategori',
    'officer.filterAllDept': 'Semua Departemen',
    'officer.addRecipient': 'Tambah Penerima Baru',
    'officer.saveRecipient': 'Simpan Penerima',
    'officer.recipientList': 'Daftar Penerima Notifikasi Email',
    'officer.tableTicketId': 'ID Tiket',
    'officer.tableTitle': 'Judul Bahaya',
    'officer.tableReporter': 'Pelapor',
    'officer.tableDept': 'Departemen',
    'officer.tableStatus': 'Status',
    'officer.tableActions': 'Tindakan',
    'officer.noData': 'Tidak ada data untuk ditampilkan',
    'officer.mgmtOversight': 'Pengawasan Manajemen & Direksi',
    'officer.readOnlyMode': 'Mode Eksekutif Khusus',
    'officer.execDashboardTitle': 'Dashboard Eksekutif KPI & Keselamatan Kerja HSE',
    'officer.execDashboardDesc': 'Metrik keselamatan pabrik real-time, matriks risiko, peta area, dan tolok ukur penyelesaian.',
    'officer.openHazards': 'Laporan Terbuka',
    'officer.closedHazards': 'Laporan Selesai',
    'officer.actionsPending': 'Tindakan Menunggu',
    'officer.resolvedVerified': 'Selesai & Terverifikasi',
    'officer.days': 'Hari'
  },
  en: {
    // Header & Navigation
    'company.name': 'PT MINDA AUTOMOTIVE INDONESIA',
    'portal.title': 'HSE Portal & SLA System',
    'nav.home': 'Home Dashboard',
    'nav.report': 'Track & Report Hazard',
    'nav.officer': 'Officer Portal',
    'nav.workflow': 'Safety SOP',
    'header.officerLogin': 'Officer Login',
    'header.logout': 'Logout Session',
    'header.notifications': 'Notifications',
    'header.recentNotifs': 'Recent Notifications',
    'header.markAllRead': 'Mark all read',
    'header.noNotifs': 'No new alerts or warnings',
    'header.dismiss': 'Dismiss',

    // Footer
    'footer.rights': 'All Rights Reserved.',
    'footer.slaText': 'SLA Compliance Monitoring System v2.10',
    'footer.k3Text': 'K3 Standard (Zero Accident Culture)',

    // Home / Public Tracker Landing
    'landing.title': 'HSE Hazard & Near Miss Portal',
    'landing.subtitle': 'PT Minda K3 Safety Compliance. Employees can report hazards or track real-time remediation status.',
    'landing.makeReport': 'Make New Report',
    'landing.makeReportDesc': 'Report potential hazards, unsafe acts, damaged PPE, or near-miss conditions directly via this native HSE Portal.',
    'landing.trackReport': 'Track Your Report',
    'landing.trackReportDesc': 'Check remediation progress, assigned officer (PIC), timeline logs, and official comments using your Ticket ID or keyword.',

    // Redirect Modal / Processing
    'redirect.title': 'HSE Portal Native Hazard Report',
    'redirect.desc': 'Submit safety hazard reports directly to the PT Minda Automotive Indonesia K3 system with automated PIC dispatch.',
    'redirect.infoTitle': 'Direct Reporting Information',
    'redirect.infoStep1': 'The report is saved directly to the HSE database.',
    'redirect.infoStep2': 'Automated SLA and PIC notifications are triggered instantly.',
    'redirect.infoStep3': 'Use your unique Ticket ID to follow up on corrective progress.',
    'redirect.infoStep4': 'Attach photo evidence to accelerate verification.',
    'redirect.goBack': 'Go Back',
    'redirect.openForm': 'Open Report Form →',
    'redirect.viewProcessing': 'View System Processing Checklist →',

    // Search Tracker
    'track.searchTitle': 'Search Safety Incident Report',
    'track.searchDesc': 'Enter your unique Safety Ticket ID (e.g. HZ-2026-0001) or any matching keyword to trace its active resolution lifecycle.',
    'track.placeholder': 'HZ-2026-0001 or Injection Molding Area',
    'track.searchBtn': 'Search Report',
    'track.guidelinesTitle': 'Search Criteria & Guidelines:',
    'track.guidelineTicket': 'Ticket ID: Exact matches on reference numbers (e.g. HZ-2026-0001).',
    'track.guidelineKeyword': 'Keyword: Matches on department, area site, reporter name, or words within the title/description.',
    'track.results': 'Search Results',
    'track.noResults': 'No matching reports found',
    'track.noResultsDesc': "We couldn't locate any records matching your query. Verify your Ticket ID syntax or try broader keywords.",
    'track.timelineTitle': 'Incident Remediation Lifecycle Timeline',
    'track.currentStage': 'Current Stage',
    'track.updatesTitle': 'Officer Progress Updates & Comments',
    'track.noComments': 'No public updates or comments have been published yet for this ticket.',
    'track.k3Advisory': 'K3 SECURITY ADVISORY: Under corporate privacy policies, this ticket progress trail is read-only. Standard employees are barred from direct ticket mutation. For corrective amendments, please notify Bu Anita (HSE Officer).',

    // Employee Report Section
    'form.title': 'Report Near Miss / Safety Hazard',
    'form.desc': 'PT Minda Automotive enforces a strict Zero Accident (K3) Policy. Use this form to flag hazards. Our rule engine will route this to the specific PIC in less than 2 seconds.',
    'form.empId': 'Employee ID *',
    'form.name': 'Full Name *',
    'form.email': 'Corporate Email *',
    'form.hazardTitle': 'Hazard Title *',
    'form.department': 'Department Location',
    'form.area': 'Exact Area Site',
    'form.description': 'Describe Hazard & Impact Risks *',
    'form.descPlaceholder': 'Explain the hazard in detail. Include potential consequences, machines affected, or near-miss events occurring due to this issue.',
    'form.submitBtn': 'Dispatch Hazard Report',
    'form.submitting': 'Logging Ticket...',
    'form.successTitle': 'Ticket Dispatched Successfully!',
    'form.successDesc': 'Your report was compiled under Reference ID',
    'form.filtersBtn': 'Advanced Filters',
    'form.clearFilters': 'Clear Filters',

    // SOP / Workflow Section
    'sop.title': 'HSE Standard Operating Procedure (SOP)',
    'sop.desc': 'PT Minda Automotive Indonesia enforces a zero-accident workspace environment under K3 industrial protocols. This portal automates the entire hazard reporting lifespans with strict SLA and state verification.',
    'sop.stage1Title': 'Identification & Reporting',
    'sop.stage1Desc': 'Any employee or warden identifies a near-miss, broken equipment, or safety violation and logs the issue via the employee portal.',
    'sop.stage2Title': 'Automated DFA Routing',
    'sop.stage2Desc': 'Our rule-based engine categorizes the issue: Category A (PPE), Category B (Environmental), or Category C (Maintenance), and allocates the dedicated safety officer in under 2 seconds.',
    'sop.stage3Title': 'SLA Tracking & Reminders',
    'sop.stage3Desc': 'The SLA countdown begins. Tickets unresolved after 3 days dispatch compliance alerts to PICs. Severe unresolved breaches (10 days) trigger direct executive escalations.',
    'sop.stage4Title': 'DFA Validation & Closure',
    'sop.stage4Desc': 'Officers transition states strictly following the Deterministic Finite Automaton (DFA) state rules. Resolution requires validation before final ticket closure.',

    // Status Labels
    'status.NewReport': 'New Report',
    'status.PendingValidation': 'Pending Validation',
    'status.UnderInvestigation': 'Under Investigation',
    'status.ActionRequired': 'Action Required',
    'status.WaitingProcurement': 'Waiting Procurement',
    'status.Implementation': 'Implementation',
    'status.Completed': 'Completed',
    'status.Resolved': 'Resolved (SOP Verified)',

    // Timeline Stages
    'stage.NewReport': 'Logged',
    'stage.PendingValidation': 'Site Validation',
    'stage.UnderInvestigation': 'Under Investigation',
    'stage.ActionRequired': 'Action Required',
    'stage.WaitingProcurement': 'Procurement / PO',
    'stage.Implementation': 'Repair Process',
    'stage.Completed': 'Completed',
    'stage.Resolved': 'K3 Verification & Closed',

    // Officer Login Page
    'login.title': 'HSE Officer Authentication',
    'login.desc': 'Secure administrative entrance for PT Minda Automotive Indonesia compliance officers.',
    'login.username': 'Username / Corporate Email',
    'login.password': 'Access Passcode',
    'login.remember': 'Remember Me',
    'login.submit': 'Sign In',
    'login.verifying': 'Verifying Session...',
    'login.back': 'Back to Employee Portal',
    'login.notice': 'Only authorized accounts can access the Officer Portal to maintain data security, privacy, and accuracy of HSE investigation processes.',

    // Submission Processing Screen
    'proc.title': 'Thank You for Reporting a Safety Hazard',
    'proc.desc1': 'Your Hazard / Near Miss report has been successfully received by PT MINDA AUTOMOTIVE INDONESIA.',
    'proc.desc2': 'Our HSE Management System is currently performing automated validation and internal processing to ensure your report is delivered to the appropriate responsible personnel in accordance with company procedures.',
    'proc.progressTitle': 'System Synchronization Progress',
    'proc.checklistTitle': 'System Processing Checklist',
    'proc.notice1': 'You may safely close this page at any time.',
    'proc.notice2': 'Your report will continue to be processed automatically in the background.',
    'proc.notice3': 'Once synchronization is complete, your report can be monitored through the Track Your Report feature.',
    'proc.btnHome': 'Return to Main Portal',
    'proc.btnTrack': 'Track Your Report',

    // Officer Panel Subtabs
    'officer.tabDashboard': 'Main Dashboard & KPIs',
    'officer.tabTickets': 'Manage Hazard Tickets',
    'officer.tabRecipients': 'Notification Recipients',
    'officer.tabWeekly': 'Managerial Weekly Reports',
    'officer.tabSla': 'SLA Escalation Check',
    'officer.tabLogs': 'System Audit Logs',
    'officer.tabTemplates': 'Email Notification Templates',

    // Officer Panel Controls & Labels
    'officer.roleLabel': 'Operator Role',
    'officer.exportExecPdf': 'Export Executive Summary (PDF)',
    'officer.totalReports': 'Total Hazard Reports',
    'officer.openReports': 'Open Reports (Active)',
    'officer.resolvedReports': 'Resolved & Closed Reports',
    'officer.overdueSla': 'Overdue SLA (>3 Days)',
    'officer.slaRate': 'SLA Compliance Rate',
    'officer.avgResolution': 'Avg Resolution Time',
    'officer.topDept': 'Top Department',
    'officer.topCategory': 'Top Category',
    'officer.searchPlaceholder': 'Search ticket, title, location, or reporter...',
    'officer.filterAllStatus': 'All Statuses',
    'officer.filterAllCategory': 'All Categories',
    'officer.filterAllDept': 'All Departments',
    'officer.addRecipient': 'Add New Recipient',
    'officer.saveRecipient': 'Save Recipient',
    'officer.recipientList': 'Email Notification Recipients List',
    'officer.tableTicketId': 'Ticket ID',
    'officer.tableTitle': 'Hazard Title',
    'officer.tableReporter': 'Reporter',
    'officer.tableDept': 'Department',
    'officer.tableStatus': 'Status',
    'officer.tableActions': 'Actions',
    'officer.noData': 'No data available to display',
    'officer.mgmtOversight': 'Management & CEO Oversight',
    'officer.readOnlyMode': 'Read-Only Executive Mode',
    'officer.execDashboardTitle': 'Executive HSE KPI Management Dashboard',
    'officer.execDashboardDesc': 'Real-time factory safety metrics, risk matrix, area heatmap, and resolution benchmarks.',
    'officer.openHazards': 'Open Hazards',
    'officer.closedHazards': 'Closed Hazards',
    'officer.actionsPending': 'Actions Pending',
    'officer.resolvedVerified': 'Resolved & Verified',
    'officer.days': 'Days'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'id',
  setLanguage: () => {},
  t: (key: string) => key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('minda_hse_language');
      if (saved === 'en' || saved === 'id') return saved;
    } catch (e) {
      console.error(e);
    }
    return 'id'; // Indonesian default for PT Minda Automotive Indonesia
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('minda_hse_language', lang);
    } catch (e) {
      console.error(e);
    }
  };

  const t = (key: string): string => {
    const langDict = translations[language] || translations.id;
    return langDict[key as keyof typeof langDict] || translations.id[key as keyof typeof translations.id] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
