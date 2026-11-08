-- ============================================================================
-- PT MINDA AUTOMOTIVE INDONESIA - HSE HAZARD & NEAR MISS PORTAL
-- MySQL 8.0+ PRODUCTION SCHEMA (STRICT UTC, INNODB, UTF8MB4)
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- ----------------------------------------------------------------------------
-- 1. TABEL USERS (Autentikasi & Akun Petugas/Karyawan)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `role` ENUM(
    'hse_admin',
    'hse_officer',
    'ppe_officer',
    'hrga_admin',
    'env_officer',
    'management_supervisor',
    'management_director',
    'employee'
  ) NOT NULL DEFAULT 'employee',
  `department_id` VARCHAR(50) NOT NULL DEFAULT 'HSE',
  `position` VARCHAR(100) NULL,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_department` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. TABEL HAZARD_REPORTS (Entitas Inti Laporan K3 & Near Miss)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hazard_reports` (
  `id` VARCHAR(64) NOT NULL COMMENT 'UUID internal atau primary key Supabase',
  `ticket_id` VARCHAR(32) NOT NULL COMMENT 'Format resmi: HZ-YYYY-NNNN',
  `title` VARCHAR(255) NOT NULL COMMENT 'Auto: {Jenis Temuan} - {Area}',
  `description` TEXT NOT NULL COMMENT 'Formatted 7-baris formulir naratif',
  `category` ENUM('A', 'B', 'C') NOT NULL COMMENT 'Hasil normalisasi/klasifikasi IK-01',
  `hazard_category` VARCHAR(100) NULL COMMENT 'Label taksonomi spesifik',
  `status` ENUM(
    'NewReport',
    'PendingValidation',
    'UnderInvestigation',
    'ActionRequired',
    'WaitingProcurement',
    'Implementation',
    'Completed',
    'Resolved'
  ) NOT NULL DEFAULT 'NewReport',
  `dfa_status` VARCHAR(50) NOT NULL DEFAULT 'PendingValidation',
  `priority` VARCHAR(20) NOT NULL DEFAULT 'Medium',
  `department` VARCHAR(100) NOT NULL,
  `area` VARCHAR(150) NOT NULL,
  `detail_location` VARCHAR(255) NULL,
  `incident_date` DATE NOT NULL,
  `reporter_name` VARCHAR(150) NOT NULL,
  `reporter_email` VARCHAR(191) NOT NULL,
  `employee_id` VARCHAR(50) NOT NULL,
  `position` VARCHAR(100) NULL,
  `potential_impact` TEXT NULL,
  `injury_status` VARCHAR(100) NULL,
  `temporary_action` TEXT NULL,
  `current_condition` VARCHAR(100) NULL,
  `reported_to_leader` VARCHAR(50) NULL,
  `suggestion` TEXT NULL,
  `photo_evidence_url` VARCHAR(500) NULL,
  `assigned_to` VARCHAR(64) NULL COMMENT 'UUID petugas terdisposisi',
  `assigned_pic_id` VARCHAR(64) NULL,
  `assigned_pic_name` VARCHAR(150) NULL,
  `assigned_pic_email` VARCHAR(191) NULL,
  `severity` TINYINT NOT NULL DEFAULT 2,
  `likelihood` TINYINT NOT NULL DEFAULT 2,
  `risk_score` TINYINT NOT NULL DEFAULT 4,
  `risk_level` ENUM('Low', 'Moderate', 'High', 'Extreme') NOT NULL DEFAULT 'Low',
  `otp_required` TINYINT(1) NOT NULL DEFAULT 0,
  `otp_program_name` VARCHAR(255) NULL,
  `additional_control` TEXT NULL,
  `officer_comments` TEXT NULL,
  `officer_reviewed` TINYINT(1) NOT NULL DEFAULT 0,
  `officer_review_date` DATETIME NULL,
  `reminder_3d_sent` TINYINT(1) NOT NULL DEFAULT 0,
  `reminder_7d_sent` TINYINT(1) NOT NULL DEFAULT 0,
  `reminder_14d_sent` TINYINT(1) NOT NULL DEFAULT 0,
  `reminder_30d_sent` TINYINT(1) NOT NULL DEFAULT 0,
  `resolved_at` DATETIME NULL,
  `closed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_hazard_ticket_id` (`ticket_id`),
  KEY `idx_hazard_status` (`status`),
  KEY `idx_hazard_category` (`category`),
  KEY `idx_hazard_created_at` (`created_at`),
  KEY `idx_hazard_incident_date` (`incident_date`),
  KEY `idx_hazard_department` (`department`),
  KEY `idx_hazard_assigned_pic` (`assigned_pic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. TABEL HAZARD_COMMENTS (Diskusi Internal & Tindak Lanjut Petugas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hazard_comments` (
  `id` VARCHAR(64) NOT NULL,
  `hazard_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `user_name` VARCHAR(150) NOT NULL,
  `user_role` VARCHAR(50) NOT NULL,
  `comment` TEXT NOT NULL,
  `is_internal_only` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comment_hazard_id` (`hazard_id`),
  KEY `idx_comment_user_id` (`user_id`),
  CONSTRAINT `fk_comment_hazard` FOREIGN KEY (`hazard_id`) REFERENCES `hazard_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. TABEL AUDIT_LOGS (Jejak Rekam Aktivitas & Perubahan Status Tiket)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) NOT NULL,
  `hazard_id` VARCHAR(64) NULL COMMENT 'Nullable: system logins or admin events may not be bound to a single hazard',
  `user_id` VARCHAR(64) NOT NULL,
  `user_email` VARCHAR(191) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_hazard_id` (`hazard_id`),
  KEY `idx_audit_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. TABEL STATUS_HISTORY (State Machine DFA Transition Audit)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `status_history` (
  `id` VARCHAR(64) NOT NULL,
  `hazard_id` VARCHAR(64) NOT NULL,
  `previous_status` VARCHAR(50) NOT NULL,
  `new_status` VARCHAR(50) NOT NULL,
  `changed_by_id` VARCHAR(64) NOT NULL,
  `changed_by_name` VARCHAR(150) NOT NULL,
  `changed_by_email` VARCHAR(191) NOT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status_hist_hazard` (`hazard_id`),
  CONSTRAINT `fk_status_hist_hazard` FOREIGN KEY (`hazard_id`) REFERENCES `hazard_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. TABEL ESCALATION_HISTORY (Eskalasi Otomatis Tiket Melewati SLA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `escalation_history` (
  `id` VARCHAR(64) NOT NULL,
  `hazard_id` VARCHAR(64) NOT NULL,
  `level` INT NOT NULL DEFAULT 1,
  `action_taken` VARCHAR(255) NOT NULL,
  `recipient_email` VARCHAR(191) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_escalation_hazard` (`hazard_id`),
  CONSTRAINT `fk_escalation_hazard` FOREIGN KEY (`hazard_id`) REFERENCES `hazard_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. TABEL NOTIFICATIONS (Pusat Notifikasi Global & In-App)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(64) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `hazard_id` VARCHAR(64) NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Status baca global default',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_hazard_id` (`hazard_id`),
  KEY `idx_notif_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. TABEL USER_NOTIFICATION_STATES (Personalisasi Status Baca/Hapus per User)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_notification_states` (
  `user_id` VARCHAR(64) NOT NULL,
  `notification_id` VARCHAR(64) NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 1,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `read_at` DATETIME NULL,
  PRIMARY KEY (`user_id`, `notification_id`),
  KEY `idx_user_notif_state_notif` (`notification_id`),
  CONSTRAINT `fk_user_notif_state_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_notif_state_notif` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. TABEL NOTIFICATION_RECIPIENTS (Daftar Penerima Email & Distribusi K3)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notification_recipients` (
  `id` VARCHAR(64) NOT NULL,
  `category` ENUM('ALWAYS', 'A', 'B', 'C') NOT NULL DEFAULT 'ALWAYS',
  `name` VARCHAR(150) NOT NULL,
  `position` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_mandatory` TINYINT(1) NOT NULL DEFAULT 0,
  `mode` ENUM('all', 'keyword') NOT NULL DEFAULT 'all',
  `keywords` JSON NOT NULL,
  `notification_events` JSON NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_recipient_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. TABEL NOTIFICATION_TEMPLATES (Template Email & Pesan dengan Placeholders)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notification_templates` (
  `id` VARCHAR(50) NOT NULL COMMENT 'assigned, status_updated, overdue, completed',
  `name` VARCHAR(150) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `placeholders` JSON NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. TABEL WEEKLY_REPORTS (Arsip Laporan Mingguan & Metrik Eksekutif)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `weekly_reports` (
  `id` VARCHAR(64) NOT NULL,
  `week_starting` DATE NOT NULL,
  `week_ending` DATE NOT NULL,
  `total_reports` INT NOT NULL DEFAULT 0,
  `open_reports` INT NOT NULL DEFAULT 0,
  `in_progress_reports` INT NOT NULL DEFAULT 0,
  `completed_reports` INT NOT NULL DEFAULT 0,
  `overdue_reports` INT NOT NULL DEFAULT 0,
  `avg_resolution_time` DECIMAL(6,2) NOT NULL DEFAULT 0.00 COMMENT 'Rata-rata dalam satuan HARI',
  `category_stats` JSON NOT NULL,
  `department_stats` JSON NOT NULL,
  `area_stats` JSON NOT NULL,
  `monthly_trend` JSON NOT NULL,
  `top_categories` JSON NOT NULL,
  `outstanding_hazards` JSON NOT NULL,
  `overdue_hazards` JSON NOT NULL,
  `executive_summary` TEXT NULL,
  `file_location_pdf` VARCHAR(255) NULL,
  `file_location_excel` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_weekly_period` (`week_starting`, `week_ending`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
