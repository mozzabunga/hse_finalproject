# PT MINDA AUTOMOTIVE INDONESIA — HSE HAZARD & NEAR MISS PORTAL
## Panduan Instalasi & Eksekusi Native PHP 8.2+ & MySQL (XAMPP Windows)

Aplikasi Portal Pelaporan Bahaya dan Hampir Celaka K3 (Health, Safety, and Environment) PT Minda Automotive Indonesia yang dibangun menggunakan **PHP 8.2+ Object-Oriented Programming (MVC)**, **PDO MySQL 8.0+**, **Tailwind CSS v4 Standalone**, dan **FPDF Generator (Zero External Dependency)**.

---

## 📋 Prasyarat Sistem
- **XAMPP for Windows** dengan PHP 8.2 atau lebih baru.
- Ekstensi PHP aktif di `php.ini`: `pdo_mysql`, `curl`, `mbstring`, `fileinfo`, `openssl`.
- MySQL / MariaDB versi 8.0+ atau 10.4+.
- Web browser modern (Chrome, Edge, Firefox).

---

## 🚀 Panduan Instalasi di XAMPP Windows (Langkah demi Langkah)

### 1. Salin Proyek ke Direktori `htdocs`
Pindahkan atau salin seluruh folder proyek ini ke dalam direktori XAMPP htdocs:
```text
C:\xampp\htdocs\hse-portal
```

### 2. Duplikasi File Konfigurasi `.env`
Buka **Command Prompt (CMD)** atau **PowerShell**, masuk ke direktori proyek, lalu salin `.env.example` menjadi `.env`:
```cmd
cd C:\xampp\htdocs\hse-portal
copy .env.example .env
```
> **Catatan:** Jangan gunakan nilai default untuk produksi. Pastikan parameter database (`DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_DATABASE=minda_hse_portal`, `DB_USERNAME=minda_hse`, `DB_PASSWORD=`) sesuai dengan konfigurasi Anda (atau gunakan user bawaan XAMPP `root` jika user `minda_hse` belum dibuat).

### 3. Buat Database dan Import Skema di phpMyAdmin
1. Pastikan modul **Apache** dan **MySQL** telah berjalan di XAMPP Control Panel.
2. Buka browser dan akses **phpMyAdmin**: [http://localhost/phpmyadmin/](http://localhost/phpmyadmin/)
3. Klik menu **Databases / Basis data**, masukkan nama basis data: `minda_hse_portal`, pilih collation `utf8mb4_unicode_ci`, lalu klik **Create / Buat**.
4. ⚠️ **LANGKAH KRUSIAL:**
   **PILIH / KLIK NAMA DATABASE `minda_hse_portal` DI PANEL KIRI TERLEBIH DAHULU.**
   *(Skema `database/schema.sql` tidak berisi perintah `CREATE DATABASE`, sehingga database target wajib aktif sebelum import dilakukan).*
5. Setelah database `minda_hse_portal` terbuka, klik tab **Import**.
6. Klik **Browse / Pilih File**, arahkan ke file:
   ```text
   C:\xampp\htdocs\hse-portal\database\schema.sql
   ```
7. Gulir ke bawah dan klik tombol **Import**. Pastikan ke-11 tabel terbentuk (`users`, `hazard_reports`, `hazard_comments`, `audit_logs`, `status_history`, `escalation_history`, `notifications`, `user_notification_states`, `notification_recipients`, `notification_templates`, `weekly_reports`).

### 4. Eksekusi Script Seeder CLI
Jalankan seeder akun resmi dan template notifikasi menggunakan `php.exe` bawaan XAMPP:
```cmd
C:\xampp\php\php.exe bin\seed.php
```
> **Informasi:** Script seeder akan memeriksa akun resmi PT Minda Automotive Indonesia. Untuk akun baru yang di-insert, sistem membuat password acak sekali-tampil dan menandai akun dengan flag `must_change_password = 1`. Catat password yang ditampilkan di layar!

### 5. (Opsional) Eksekusi Script Demo Seeder untuk Pengujian Lokal
Untuk mengisi database lokal dengan data contoh tiket fiktif K3 (jelas bertanda `[DEMO]` dan ID `HZ-2026-0001` s/d `0004`):
```cmd
C:\xampp\php\php.exe bin\seed-demo.php
```

### 6. Akses Aplikasi di Browser
Buka browser Anda dan akses URL:
- **Halaman Beranda (Home):** [http://localhost/hse-portal/public/](http://localhost/hse-portal/public/)
- **Lacak Laporan K3 (Tracker):** [http://localhost/hse-portal/public/tracker](http://localhost/hse-portal/public/tracker)
- **Formulir Laporan Baru:** [http://localhost/hse-portal/public/report](http://localhost/hse-portal/public/report)
- **SOP & Prosedur K3:** [http://localhost/hse-portal/public/workflow](http://localhost/hse-portal/public/workflow)
- **Autentikasi Petugas (Login):** [http://localhost/hse-portal/public/login](http://localhost/hse-portal/public/login)
- **Portal Petugas / Dashboard KPI:** [http://localhost/hse-portal/public/admin](http://localhost/hse-portal/public/admin)

---

## 🔐 7 Akun Resmi Petugas (Role-Based Access Control)

| No | Nama Petugas | Email Resmi | Peran (Role) | Hak Akses |
|---|---|---|---|---|
| 1 | **Purwanto** | `purwanto@mindaauto.co.id` | `hse_admin` | Penuh (Kelola Tiket, Hapus Tiket, Daftar Penerima, Template, Audit Log) |
| 2 | **Mozza Bunga** | `mozza.bunga.tarmuji.07@gmail.com` | `hse_admin` | Penuh (Kelola Tiket, Hapus Tiket, Daftar Penerima, Template, Audit Log) |
| 3 | **Anita** | `anita.hse@mindaauto.co.id` | `hse_officer` | Safety Officer Inspector, investigasi, pembaruan status DFA, catatan K3 |
| 4 | **Asep Permana** | `asep.permana@mindaauto.co.id` | `env_officer` | Environmental & 5S Officer, penanganan temuan limbah/lingkungan |
| 5 | **HRGA Admin** | `hrga_admin@mindaauto.co.id` | `hrga_admin` | Pengadaan APD, fasilitas kerja, logistik, pengobatan & medikal |
| 6 | **HSE Supervisor** | `hse_supervisor@mindaauto.co.id` | `management_supervisor` | Supervisi, penugasan PIC, penyusunan laporan mingguan |
| 7 | **President Director** | `presdir@mindaauto.co.id` | `management_director` | **Read-Only**: Akses pantau dashboard eksekutif, tidak dapat mengubah status |

---

## 🛠️ Migrasi Data dari Supabase / LocalStorage Dump

Jika Anda memiliki data dari instalasi Supabase lama atau dump JSON:

### 1. Migrasi melalui REST API Supabase:
Isi `SUPABASE_SERVICE_ROLE_KEY` di file `.env`, lalu jalankan:
```cmd
C:\xampp\php\php.exe bin\import-supabase.php --url=https://xyz.supabase.co
```
*(Kunci otentikasi dibaca secara aman langsung dari environment variable; opsi `--key` dinonaktifkan).*

### 2. Migrasi melalui File Dump / LocalStorage JSON:
```cmd
C:\xampp\php\php.exe bin\import-supabase.php --file=storage/dump.json
```
Script secara otomatis membungkus tiap tabel dalam transaksi SQL, melakukan validasi ketat terhadap ENUM skema MySQL, dan melaporkan daftar baris yang ditolak jika data tidak konsisten.

---

## ⏰ Cron Job Otomatis (SLA & Laporan Mingguan)

Pada server produksi atau Task Scheduler Windows:
1. **Pemeriksaan Eskalasi SLA (Harian):**
   ```cmd
   C:\xampp\php\php.exe bin\cron-sla.php
   ```
2. **Penyusunan Laporan Mingguan (Jumat 17:00 WIB):**
   ```cmd
   C:\xampp\php\php.exe bin\cron-weekly.php
   ```

---

## 🔒 Catatan Keamanan
- File `.env` dan direktori internal dilindungi oleh aturan `.htaccess` di direktori root dan direktori `public/`.
- Seluruh input formulir diverifikasi menggunakan CSRF token dan sanitasi tipe data.
- Timestamp database disimpan dalam format UTC (`time_zone = '+00:00'`) dan dikonversi secara otomatis ke WIB (*Asia/Jakarta*) saat dirender di antarmuka pengguna.
