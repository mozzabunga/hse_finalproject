-- SQL Schema for PT Minda Automotive Indonesia HSE Hazard & Near Miss Reporting Portal
-- Run this in your Supabase SQL Editor to initialize all tables, relations, and real-time publications.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---------------------------------------------------------
-- 1. USERS TABLE (HSE Personnel and Employees Metadata)
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- Can correspond to Firebase auth ID, Supabase Auth UUID, or customized string
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('hse_admin', 'hse_officer', 'ppe_officer', 'env_officer', 'employee', 'management')),
    department_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-access to users table" ON public.users
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow inserts/updates to users by admins" ON public.users
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

---------------------------------------------------------
-- 2. HAZARD REPORTS TABLE (Core tickets)
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hazard_reports (
    id TEXT PRIMARY KEY, -- Ticket ID (e.g. TICK-2026-XXXX)
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('A', 'B', 'C')),
    status TEXT NOT NULL CHECK (status IN ('NewReport', 'InProgress', 'PendingValidation', 'Completed')),
    department TEXT NOT NULL,
    area TEXT NOT NULL,
    reporter_name TEXT NOT NULL,
    reporter_email TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    assigned_pic_id TEXT,
    assigned_pic_name TEXT,
    assigned_pic_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for hazard_reports
ALTER TABLE public.hazard_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select for hazard_reports" ON public.hazard_reports
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anyone to insert hazard_reports" ON public.hazard_reports
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow officers and admins to update hazard_reports" ON public.hazard_reports
    FOR UPDATE TO authenticated USING (true);

---------------------------------------------------------
-- 3. AUDIT TRAIL TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_trail (
    id TEXT PRIMARY KEY,
    hazard_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select for audit_trail" ON public.audit_trail
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow inserts to audit_trail" ON public.audit_trail
    FOR INSERT TO anon, authenticated WITH CHECK (true);

---------------------------------------------------------
-- 4. NOTIFICATION RECIPIENTS TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_recipients (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('A', 'B', 'C')),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for notification_recipients" ON public.notification_recipients
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow modifications to notification_recipients for admins" ON public.notification_recipients
    FOR ALL TO authenticated USING (true);

---------------------------------------------------------
-- 5. STATUS HISTORY TABLE (DFA State Machine Log)
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.status_history (
    id TEXT PRIMARY KEY,
    hazard_id TEXT NOT NULL,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_by_id TEXT NOT NULL,
    changed_by_name TEXT NOT NULL,
    changed_by_email TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for status_history" ON public.status_history
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow inserts for status_history" ON public.status_history
    FOR INSERT TO anon, authenticated WITH CHECK (true);

---------------------------------------------------------
-- 6. ESCALATION HISTORY TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escalation_history (
    id TEXT PRIMARY KEY,
    hazard_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    action_taken TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.escalation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for escalation_history" ON public.escalation_history
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow inserts for escalation_history" ON public.escalation_history
    FOR INSERT TO anon, authenticated WITH CHECK (true);

---------------------------------------------------------
-- 7. WEEKLY REPORTS TABLE (Automated KPI Filings)
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_reports (
    id TEXT PRIMARY KEY,
    week_starting DATE NOT NULL,
    week_ending DATE NOT NULL,
    total_reports INTEGER NOT NULL DEFAULT 0,
    open_reports INTEGER NOT NULL DEFAULT 0,
    in_progress_reports INTEGER NOT NULL DEFAULT 0,
    completed_reports INTEGER NOT NULL DEFAULT 0,
    overdue_reports INTEGER NOT NULL DEFAULT 0,
    category_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    department_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    area_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    monthly_trend JSONB NOT NULL DEFAULT '{}'::jsonb,
    top_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    avg_resolution_time NUMERIC NOT NULL DEFAULT 0,
    executive_summary TEXT,
    outstanding_hazards JSONB NOT NULL DEFAULT '[]'::jsonb,
    overdue_hazards JSONB NOT NULL DEFAULT '[]'::jsonb,
    file_location_pdf TEXT,
    file_location_excel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for weekly_reports" ON public.weekly_reports
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow updates/inserts for weekly_reports" ON public.weekly_reports
    FOR ALL TO authenticated USING (true);

---------------------------------------------------------
-- 8. NOTIFICATIONS CENTER TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    hazard_id TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select for notifications" ON public.notifications
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow updating read status of notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow inserting notifications" ON public.notifications
    FOR INSERT TO anon, authenticated WITH CHECK (true);

---------------------------------------------------------
-- 9. SEED DEFAULT METADATA (Users, Recipients)
---------------------------------------------------------
-- Insert Default Notification Recipients
INSERT INTO public.notification_recipients (id, category, name, email, role) VALUES
('rec_a1', 'A', 'John Doe (Supervisor)', 'supervisor@hseportal.com', 'Supervisor'),
('rec_a2', 'A', 'HSE Safety Team', 'team@hseportal.com', 'HSE Team'),
('rec_a3', 'A', 'Chief Executive Officer', 'ceo@hseportal.com', 'CEO'),
('rec_a4', 'A', 'Procurement Specialist', 'procurement@hseportal.com', 'Procurement'),
('rec_b1', 'B', 'John Doe (Supervisor)', 'supervisor@hseportal.com', 'Supervisor'),
('rec_b2', 'B', 'HSE Safety Team', 'team@hseportal.com', 'HSE Team'),
('rec_b3', 'B', 'Chief Executive Officer', 'ceo@hseportal.com', 'CEO'),
('rec_b4', 'B', 'Transport PIC', 'transport-pic@hseportal.com', 'Transport PIC'),
('rec_c1', 'C', 'John Doe (Supervisor)', 'supervisor@hseportal.com', 'Supervisor'),
('rec_c2', 'C', 'HSE Safety Team', 'team@hseportal.com', 'HSE Team'),
('rec_c3', 'C', 'Chief Executive Officer', 'ceo@hseportal.com', 'CEO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;

-- Insert Seed Accounts Metadata
INSERT INTO public.users (id, email, name, role, department_id) VALUES
('usr_admin', 'admin@minda.co.id', 'HSE Safety Coordinator', 'hse_admin', 'MAINT'),
('usr_anita', 'anita@minda.co.id', 'Anita (HSE Officer)', 'hse_officer', 'HSE'),
('usr_officer2', 'officer@minda.co.id', 'Reza Pratama (HSE Officer)', 'hse_officer', 'HSE'),
('usr_delianti', 'delianti@minda.co.id', 'Delianti (PPE/APD Officer)', 'ppe_officer', 'HSE'),
('usr_asep', 'asep@minda.co.id', 'Asep Permana (Env & Trans Officer)', 'env_officer', 'HSE'),
('usr_employee', 'employee@minda.co.id', 'Budi Santoso (Production Operator)', 'employee', 'PROD'),
('usr_management', 'management@hseportal.com', 'Operations & KPI Director', 'management', 'ADMIN')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    department_id = EXCLUDED.department_id;

---------------------------------------------------------
-- 10. CONFIGURE REAL-TIME REPLICATION
---------------------------------------------------------
-- Enable Supabase Realtime for required tables
begin;
  -- remove the tables from replication first to avoid duplicate errors
  drop publication if exists supabase_realtime;
  
  -- create publication with all necessary tables for live stream
  create publication supabase_realtime for table 
    public.hazard_reports, 
    public.notifications, 
    public.audit_trail, 
    public.weekly_reports,
    public.status_history,
    public.escalation_history;
commit;
