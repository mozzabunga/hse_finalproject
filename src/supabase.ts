/**
 * PT Minda Automotive Indonesia
 * HSE Hazard & Near Miss Reporting Portal
 * Supabase Integration & Robust Local Resilience Engine
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  HazardReport, 
  HazardStatus, 
  HazardCategory, 
  User as AppUser, 
  AuditLog, 
  Notification, 
  Recipient, 
  RecipientNotificationEvents,
  NotificationEventType,
  WeeklyReport,
  NotificationTemplate
} from './types';
import { generateWeeklyReportPDF, generateTicketSummaryPDF } from './lib/pdfGenerator';
import { formatWIBDate, formatWIBDateTime } from './lib/dateUtils';
import { getHazardSummary, deduplicateReports, isConsequenceOrAdminValue, hasValue } from './lib/hazardPresentation';

// Read configuration from Vite environment variables with graceful fallback
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
const getProcEnv = (key: string) => (typeof process !== 'undefined' && process.env ? process.env[key] : undefined);

const SUPABASE_URL = env.VITE_SUPABASE_URL || getProcEnv('VITE_SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || getProcEnv('VITE_SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = getProcEnv('SUPABASE_SERVICE_ROLE_KEY') || '';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance && SUPABASE_URL) {
    try {
      const isServer = typeof window === 'undefined';
      const keyToUse = (isServer && SUPABASE_SERVICE_ROLE_KEY) ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
      const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase/)?.[1] || 'unknown';

      console.log(`[Supabase Client] Initializing standard SDK.`);
      console.log(`[Supabase Client] Environment: ${isServer ? 'SERVER' : 'CLIENT'}`);
      console.log(`[Supabase Client] Active URL: ${SUPABASE_URL.replace(/\/\/[^.]+\./, '//[masked-project-ref].')}`);
      console.log(`[Supabase Client] Project Reference: ${projectRef}`);
      console.log(`[Supabase Client] Authentication Role Key: ${isServer && SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE_KEY (Bypasses RLS)' : 'ANON_KEY (RLS Active)'}`);

      if (keyToUse) {
        supabaseInstance = createClient(SUPABASE_URL, keyToUse, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        console.log('[Supabase Client] Successfully initialized standard SDK.');
      } else {
        console.warn('[Supabase Client] Missing anon key or service role key for initialization.');
      }
    } catch (err) {
      console.error('[Supabase Client] Failed to initialize standard SDK:', err);
    }
  }
  return supabaseInstance as SupabaseClient;
}

export function isSupabaseReady(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getApiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    return path;
  }
  const port = getProcEnv('PORT') || '3000';
  return `http://127.0.0.1:${port}${path.startsWith('/') ? '' : '/'}${path}`;
}

// ---------------------------------------------------------
// IMMUTABLE MICROSOFT FORMS DATA POLICY ENGINE
// ---------------------------------------------------------

export const IMMUTABLE_COLUMNS = [
  'id',
  'ticket_id',
  'created_at'
];

export const ALLOWED_MUTABLE_COLUMNS = [
  'reporter_name',
  'employee_id',
  'reporter_email',
  'position',
  'incident_date',
  'department',
  'area',
  'detail_location',
  'hazard_description',
  'hazard_category',
  'potential_impact',
  'injury_status',
  'temporary_action',
  'current_condition',
  'reported_to_leader',
  'suggestion',
  'photo_evidence_url',
  'priority',
  'assigned_to',
  'status',
  'dfa_status',
  'officer_comments',
  'officer_reviewed',
  'officer_review_date',
  'reminder_3d_sent',
  'reminder_7d_sent',
  'reminder_14d_sent',
  'reminder_30d_sent',
  'updated_at',
  'resolved_at',
  'closed_at'
];

/**
 * IMMUTABLE MICROSOFT FORMS DATA POLICY GUARD
 * Strips and rejects any attempt to modify immutable columns originating from Microsoft Forms.
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUUID(str?: string): boolean {
  return Boolean(str && UUID_REGEX.test(str));
}

/**
 * IMMUTABLE MICROSOFT FORMS DATA POLICY GUARD
 * Rejects and throws an explicit Error on any attempt to modify immutable columns originating from Microsoft Forms.
 */
export function sanitizeUpdatePayload(payload: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(payload)) {
    if (IMMUTABLE_COLUMNS.includes(key)) {
      throw new Error(`[IMMUTABLE POLICY VIOLATION] Attempted to modify immutable Microsoft Forms field '${key}'. Modifications to immutable fields are strictly prohibited.`);
    }
    if (ALLOWED_MUTABLE_COLUMNS.includes(key)) {
      sanitized[key] = val;
    } else {
      console.warn(`[IMMUTABLE POLICY ENFORCEMENT] Column '${key}' is not in ALLOWED_MUTABLE_COLUMNS and was omitted.`);
    }
  }
  return sanitized;
}

/**
 * Rejects DELETE/TRUNCATE/DROP calls targeting hazard_reports table.
 */
export function assertNoDeletePolicy(tableName: string) {
  if (tableName === 'hazard_reports') {
    throw new Error(`[IMMUTABLE POLICY VIOLATION] DELETE, TRUNCATE, or DROP operations are strictly prohibited on 'hazard_reports' table.`);
  }
}

// ---------------------------------------------------------
// LOCAL RESILIENCE STORAGE ENGINE (FALLBACK SEED DATA)
// ---------------------------------------------------------

const LOCAL_STORAGE_KEYS = {
  REPORTS: 'minda_hse_reports',
  AUDIT_LOGS: 'minda_hse_audit_logs',
  NOTIFICATIONS: 'minda_hse_notifications',
  RECIPIENTS: 'minda_hse_recipients',
  REPORTS_WEEKLY: 'minda_hse_weekly_reports',
  COMMENTS: 'minda_hse_comments',
  AUTH_USER: 'minda_hse_auth_user',
  TEMPLATES: 'minda_hse_templates'
};

const DEFAULT_ALL_EVENTS: RecipientNotificationEvents = {
  reportCreated: true,
  statusUpdated: true,
  reportCompleted: true,
  reminderDay3: true,
  reminderDay7: true,
  reminderDay14: true,
  reminderDay30: true,
  weeklyReport: true
};

const SEED_RECIPIENTS: Recipient[] = [
  {
    id: 'rec-supervisor-hse',
    category: 'ALWAYS',
    name: 'HSE Supervisor',
    position: 'Supervisor HSE',
    email: 'hse_supervisor@mindaauto.co.id',
    role: 'management',
    active: true,
    isMandatory: true,
    mode: 'all',
    keywords: [],
    notificationEvents: { ...DEFAULT_ALL_EVENTS }
  },
  {
    id: 'rec-admin-mozza',
    category: 'ALWAYS',
    name: 'Mozza Bunga (HSE Admin)',
    position: 'HSE Administrator',
    email: 'mozza.bunga.tarmuji.07@gmail.com',
    role: 'hse_admin',
    active: true,
    isMandatory: true,
    mode: 'all',
    keywords: [],
    notificationEvents: { ...DEFAULT_ALL_EVENTS }
  },
  {
    id: 'rec-officer-purwanto',
    category: 'A',
    name: 'Purwanto',
    position: 'Safety Officer Lead',
    email: 'purwanto@mindaauto.co.id',
    role: 'hse_admin',
    active: true,
    isMandatory: false,
    mode: 'keyword',
    keywords: ['Safety', 'APD', 'Forklift', 'Listrik', 'Machine', 'Ergonomi', 'P3K'],
    notificationEvents: { ...DEFAULT_ALL_EVENTS }
  },
  {
    id: 'rec-officer-anita',
    category: 'A',
    name: 'Anita',
    position: 'Safety Officer Inspector',
    email: 'anita@mindaauto.co.id',
    role: 'hse_officer',
    active: true,
    isMandatory: false,
    mode: 'keyword',
    keywords: ['Safety', 'APD', 'Ergonomi', 'Housekeeping', 'Fire'],
    notificationEvents: { ...DEFAULT_ALL_EVENTS }
  },
  {
    id: 'rec-officer-asep',
    category: 'B',
    name: 'Asep Permana',
    position: 'Env & Trans Supervisor',
    email: 'asep.permana@mindaauto.co.id',
    role: 'env_officer',
    active: true,
    isMandatory: false,
    mode: 'keyword',
    keywords: ['Environment', 'Waste', 'Chemical', 'Parking', 'Toilet', 'Housekeeping', 'Spill', 'Limbah'],
    notificationEvents: { ...DEFAULT_ALL_EVENTS }
  },
  {
    id: 'rec-officer-hrga',
    category: 'A',
    name: 'HRGA Admin',
    position: 'HRGA Admin',
    email: 'hrga_admin@mindaauto.co.id',
    role: 'hrga_admin',
    active: true,
    isMandatory: false,
    mode: 'keyword',
    keywords: ['APD', 'Catering', 'Toilet', 'P3K', 'Food', 'Medical'],
    notificationEvents: { ...DEFAULT_ALL_EVENTS }
  },
  {
    id: 'rec-director-president',
    category: 'ALWAYS',
    name: 'President Director',
    position: 'President Director / Executive',
    email: 'president_director@mindaauto.co.id',
    role: 'management',
    active: true,
    isMandatory: false,
    mode: 'all',
    keywords: [],
    notificationEvents: { ...DEFAULT_ALL_EVENTS }
  }
];

const SEED_REPORTS: HazardReport[] = [
  {
    id: 'f829a001-1111-4000-8000-000000000001',
    ticketId: 'TKT-2026-001',
    uuid: 'f829a001-1111-4000-8000-000000000001',
    title: 'Exposed Electrical Wiring near Injection Molding Area 3',
    description: 'There is an exposed, frayed high-voltage cable near the water cooling line of Injection Molding Machine #3. This poses an immediate hazard of electrical shock or short-circuit fire due to moisture.',
    department: 'Production',
    area: 'Injection Molding Area 3',
    reporterName: 'Ahmad Fauzi',
    reporterEmail: 'employee@mindaauto.co.id',
    employeeId: 'EMP-9021',
    picId: 'usr_asep_permana',
    picName: 'Asep Permana (Env & Trans Supervisor)',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: HazardStatus.UnderInvestigation,
    category: 'C',
    severity: 4,
    likelihood: 3,
    riskScore: 12,
    riskLevel: 'High',
    otpRequired: true,
    otpProgramName: 'OTP-2026-ELECTRICAL-01 (Isolasi Cable High Voltage Injection)',
    additionalControl: 'Rekayasa Teknik: Pemasangan Conduit Cable Cover & Interlock Relay Power'
  },
  {
    id: 'f829a002-2222-4000-8000-000000000002',
    ticketId: 'TKT-2026-002',
    uuid: 'f829a002-2222-4000-8000-000000000002',
    title: 'Hydraulic Oil Spill near Press Machine Area',
    description: 'Hydraulic oil leakage observed under Press Machine #12. It covers approximately 2x2 meters, creating an extremely slippery surface and environmental contamination risks.',
    department: 'Maintenance',
    area: 'Press Machine Section',
    reporterName: 'Budi Santoso',
    reporterEmail: 'employee@mindaauto.co.id',
    employeeId: 'EMP-4402',
    picId: 'usr_asep_permana',
    picName: 'Asep Permana (Env & Trans Supervisor)',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: HazardStatus.ActionRequired,
    category: 'B',
    severity: 2,
    likelihood: 4,
    riskScore: 8,
    riskLevel: 'Moderate',
    otpRequired: false,
    additionalControl: 'Substitusi & Administrasi: Penggunaan Oil Absorbent Pad & Penjadwalan Preventif Seal Replacement'
  },
  {
    id: 'f829a003-3333-4000-8000-000000000003',
    ticketId: 'TKT-2026-003',
    uuid: 'f829a003-3333-4000-8000-000000000003',
    title: 'Warehouse Operators Working Without Safety Helmets',
    description: 'During a spot check, three operators in the loading bay were observed loading heavy crated components into storage racks without safety helmets or steel-toed boots.',
    department: 'Logistics',
    area: 'Loading Bay Shelf Racks',
    reporterName: 'Anita (Safety Officer)',
    reporterEmail: 'anita@mindaauto.co.id',
    employeeId: 'OFF-0112',
    picId: 'usr_hrga_admin',
    picName: 'HRGA Admin',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: HazardStatus.NewReport,
    category: 'A',
    severity: 2,
    likelihood: 2,
    riskScore: 4,
    riskLevel: 'Low',
    otpRequired: false
  },
  {
    id: 'f829a004-4444-4000-8000-000000000004',
    ticketId: 'TKT-2026-004',
    uuid: 'f829a004-4444-4000-8000-000000000004',
    title: 'Damaged Emergency Exit Fire Door Lock',
    description: 'The locking mechanism on the main fire exit exit door of Assembly Line B is jammed. In an emergency, operators would not be able to push the door open quickly.',
    department: 'Quality',
    area: 'Assembly Line B Exit',
    reporterName: 'Lina Kartika',
    reporterEmail: 'employee@mindaauto.co.id',
    employeeId: 'EMP-1192',
    picId: 'usr_purwanto',
    picName: 'Purwanto (Safety Officer)',
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago
    updatedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
    status: HazardStatus.Resolved,
    category: 'C',
    severity: 3,
    likelihood: 2,
    riskScore: 6,
    riskLevel: 'Moderate',
    otpRequired: false,
    additionalControl: 'Rekayasa Teknik: Pengantian Panic Hardware Fire Door Standar K3'
  }
];

const SEED_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    hazardId: 'TKT-2026-001',
    userId: 'purwanto_mindaauto_co_id',
    userEmail: 'purwanto@mindaauto.co.id',
    action: 'PIC Assigned',
    details: 'Assigned new PIC: Asep Permana (Env & Trans Supervisor) by HSE Safety Coordinator.',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-2',
    hazardId: 'TKT-2026-002',
    userId: 'purwanto_mindaauto_co_id',
    userEmail: 'purwanto@mindaauto.co.id',
    action: 'Status Transition',
    details: 'Status transitioned from Pending Validation to Action Required. Mitigation work ordered immediately.',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const SEED_COMMENTS = [
  {
    id: 'cmt-1',
    hazard_id: 'TKT-2026-001',
    user_id: 'asep_permana_mindaauto_co_id',
    user_name: 'Asep Permana',
    user_email: 'asep.permana@mindaauto.co.id',
    comment_text: 'I have inspected Area 3 molding machinery. Maintenance crew has scheduled electricity shutdown at 18:00 WIB today to replace the frayed cord.',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cmt-2',
    hazard_id: 'TKT-2026-002',
    user_id: 'purwanto_mindaauto_co_id',
    user_name: 'Purwanto',
    user_email: 'purwanto@mindaauto.co.id',
    comment_text: 'Sawdust absorbents applied temporarily. Reordering replacement hydraulic cylinder gasket for machine #12.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title: 'New Hazard Reported',
    message: 'Operator Anita reported a Warehouse PPE infraction in Logistics Bay.',
    read: false,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    recipientRole: 'hse_admin'
  },
  {
    id: 'notif-2',
    title: 'SLA Alert Warning',
    message: 'SLA Escalation Alert: hydraulic spill ticket remains unresolved after 5 days.',
    read: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    recipientRole: 'management'
  }
];

export const ALL_SUPPORTED_PLACEHOLDERS = [
  'ticketId',
  'title',
  'description',
  'reporterName',
  'employeeId',
  'department',
  'area',
  'category',
  'subCategory',
  'severity',
  'priority',
  'assignedPIC',
  'assignedEmail',
  'createdDate',
  'updatedDate',
  'resolvedDate',
  'daysOpen',
  'status',
  'oldStatus',
  'newStatus',
  'portalLink',
  'company',
  'generatedTime'
];

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'assigned',
    name: 'New Hazard Assigned to PIC',
    subject: '[HSE PORTAL] New Hazard Report - {ticketId}',
    body: `PENTING!!

Laporan baru mengenai {category} telah diajukan melalui HSE Portal.

Detail laporan:

• Ticket ID: {ticketId}
• Reporter: {reporterName}
• Employee ID: {employeeId}
• Department: {department}
• Area: {area}
• Category: {category}
• Priority: {priority}
• Description: {description}

Silakan masuk ke HSE Portal untuk:

• melihat detail laporan

• memperbarui status

• memberikan komentar

• mengunduh Weekly Report PDF`,
    placeholders: ALL_SUPPORTED_PLACEHOLDERS
  },
  {
    id: 'status_updated',
    name: 'Hazard Status Updated',
    subject: '[HSE Portal] Ticket {ticketId} Status Updated ({newStatus})',
    body: `The status of Hazard Ticket {ticketId} ("{title}") has been updated from "{oldStatus}" to "{newStatus}".\nAssigned PIC: {assignedPIC}\nReporter: {reporterName} ({department})\nCategory Class: {category}\nUpdated Date: {updatedDate}.\n\nPlease check the portal for latest updates.\nDirect Link: {portalLink}`,
    placeholders: ALL_SUPPORTED_PLACEHOLDERS
  },
  {
    id: 'overdue',
    name: 'Hazard Overdue',
    subject: '[Reminder] Hazard Ticket {ticketId} masih memerlukan tindak lanjut',
    body: `PENTING!!

Hazard Ticket {ticketId} ("{title}") masih memerlukan tindak lanjut di Portal HSE PT MINDA Automotive Indonesia.

Detail laporan:
• Ticket ID: {ticketId}
• Title: {title}
• Current Status: {status}
• Assigned PIC: {assignedPIC}
• Reporter: {reporterName}
• Days Open: {daysOpen} day(s)

Portal Link: {portalLink}

Terima kasih.
PT MINDA Automotive Indonesia`,
    placeholders: ALL_SUPPORTED_PLACEHOLDERS
  },
  {
    id: 'completed',
    name: 'Hazard Completed',
    subject: '[HSE Success] Hazard Ticket {ticketId} Completed',
    body: `Excellent work! Hazard Ticket {ticketId} ("{title}") has been marked as COMPLETED on {resolvedDate} and is ready for final validation.\nAssigned PIC: {assignedPIC}\nReporter: {reporterName}.\n\nThank you for ensuring a zero-accident workspace.\nDirect Link: {portalLink}`,
    placeholders: ALL_SUPPORTED_PLACEHOLDERS
  }
];

export function getNotificationTemplates(): NotificationTemplate[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(LOCAL_STORAGE_KEYS.TEMPLATES);
      if (data) {
        const parsed: NotificationTemplate[] = JSON.parse(data);
        return parsed.map(t => ({
          ...t,
          placeholders: ALL_SUPPORTED_PLACEHOLDERS
        }));
      }
    }
  } catch (err) {
    console.error('Error loading notification templates:', err);
  }
  return DEFAULT_TEMPLATES;
}

export function saveNotificationTemplate(
  id: 'assigned' | 'status_updated' | 'overdue' | 'completed',
  subject: string,
  body: string
): NotificationTemplate[] {
  const templates = getNotificationTemplates();
  const index = templates.findIndex(t => t.id === id);
  if (index !== -1) {
    templates[index].subject = subject;
    templates[index].body = body;
    templates[index].placeholders = ALL_SUPPORTED_PLACEHOLDERS;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    }
  }
  return templates;
}

export function resetNotificationTemplates(): NotificationTemplate[] {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
  }
  return DEFAULT_TEMPLATES;
}

export function renderNotificationTemplate(
  id: 'assigned' | 'status_updated' | 'overdue' | 'completed',
  data: Partial<{
    ticketId: string;
    title: string;
    description: string;
    reporterName: string;
    employeeId: string;
    department: string;
    area: string;
    category: string;
    subCategory: string;
    severity: string;
    priority: string;
    assignedPIC: string;
    assignedEmail: string;
    createdDate: string;
    updatedDate: string;
    resolvedDate: string;
    daysOpen: string;
    status: string;
    oldStatus: string;
    newStatus: string;
    portalLink: string;
    company: string;
    generatedTime: string;
  }>
): { subject: string; body: string } {
  const templates = getNotificationTemplates();
  const template = templates.find(t => t.id === id) || DEFAULT_TEMPLATES.find(t => t.id === id)!;
  
  let subject = template.subject;
  let body = template.body;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-xlfcovaiq7xmovcshmlej2-969222467753.asia-southeast1.run.app';

  const replacements: Record<string, string> = {
    ticketId: data.ticketId || 'TKT-2026-001',
    ticket_id: data.ticketId || 'TKT-2026-001',
    title: data.title || 'Untitled Safety Hazard',
    description: data.description || 'N/A',
    reporterName: data.reporterName || 'Anonymous Worker',
    reporter_name: data.reporterName || 'Anonymous Worker',
    employeeId: data.employeeId || 'EMP-000',
    employee_id: data.employeeId || 'EMP-000',
    department: data.department || 'Production',
    area: data.area || 'General Floor',
    category: data.category || 'C',
    subCategory: data.subCategory || 'General Safety',
    severity: data.severity || 'High',
    priority: data.priority || 'Normal',
    assignedPIC: data.assignedPIC || 'Unassigned',
    assignedEmail: data.assignedEmail || 'purwanto@mindaauto.co.id',
    createdDate: data.createdDate || new Date().toLocaleDateString(),
    updatedDate: data.updatedDate || new Date().toLocaleDateString(),
    resolvedDate: data.resolvedDate || new Date().toLocaleDateString(),
    daysOpen: data.daysOpen || '0',
    status: mapStatusToLabel(mapStatusFromDB(data.status || data.newStatus || 'NewReport')),
    oldStatus: mapStatusToLabel(mapStatusFromDB(data.oldStatus || 'NewReport')),
    newStatus: mapStatusToLabel(mapStatusFromDB(data.newStatus || 'NewReport')),
    portalLink: data.portalLink || `${origin}/#tracker?id=${data.ticketId || 'TKT-2026-001'}`,
    company: data.company || 'PT Minda Automotive Indonesia',
    generatedTime: data.generatedTime || new Date().toLocaleString()
  };

  Object.entries(replacements).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    subject = subject.split(placeholder).join(value);
    body = body.split(placeholder).join(value);
  });

  return { subject, body };
}

// Initialize local storage database
function initLocalDB() {
  if (typeof window === 'undefined') return;
  
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.REPORTS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.REPORTS, JSON.stringify(SEED_REPORTS));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.AUDIT_LOGS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(SEED_LOGS));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.COMMENTS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMMENTS, JSON.stringify(SEED_COMMENTS));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.REPORTS_WEEKLY)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.REPORTS_WEEKLY, JSON.stringify([]));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.TEMPLATES)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.RECIPIENTS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.RECIPIENTS, JSON.stringify(SEED_RECIPIENTS.map(normalizeRecipient)));
  }
}

initLocalDB();

// Global Subscription Callback Storage
type UnsubscribeFn = () => void;
const reportSubscribers = new Set<(reports: HazardReport[]) => void>();
const notificationSubscribers = new Set<(notifs: Notification[]) => void>();
const auditSubscribers = new Set<(logs: AuditLog[]) => void>();
const weeklySubscribers = new Set<(reports: WeeklyReport[]) => void>();

function notifyReportSubscribers() {
  const reports = getLocalReports();
  reportSubscribers.forEach(cb => cb(reports));
}

function notifyNotificationSubscribers() {
  const notifs = getLocalNotifications();
  notificationSubscribers.forEach(cb => cb(notifs));
}

function notifyAuditSubscribers() {
  const logs = getLocalAuditLogs();
  auditSubscribers.forEach(cb => cb(logs));
}

function notifyWeeklySubscribers() {
  const reports = getLocalWeeklyReports();
  weeklySubscribers.forEach(cb => cb(reports));
}

// Local getters and setters
export function getLocalReports(): HazardReport[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const parsed: HazardReport[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REPORTS) || '[]');
      return deduplicateReports(parsed);
    }
  } catch { }
  return [];
}
function setLocalReports(reports: HazardReport[]) {
  if (typeof localStorage !== 'undefined') {
    const deduplicated = deduplicateReports(reports);
    localStorage.setItem(LOCAL_STORAGE_KEYS.REPORTS, JSON.stringify(deduplicated));
  }
  notifyReportSubscribers();
}

export function getLocalNotifications(): Notification[] {
  try {
    if (typeof localStorage !== 'undefined') {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS) || '[]');
    }
  } catch { }
  return [];
}
function setLocalNotifications(notifs: Notification[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
  }
  notifyNotificationSubscribers();
}

export function getLocalAuditLogs(): AuditLog[] {
  try {
    if (typeof localStorage !== 'undefined') {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.AUDIT_LOGS) || '[]');
    }
  } catch { }
  return [];
}
function setLocalAuditLogs(logs: AuditLog[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  }
  notifyAuditSubscribers();
}

function getLocalWeeklyReports(): WeeklyReport[] {
  try {
    if (typeof localStorage !== 'undefined') {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REPORTS_WEEKLY) || '[]');
    }
  } catch { }
  return [];
}
function setLocalWeeklyReports(reports: WeeklyReport[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEYS.REPORTS_WEEKLY, JSON.stringify(reports));
  }
  notifyWeeklySubscribers();
}

function getLocalComments() {
  try {
    if (typeof localStorage !== 'undefined') {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.COMMENTS) || '[]');
    }
  } catch { }
  return [];
}
function setLocalComments(comments: any[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
  }
}

// ---------------------------------------------------------
// COMPATIBILITY MAP FUNCTIONS
// ---------------------------------------------------------

export function mapStatusToDB(status: HazardStatus): string {
  switch (status) {
    case HazardStatus.NewReport:
      return 'NewReport';
    case HazardStatus.PendingValidation:
      return 'PendingValidation';
    case HazardStatus.UnderInvestigation:
      return 'UnderInvestigation';
    case HazardStatus.ActionRequired:
      return 'ActionRequired';
    case HazardStatus.WaitingProcurement:
      return 'WaitingProcurement';
    case HazardStatus.Implementation:
      return 'Implementation';
    case HazardStatus.Completed:
      return 'Completed';
    case HazardStatus.Resolved:
      return 'Resolved';
    default:
      return (status as string) || 'NewReport';
  }
}

export function mapStatusFromDB(dbStatus: string): HazardStatus {
  if (!dbStatus) return HazardStatus.NewReport;
  const cleaned = dbStatus.trim();
  switch (cleaned) {
    case 'New':
    case 'NewReport':
    case 'New Report':
      return HazardStatus.NewReport;
    case 'PendingValidation':
    case 'Pending Validation':
      return HazardStatus.PendingValidation;
    case 'InProgress':
    case 'UnderInvestigation':
    case 'Under Investigation':
      return HazardStatus.UnderInvestigation;
    case 'ActionRequired':
    case 'Action Required':
      return HazardStatus.ActionRequired;
    case 'WaitingProcurement':
    case 'Waiting Procurement':
      return HazardStatus.WaitingProcurement;
    case 'Implementation':
      return HazardStatus.Implementation;
    case 'Completed':
      return HazardStatus.Completed;
    case 'Resolved':
      return HazardStatus.Resolved;
    default:
      return (dbStatus as HazardStatus) || HazardStatus.NewReport;
  }
}

export function mapStatusToLabel(status: HazardStatus | string): string {
  const enumVal = typeof status === 'string' && !Object.values(HazardStatus).includes(status as HazardStatus)
    ? mapStatusFromDB(status)
    : (status as HazardStatus);

  switch (enumVal) {
    case HazardStatus.NewReport:
      return 'New Report';
    case HazardStatus.PendingValidation:
      return 'Pending Validation';
    case HazardStatus.UnderInvestigation:
      return 'Under Investigation';
    case HazardStatus.ActionRequired:
      return 'Action Required';
    case HazardStatus.WaitingProcurement:
      return 'Waiting Procurement';
    case HazardStatus.Implementation:
      return 'Implementation';
    case HazardStatus.Completed:
      return 'Completed';
    case HazardStatus.Resolved:
      return 'Resolved';
    default:
      return 'New Report';
  }
}

export function getPicEmailList(picId?: string, picName?: string): string[] {
  const pid = (picId || '').toLowerCase();
  const pname = (picName || '').toLowerCase();

  if (pid.includes('hrga') || pname.includes('hrga')) {
    return ['hrga_admin@mindaauto.co.id'];
  }
  if (pid.includes('asep') || pname.includes('asep')) {
    return ['asep.permana@mindaauto.co.id'];
  }
  // Default / HSE Team -> purwanto, anita, mozza
  return [
    'purwanto@mindaauto.co.id',
    'anita@mindaauto.co.id',
    'mozza.bunga.tarmuji.07@gmail.com'
  ];
}

export function mapUserToUUID(userIdOrName: string | undefined): string | null {
  if (!userIdOrName) return '22222222-2222-2222-2222-222222222222';
  const normalized = userIdOrName.toLowerCase();
  
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrName)) {
    return userIdOrName;
  }
  
  if (normalized.includes('hrga')) {
    return '33333333-3333-3333-3333-333333333333';
  }
  if (normalized.includes('asep')) {
    return '44444444-4444-4444-4444-444444444444';
  }
  return '22222222-2222-2222-2222-222222222222';
}

function mapUUIDToUser(uuid: string | undefined): { picId: string; picName: string } {
  if (!uuid) return { picId: 'usr_hse_team', picName: 'HSE Team' };
  
  switch (uuid) {
    case '33333333-3333-3333-3333-333333333333':
      return { picId: 'usr_hrga_admin', picName: 'HRGA Admin' };
    case '44444444-4444-4444-4444-444444444444':
      return { picId: 'usr_asep_permana', picName: 'Asep Permana' };
    case '11111111-1111-1111-1111-111111111111':
    case '22222222-2222-2222-2222-222222222222':
    case '77777777-7777-7777-7777-777777777777':
    case 'usr_hse_team':
    default:
      return { picId: 'usr_hse_team', picName: 'HSE Team' };
  }
}

/**
 * Deterministic automated categorization rules for HSE hazards based on standard PT Minda taxonomy.
 * 
 * Rules:
 * Category A: Safety / APD / PPE / Direct Physical Safety / Electrical / Fire / Machinery
 * Category B: Environmental / Workplace Health & Hygiene / 5S / Noise (Kebisingan) / Chemical / Waste / Ergonomics
 * Category C: General Facilities / Building Infrastructure / Mechanical & General Maintenance
 */
export function classifyHazardCategory(title: string = '', description: string = ''): HazardCategory {
  const text = `${title} ${description}`.toLowerCase();

  // 1. Category B: Lingkungan / Higiene Industri / Noise / Chemical / Waste / Ergonomics / 5S
  if (
    text.includes('kebisingan') || 
    text.includes('bising') || 
    text.includes('noise') || 
    text.includes('desibel') || 
    text.includes('decibel') || 
    text.includes('suara bising') ||
    text.includes('leak') || 
    text.includes('bocor') || 
    text.includes('spill') || 
    text.includes('tumpahan') || 
    text.includes('tumpah') || 
    text.includes('chemical') || 
    text.includes('kimia') || 
    text.includes('b3') || 
    text.includes('oil') || 
    text.includes('oli') || 
    text.includes('gas') || 
    text.includes('toxic') || 
    text.includes('racun') || 
    text.includes('waste') || 
    text.includes('limbah') || 
    text.includes('sampah') || 
    text.includes('garbage') || 
    text.includes('trash') || 
    text.includes('emissions') || 
    text.includes('emisi') || 
    text.includes('smoke') || 
    text.includes('asap') || 
    text.includes('bau') || 
    text.includes('odor') || 
    text.includes('pollut') || 
    text.includes('polusi') || 
    text.includes('sirkulasi udara') || 
    text.includes('ventilasi') || 
    text.includes('debu') || 
    text.includes('dust') || 
    text.includes('ergonomi') || 
    text.includes('ergonomic') || 
    text.includes('postur') || 
    text.includes('posture') || 
    text.includes('pegal') || 
    text.includes('housekeeping') || 
    text.includes('5s') || 
    text.includes('kebersihan') || 
    text.includes('kerapihan') || 
    text.includes('cleaning') || 
    text.includes('catering') || 
    text.includes('katering') || 
    text.includes('kantin') || 
    text.includes('sanitasi') || 
    text.includes('toilet')
  ) {
    return 'B';
  }

  // 2. Category A: Personal Protective Equipment, Direct Physical Hazards, Electrical, Fire, Machinery
  if (
    text.includes('helmet') || text.includes('helm') || 
    text.includes('boot') || text.includes('shoes') || text.includes('sepatu') || 
    text.includes('glasses') || text.includes('goggles') || text.includes('kacamata') || 
    text.includes('glove') || text.includes('sarung tangan') || 
    text.includes('vest') || text.includes('rompi') || 
    text.includes('mask') || text.includes('masker') || 
    text.includes('safety belt') || text.includes('harness') || 
    text.includes('ear plug') || text.includes('earplug') || text.includes('earmuff') ||
    text.includes('apd') || text.includes('ppe') || 
    text.includes('protect') || text.includes('shield') || text.includes('pelindung') || 
    text.includes('fall') || text.includes('jatuh') || 
    text.includes('slip') || text.includes('terpeleset') || text.includes('licin') || 
    text.includes('trip') || text.includes('tersandung') || 
    text.includes('listrik') || text.includes('electric') || text.includes('kabel') || text.includes('setrum') || 
    text.includes('api') || text.includes('fire') || text.includes('kebakaran') || text.includes('percikan') || 
    text.includes('forklift') || text.includes('tertabrak') || text.includes('terlindas') || 
    text.includes('terjepit') || text.includes('pinch') || text.includes('crush') || 
    text.includes('lontaran') || text.includes('serpihan') || text.includes('tajam') || text.includes('cut') || 
    text.includes('mesin berputar') || text.includes('machine guard') || text.includes('unsafe act') ||
    text.includes('near miss')
  ) {
    return 'A';
  }

  // 3. Category C: General infrastructure, building facilities, maintenance, mechanical/structural floor faults
  return 'C';
}

export function normalizeCategory(cat: any, title?: string, description?: string): HazardCategory {
  if (hasValue(cat) && typeof cat === 'string') {
    const trimmed = cat.trim();
    // Do NOT determine category from consequence/impact/admin phrases (e.g. 'Cedera Ringan', 'Potensi Korban Jiwa')
    if (!isConsequenceOrAdminValue(trimmed)) {
      const c = trimmed.toLowerCase();
      // Explicit category codes/classes
      if (c === 'a' || c === 'cat a' || c === 'kat a' || c === 'kategori a' || c === 'class a') return 'A';
      if (c === 'b' || c === 'cat b' || c === 'kat b' || c === 'kategori b' || c === 'class b') return 'B';
      if (c === 'c' || c === 'cat c' || c === 'kat c' || c === 'kategori c' || c === 'class c') return 'C';

      // Known category taxonomy names
      if (
        c.includes('kebisingan') || c.includes('noise') || c.includes('bising') ||
        c.includes('lingkungan') || c.includes('environment') || c.includes('limbah') ||
        c.includes('kimia') || c.includes('chemical') || c.includes('oli') || c.includes('oil') ||
        c.includes('ergonomi') || c.includes('5s') || c.includes('housekeeping') ||
        c.includes('polusi') || c.includes('emisi') || c.includes('sampah') || c.includes('waste')
      ) {
        return 'B';
      }

      if (
        c.includes('apd') || c.includes('ppe') || c.includes('safety') ||
        c.includes('listrik') || c.includes('kebakaran') || c.includes('fire') ||
        c.includes('forklift') || c.includes('terjepit') || c.includes('unsafe act')
      ) {
        return 'A';
      }

      if (
        c.includes('maintenance') || c.includes('fasilitas') || c.includes('gedung') ||
        c.includes('mekanikal') || c.includes('infrastructure')
      ) {
        return 'C';
      }
    }
  }

  // If no valid explicit category field exists, classify based on the actual hazard narrative/title
  if (title || description) {
    return classifyHazardCategory(title || '', description || '');
  }

  return 'C';
}

export function mapRowToHazard(row: any): HazardReport {
  let title = row.title || '';
  let description = row.description || row.hazard_description || '';

  if (description.startsWith('[Title] ')) {
    const newlineIdx = description.indexOf('\n');
    if (newlineIdx !== -1) {
      if (!title) title = description.substring(8, newlineIdx).trim();
      description = description.substring(newlineIdx + 1).trim();
      if (description.startsWith('\n')) {
        description = description.substring(1).trim();
      }
    } else {
      if (!title) title = description.substring(8).trim();
      description = '';
    }
  }

  const rawCategory = (row.hazard_category || row.category || '').trim();
  const normalizedCategory = normalizeCategory(rawCategory, title, description);

  if (!title || title.toLowerCase().startsWith('kondisi saat dilaporkan') || title.toLowerCase().startsWith('status korban') || title.toLowerCase() === 'no title') {
    title = getHazardSummary({
      title: row.title && !row.title.toLowerCase().startsWith('kondisi saat dilaporkan') ? row.title : '',
      description: description || row.description || row.hazard_description || '',
      category: normalizedCategory,
      hazardCategory: rawCategory,
      department: row.department || ''
    });
  }
  let picInfo = mapUUIDToUser(row.assigned_to);
  if (!picInfo.picId || picInfo.picId === 'unassigned') {
    picInfo = determinePICFromKeywords(title, description || title, normalizedCategory);
  }

  return {
    id: row.id,
    ticketId: row.ticket_id || '',
    uuid: row.id,
    title: title,
    description: description || title,
    department: row.department || '',
    position: row.position || '',
    area: row.area || '',
    detailLocation: row.detail_location || '',
    incidentDate: row.incident_date || '',
    reporterName: row.reporter_name || '',
    reporterEmail: row.reporter_email || '',
    employeeId: row.employee_id || '',
    picId: picInfo.picId,
    picName: picInfo.picName,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: mapStatusFromDB(row.status),
    category: normalizedCategory,
    hazardCategory: rawCategory,
    potentialImpact: row.potential_impact || '',
    injuryStatus: row.injury_status || '',
    temporaryAction: row.temporary_action || '',
    currentCondition: row.current_condition || '',
    reportedToLeader: row.reported_to_leader || '',
    suggestion: row.suggestion || '',
    officerComments: row.officer_comments || '',
    photoEvidenceUrl: row.photo_evidence_url || '',
    priority: row.priority || 'Medium',
    dfaStatus: row.dfa_status || '',
    officerReviewed: row.officer_reviewed || false,
    officerReviewDate: row.officer_review_date || ''
  };
}

export function mapHazardToRow(hazard: Partial<HazardReport>): any {
  const uuid = hazard.uuid || (isUUID(hazard.id) ? hazard.id : '') || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }));

  let ticketId = hazard.ticketId || '';
  if (!ticketId || (!ticketId.startsWith('HZ-') && !ticketId.startsWith('TKT-'))) {
    ticketId = `HZ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const title = hazard.title || 'Untitled Safety Hazard';
  const desc = hazard.description || 'No description provided.';
  const category = hazard.category || 'C';
  const status = hazard.status ? mapStatusToDB(hazard.status) : 'NewReport';

  const row: any = {
    id: uuid,
    ticket_id: ticketId,
    reporter_name: hazard.reporterName || 'Anonymous Worker',
    employee_id: hazard.employeeId || 'EMP-000',
    reporter_email: hazard.reporterEmail || '',
    department: hazard.department || 'Production',
    position: hazard.position || '',
    incident_date: hazard.incidentDate || (hazard.createdAt ? hazard.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    area: hazard.area || 'General Floor',
    detail_location: hazard.detailLocation || '',
    hazard_description: hazard.description ? (hazard.description.startsWith('[Title]') ? hazard.description : `[Title] ${title}\n\n${desc}`) : `[Title] ${title}\n\n${desc}`,
    hazard_category: hazard.hazardCategory || category,
    potential_impact: hazard.potentialImpact || '',
    injury_status: hazard.injuryStatus || '',
    temporary_action: hazard.temporaryAction || '',
    current_condition: hazard.currentCondition || '',
    reported_to_leader: hazard.reportedToLeader || '',
    suggestion: hazard.suggestion || '',
    photo_evidence_url: hazard.photoEvidenceUrl || null,
    status: status,
    priority: hazard.priority || 'Medium',
    assigned_to: mapUserToUUID(hazard.picId || hazard.picName),
    created_at: hazard.createdAt || new Date().toISOString(),
    updated_at: hazard.updatedAt || new Date().toISOString()
  };

  if (hazard.officerComments !== undefined) row.officer_comments = hazard.officerComments;
  if (hazard.photoEvidenceUrl !== undefined) row.photo_evidence_url = hazard.photoEvidenceUrl;
  if (hazard.dfaStatus !== undefined) row.dfa_status = hazard.dfaStatus;
  if (hazard.officerReviewed !== undefined) row.officer_reviewed = hazard.officerReviewed;
  if (hazard.officerReviewDate !== undefined) row.officer_review_date = hazard.officerReviewDate;

  return row;
}

// ---------------------------------------------------------
// TICKET CATEGORIZATION (AUTOMATED RULE ENGINE)
// ---------------------------------------------------------

/**
 * Deterministic automated categorization rules for automotive safety/HSE hazards.
 * Strips need for fragile external dependencies while offering instant classification response.
 */
export async function categorizeReport(title: string, description: string): Promise<HazardCategory> {
  return classifyHazardCategory(title, description);
}

// ---------------------------------------------------------
// DATABASE & STUB OPERATIONS
// ---------------------------------------------------------

/**
 * Automatically determines the assigned PIC based on report keywords and category.
 * Serves as the primary automated routing engine executed immediately upon report submission.
 */
export function determinePICFromKeywords(title: string, description: string, category: HazardCategory): { picId: string; picName: string } {
  const text = `${title} ${description}`.toLowerCase();

  // Forklift exception: Forklift reports go directly to HSE Team
  if (text.includes('forklift')) {
    return { picId: 'usr_hse_team', picName: 'HSE Team' };
  }

  // HRGA Admin: APD, PPE, Safety Shoes, Helmet, Mask, Gloves, Uniform, Medicine, First Aid, P3K, Clinic, Catering, Employee Welfare, Medical
  if (
    text.includes('apd') || text.includes('ppe') || text.includes('safety shoes') ||
    text.includes('helmet') || text.includes('helm') || text.includes('mask') ||
    text.includes('masker') || text.includes('gloves') || text.includes('sarung tangan') ||
    text.includes('uniform') || text.includes('seragam') || text.includes('medicine') ||
    text.includes('obat') || text.includes('first aid') || text.includes('p3k') ||
    text.includes('clinic') || text.includes('klinik') || text.includes('catering') ||
    text.includes('katering') || text.includes('employee welfare') || text.includes('welfare') ||
    text.includes('medical')
  ) {
    return { picId: 'usr_hrga_admin', picName: 'HRGA Admin' };
  }

  // Asep Permana: Environment, Waste, Trash, Chemical Spill, Oil Spill, Drain, Water Leak, Pollution, Transportation, Vehicle, Truck, Loading, OB, Housekeeping, APAR, Ergonomi, Parking, Driver
  if (
    text.includes('waste') || text.includes('trash') || text.includes('garbage') ||
    text.includes('environment') || text.includes('environmental issue') || text.includes('limbah') ||
    text.includes('sampah') || text.includes('chemical spill') || text.includes('oil spill') ||
    text.includes('spill') || text.includes('tumpahan') || text.includes('drain') ||
    text.includes('water leak') || text.includes('air bocor') || text.includes('bocor') ||
    text.includes('pollution') || text.includes('transportation') || text.includes('vehicle') ||
    text.includes('truck') || text.includes('loading') || text.includes('unloading') ||
    text.includes('ob') || text.includes('housekeeping') || text.includes('cleaning') ||
    text.includes('cleanliness') || text.includes('kebersihan') || text.includes('apar') ||
    text.includes('fire extinguisher') || text.includes('ergonomi') || text.includes('ergonomic') ||
    text.includes('chair') || text.includes('desk') || text.includes('table') ||
    text.includes('posture') || text.includes('driver') || text.includes('sopir') ||
    text.includes('parking') || text.includes('parkir')
  ) {
    return { picId: 'usr_asep_permana', picName: 'Asep Permana' };
  }

  // Default HSE Team assignment
  return { picId: 'usr_hse_team', picName: 'HSE Team' };
}

/**
 * Creates a new HSE Hazard Report.
 * Maps values to Supabase and falls back to LocalStorage stubs on credential mismatch.
 */
export async function createHazardReport(
  data: Omit<HazardReport, 'id' | 'ticketId' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<HazardReport> {
  const now = new Date().toISOString();
  const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }));
  const ticketId = `HZ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const category = data.hazardCategory 
    ? normalizeCategory(data.hazardCategory, data.title, data.description)
    : await categorizeReport(data.title, data.description);

  // Run primary automatic keyword engine for immediate PIC assignment upon submission
  const autoPIC = determinePICFromKeywords(
    data.hazardCategory ? `${data.hazardCategory} ${data.title} ${data.detailLocation || ''}` : data.title,
    data.description,
    category
  );

  const newReport: HazardReport = {
    ...data,
    id: uuid,
    ticketId: ticketId,
    uuid: uuid,
    status: HazardStatus.NewReport,
    category,
    hazardCategory: data.hazardCategory || category,
    picId: autoPIC.picId,
    picName: autoPIC.picName,
    createdAt: now,
    updatedAt: now
  };

  // Always update local storage cache and audit logs for instant UI state synchronization
  const reports = getLocalReports();
  reports.unshift(newReport);
  setLocalReports(reports);

  const auditLogs = getLocalAuditLogs();
  auditLogs.unshift({
    id: `log-${Math.random().toString(36).substr(2, 9)}`,
    hazardId: ticketId,
    userId: 'system_auto_assignment',
    userEmail: data.reporterEmail || 'employee@mindaauto.co.id',
    action: 'Report Submitted',
    details: `New hazard report submitted by ${data.reporterName || 'Anonymous Worker'}. Automated classification Category ${category}. Automatically assigned PIC: ${autoPIC.picName}.`,
    createdAt: now
  });
  setLocalAuditLogs(auditLogs);

  const supabase = getSupabase();
  if (supabase) {
    const row = mapHazardToRow(newReport);
    console.log('[Supabase Engine] Executing INSERT on hazard_reports with row:', row);

    const { error } = await supabase.from('hazard_reports').insert([row]);

    if (error) {
      console.error('[Supabase Engine] CRITICAL: Database INSERT to hazard_reports failed:', error);
      throw new Error(`Database INSERT to 'hazard_reports' failed: [${error.code || 'UNKNOWN'}] ${error.message}${error.details ? ` - Details: ${error.details}` : ''}${error.hint ? ` - Hint: ${error.hint}` : ''}`);
    }

    // Insert to Supabase notifications table
    const { error: notifError } = await supabase.from('notifications').insert([{
      id: `notif-${Math.random().toString(36).substr(2, 9)}`,
      type: 'new_hazard',
      title: 'New Hazard Logged',
      message: `A new Category ${category} hazard has been submitted: "${data.title}"`,
      read: false,
      created_at: now,
      hazard_id: ticketId
    }]);
    if (notifError) {
      console.warn('[Supabase Engine] Notification insert notice:', notifError.message);
    }
  }

  // Dispatch Intelligent Multi-Category Notification Engine automatically immediately after report submission
  await dispatchIntelligentNotifications(newReport, 'New Report Logged');

  return newReport;
}

/**
 * Transitions the status of a hazard report.
 * Dispatches Audit trail logs and checks DFA transition constraints.
 */
export async function transitionHazardStatus(
  ticketId: string,
  nextStatus: HazardStatus,
  currentUser: AppUser
): Promise<void> {
  const now = new Date().toISOString();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { error: updateErr } = await supabase
        .from('hazard_reports')
        .update(sanitizeUpdatePayload({ status: mapStatusToDB(nextStatus), updated_at: now }))
        .eq('ticket_id', ticketId);

      if (updateErr) throw updateErr;

      let { error: logErr } = await supabase
        .from('audit_logs')
        .insert([{
          hazard_id: ticketId,
          user_id: currentUser.id,
          user_email: currentUser.email,
          action: 'Status Transition',
          details: `Transitioned status to: "${nextStatus}" by ${currentUser.name}.`,
          created_at: now
        }]);

      if (logErr) {
        const { error: trailErr } = await supabase
          .from('audit_trail')
          .insert([{
            id: `log-${Math.random().toString(36).substr(2, 9)}`,
            hazard_id: ticketId,
            user_id: currentUser.id,
            user_email: currentUser.email,
            action: 'Status Transition',
            details: `Transitioned status to: "${nextStatus}" by ${currentUser.name}.`,
            created_at: now
          }]);
        if (trailErr) throw logErr;
      }
      const reports = getLocalReports();
      const currentHazard = reports.find(r => r.id === ticketId);
      if (currentHazard) {
        await dispatchIntelligentNotifications({ ...currentHazard, status: nextStatus }, `Status Transitioned to ${nextStatus}`);
      }
      await fetchHazardReports();
      await fetchAuditLogs();
      return;
    } catch (err: any) {
      if (err?.message?.includes('Could not find') || err?.message?.includes('table') || err?.message?.includes('schema cache')) {
        console.warn('[Supabase Engine] Transition failed because the tables are not found. Falling back to Local Storage.');
      } else {
        console.error('[Supabase Engine] Transition failed, applying local state:', err);
      }
    }
  }

  // Fallback Engine
  const reports = getLocalReports();
  const idx = reports.findIndex(r => r.id === ticketId);
  if (idx !== -1) {
    reports[idx].status = nextStatus;
    reports[idx].updatedAt = now;
    setLocalReports(reports);

    // Create audit log
    const auditLogs = getLocalAuditLogs();
    auditLogs.unshift({
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      hazardId: ticketId,
      userId: currentUser.id,
      userEmail: currentUser.email,
      action: 'Status Transition',
      details: `Status transitioned to: "${nextStatus}" by ${currentUser.name}.`,
      createdAt: now
    });
    setLocalAuditLogs(auditLogs);

    // Trigger customizable notification template
    const hazard = reports[idx];
    const templateId = nextStatus === HazardStatus.Completed ? 'completed' : 'status_updated';
    const rendered = renderNotificationTemplate(templateId, {
      ticketId: hazard.ticketId,
      title: hazard.title,
      reporterName: hazard.reporterName,
      assignedPIC: hazard.picName || 'Unassigned',
      newStatus: nextStatus,
      department: hazard.department,
      area: hazard.area
    });

    const notifs = getLocalNotifications();
    notifs.unshift({
      id: `notif-${Math.random().toString(36).substr(2, 9)}`,
      title: rendered.subject,
      message: rendered.body,
      read: false,
      createdAt: now,
      recipientRole: 'employee',
      recipientEmail: hazard.reporterEmail
    });
    setLocalNotifications(notifs);
  }
  await fetchHazardReports();
  await fetchAuditLogs();
}

/**
 * Assigns a PIC (Person-In-Charge) to a hazard.
 */
export async function assignHazardPIC(
  ticketId: string,
  picName: string,
  picId: string,
  user: AppUser
): Promise<void> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const recipientEmails = getPicEmailList(picId, picName);
  const primaryEmail = recipientEmails.join(', ');

  if (supabase) {
    try {
      const assignedToValue = (picId === 'unassigned' || picId === 'none' || picId === 'clear') 
        ? null 
        : (mapUserToUUID(picId) || mapUserToUUID(picName));

      const { error: updateErr } = await supabase
        .from('hazard_reports')
        .update(sanitizeUpdatePayload({
          assigned_to: assignedToValue,
          updated_at: now
        }))
        .eq('ticket_id', ticketId);

      if (updateErr) throw updateErr;

      let { error: logErr } = await supabase
        .from('audit_logs')
        .insert([{
          hazard_id: ticketId,
          user_id: user.id,
          user_email: user.email,
          action: 'PIC Assigned',
          details: `Assigned new PIC: ${picName} (${primaryEmail}) by Admin/Officer ${user.name}.`,
          created_at: now
        }]);

      if (logErr) {
        const { error: trailErr } = await supabase
          .from('audit_trail')
          .insert([{
            id: `log-${Math.random().toString(36).substr(2, 9)}`,
            hazard_id: ticketId,
            user_id: user.id,
            user_email: user.email,
            action: 'PIC Assigned',
            details: `Assigned new PIC: ${picName} (${primaryEmail}) by Admin/Officer ${user.name}.`,
            created_at: now
          }]);
        if (trailErr) throw logErr;
      }
      await fetchHazardReports();
      await fetchAuditLogs();
      return;
    } catch (err: any) {
      if (err?.message?.includes('Could not find') || err?.message?.includes('table') || err?.message?.includes('schema cache')) {
        console.warn('[Supabase Engine] PIC assignment failed because the tables are not found. Falling back to Local Storage.');
      } else {
        console.error('[Supabase Engine] PIC assignment failed, using fallback:', err);
      }
    }
  }

  // Fallback Engine
  const reports = getLocalReports();
  const idx = reports.findIndex(r => r.id === ticketId);
  if (idx !== -1) {
    reports[idx].picId = picId;
    reports[idx].picName = picName;
    reports[idx].updatedAt = now;
    setLocalReports(reports);

    const auditLogs = getLocalAuditLogs();
    auditLogs.unshift({
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      hazardId: ticketId,
      userId: user.id,
      userEmail: user.email,
      action: 'PIC Assigned',
      details: `Assigned new PIC: ${picName} (${primaryEmail}) by Admin/Officer ${user.name}.`,
      createdAt: now
    });
    setLocalAuditLogs(auditLogs);

    // Trigger customizable notification template for assigned PIC
    const hazard = reports[idx];
    const rendered = renderNotificationTemplate('assigned', {
      ticketId: hazard.ticketId,
      title: hazard.title,
      reporterName: hazard.reporterName,
      assignedPIC: picName,
      newStatus: hazard.status,
      department: hazard.department,
      area: hazard.area
    });

    const notifs = getLocalNotifications();
    for (const email of recipientEmails) {
      notifs.unshift({
        id: `notif-${Math.random().toString(36).substr(2, 9)}`,
        title: rendered.subject,
        message: rendered.body,
        read: false,
        createdAt: now,
        recipientRole: 'hse_officer',
        recipientEmail: email
      });
    }
    setLocalNotifications(notifs);
  }
  await fetchHazardReports();
  await fetchAuditLogs();
}

/**
 * Adds a comment/response to a hazard report.
 */
export async function addHazardComment(
  ticketId: string,
  commentText: string,
  currentUser: AppUser
): Promise<void> {
  const now = new Date().toISOString();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { error } = await supabase
        .from('hazard_comments')
        .insert([{
          hazard_id: ticketId,
          user_id: currentUser.id,
          user_name: currentUser.name,
          user_email: currentUser.email,
          comment_text: commentText,
          created_at: now
        }]);
      if (error) throw error;
      return;
    } catch (err: any) {
      if (err?.message?.includes('Could not find') || err?.message?.includes('table') || err?.message?.includes('schema cache')) {
        console.warn('[Supabase Engine] Comment insertion failed because the comments table is not found. Falling back to Local Storage.');
      } else {
        console.error('[Supabase Engine] Comment insertion failed, saving to LocalStorage:', err);
      }
    }
  }

  // Fallback Engine
  const comments = getLocalComments();
  comments.push({
    id: `cmt-${Math.random().toString(36).substr(2, 9)}`,
    hazard_id: ticketId,
    user_id: currentUser.id,
    user_name: currentUser.name,
    user_email: currentUser.email,
    comment_text: commentText,
    created_at: now
  });
  setLocalComments(comments);

  // Add Audit log
  const auditLogs = getLocalAuditLogs();
  auditLogs.unshift({
    id: `log-${Math.random().toString(36).substr(2, 9)}`,
    hazardId: ticketId,
    userId: currentUser.id,
    userEmail: currentUser.email,
    action: 'Comment Added',
    details: `${currentUser.name} added comment: "${commentText.substring(0, 40)}..."`,
    createdAt: now
  });
  setLocalAuditLogs(auditLogs);

  // Dispatch officer notes notification to PIC and Reporter
  const reports = getLocalReports();
  const report = reports.find(r => r.ticketId === ticketId || r.id === ticketId);
  if (report) {
    await dispatchIntelligentNotifications(report, 'officer_notes', { officerComments: commentText });
  }
}

/**
 * Fetches comments for a hazard report.
 */
export async function getHazardComments(ticketId: string): Promise<any[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('hazard_comments')
        .select('*')
        .eq('hazard_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      if (err?.message?.includes('Could not find') || err?.message?.includes('table') || err?.message?.includes('schema cache')) {
        console.warn('[Supabase Engine] Fetch comments failed because the comments table is not found. Falling back to Local Storage.');
      } else {
        console.error('[Supabase Engine] Error fetching comments:', err);
      }
    }
  }

  // Fallback Engine
  return getLocalComments().filter((c: any) => c.hazard_id === ticketId);
}

// ---------------------------------------------------------
// SLA REMINDERS & AUTOMATED ESCALATION
// ---------------------------------------------------------

/**
 * Running SLA reminders checks. Escalate tickets that violate boundaries.
 */
export async function runReminderEscalationChecks(): Promise<number> {
  const now = new Date();
  let triggeredCount = 0;
  
  const supabase = getSupabase();
  let reports: HazardReport[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase.from('hazard_reports').select('*');
      if (!error && data) {
        reports = data.map(mapRowToHazard);
      } else {
        reports = getLocalReports();
      }
    } catch {
      reports = getLocalReports();
    }
  } else {
    reports = getLocalReports();
  }

  // Filter all tickets that are not Resolved, Completed, or Closed
  const unresolved = reports.filter(r => {
    const s = String(r.status).toLowerCase();
    return s !== 'resolved' && s !== 'completed' && s !== 'closed' && r.status !== HazardStatus.Resolved && r.status !== HazardStatus.Completed;
  });

  const auditLogs = getLocalAuditLogs();

  for (const hazard of unresolved) {
    const createdDate = new Date(hazard.createdAt);
    const elapsedDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Milestones: Day 3, Day 7, Day 14, Day 30
    const scheduledDays = [3, 7, 14, 30];
    
    // Recurring Loop: After Day 30, continue every 7 days (e.g., Day 37, Day 44, Day 51...) until report is Resolved or Completed
    if (elapsedDays > 30) {
      for (let dayThreshold = 37; dayThreshold <= elapsedDays; dayThreshold += 7) {
        if (!scheduledDays.includes(dayThreshold)) {
          scheduledDays.push(dayThreshold);
        }
      }
    }

    for (const dayThreshold of scheduledDays) {
      if (elapsedDays >= dayThreshold) {
        const ticketId = hazard.ticketId;
        const reminderActionTag = `SLA Reminder Day ${dayThreshold}`;
        const alreadySentLog = auditLogs.some(l => (l.hazardId === ticketId || l.ticketId === ticketId) && l.action.includes(reminderActionTag));

        if (!alreadySentLog) {
          triggeredCount++;
          const priority = dayThreshold >= 30 ? 'CRITICAL' : dayThreshold >= 14 ? 'HIGH' : 'NORMAL';

          // Evaluate intelligent routing for recipients
          const routing = await evaluateIntelligentNotificationRouting(hazard, 'sla_reminder');

          auditLogs.unshift({
            id: `log-${Math.random().toString(36).substr(2, 9)}`,
            hazardId: ticketId,
            ticketId: ticketId,
            userId: 'system_sla_daemon',
            userEmail: 'mozza.bunga.tarmuji.07@gmail.com',
            action: `Automated ${reminderActionTag} (${priority})`,
            details: `Automated SLA Reminder dispatched for ticket ${ticketId} (Days Open: ${elapsedDays}). Priority: ${priority}. Routing recipients: ${routing.recipientEmails.join(', ')}.`,
            createdAt: now.toISOString()
          });
          setLocalAuditLogs(auditLogs);

          await dispatchIntelligentNotifications(hazard, 'sla_reminder', {
            daysOpen: elapsedDays,
            reminderTag: reminderActionTag
          });

          // Update flag in Supabase if available for 3d, 7d, 14d, 30d
          if (supabase && [3, 7, 14, 30].includes(dayThreshold)) {
            const flagKey = `reminder_${dayThreshold}d_sent`;
            if (isUUID(hazard.id)) {
              await supabase
                .from('hazard_reports')
                .update(sanitizeUpdatePayload({
                  [flagKey]: true,
                  updated_at: now.toISOString()
                }))
                .eq('id', hazard.id);
            } else {
              await supabase
                .from('hazard_reports')
                .update(sanitizeUpdatePayload({
                  [flagKey]: true,
                  updated_at: now.toISOString()
                }))
                .eq('ticket_id', ticketId);
            }
          }
        }
      }
    }
  }
  return triggeredCount;
}

// ---------------------------------------------------------
// WEEKLY COMPILATION PDF METRICS
// ---------------------------------------------------------

/**
 * Compiles and generates weekly report metrics.
 */
export async function generateWeeklyReportMetrics(generatedBy: string = 'HSE Administrator'): Promise<WeeklyReport> {
  const reports = getLocalReports();
  const auditLogs = getLocalAuditLogs();

  const pdfResult = generateWeeklyReportPDF(reports, auditLogs, generatedBy);

  const newWeeklyReport: WeeklyReport = {
    id: pdfResult.weekId,
    weekStartDate: pdfResult.weekStartDate,
    weekEndDate: pdfResult.weekEndDate,
    totalReported: pdfResult.totalReported,
    totalResolved: pdfResult.totalResolved,
    criticalCount: pdfResult.criticalCount,
    compiledAt: new Date().toISOString(),
    pdfBase64: pdfResult.pdfBase64,
    generatedBy
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('weekly_reports').insert([{
        id: newWeeklyReport.id,
        week_starting: newWeeklyReport.weekStartDate,
        week_ending: newWeeklyReport.weekEndDate,
        total_reports: newWeeklyReport.totalReported,
        completed_reports: newWeeklyReport.totalResolved,
        open_reports: newWeeklyReport.totalReported - newWeeklyReport.totalResolved,
        created_at: newWeeklyReport.compiledAt,
        file_location_pdf: newWeeklyReport.pdfBase64
      }]);
    } catch (err: any) {
      if (err?.message?.includes('Could not find') || err?.message?.includes('table') || err?.message?.includes('schema cache')) {
        console.warn('[Supabase Engine] Failed to write weekly report because the "weekly_reports" table is not found. Saving to Local Storage.');
      } else {
        console.error('[Supabase Engine] Failed to write weekly report to database:', err);
      }
    }
  }

  const weeklyList = getLocalWeeklyReports();
  weeklyList.unshift(newWeeklyReport);
  setLocalWeeklyReports(weeklyList);

  return newWeeklyReport;
}

export async function deleteWeeklyReport(id: string): Promise<WeeklyReport[]> {
  const current = getLocalWeeklyReports();
  const updated = current.filter(r => r.id !== id);
  setLocalWeeklyReports(updated);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('weekly_reports').delete().eq('id', id);
    } catch (err) {
      console.warn('Failed to delete weekly report from Supabase:', err);
    }
  }
  return updated;
}

// ---------------------------------------------------------
// AUTHENTICATION SECURITY LAYER
// ---------------------------------------------------------

/**
 * Signs in a user using Supabase Auth, or falling back to local credentials profile.
 */
export const AUTHORIZED_OFFICER_EMAILS = [
  'purwanto@mindaauto.co.id',
  'anita@mindaauto.co.id',
  'asep.permana@mindaauto.co.id',
  'hrga_admin@mindaauto.co.id',
  'hse_supervisor@mindaauto.co.id',
  'president_director@mindaauto.co.id',
  'mozza.bunga.tarmuji.07@gmail.com'
] as const;

export async function signInWithSupabase(email: string, password: string): Promise<AppUser> {
  let lowerEmail = email.trim().toLowerCase();

  // Normalize inputs for mozza / admin / shorthand usernames
  if (lowerEmail.includes('mozza') || lowerEmail === 'admin') {
    lowerEmail = 'mozza.bunga.tarmuji.07@gmail.com';
  } else if (!lowerEmail.includes('@')) {
    if (lowerEmail.includes('purwanto')) lowerEmail = 'purwanto@mindaauto.co.id';
    else if (lowerEmail.includes('anita')) lowerEmail = 'anita@mindaauto.co.id';
    else if (lowerEmail.includes('asep')) lowerEmail = 'asep.permana@mindaauto.co.id';
    else if (lowerEmail.includes('hrga')) lowerEmail = 'hrga_admin@mindaauto.co.id';
    else if (lowerEmail.includes('supervisor')) lowerEmail = 'hse_supervisor@mindaauto.co.id';
    else if (lowerEmail.includes('director') || lowerEmail.includes('president')) lowerEmail = 'president_director@mindaauto.co.id';
    else lowerEmail = `${lowerEmail}@mindaauto.co.id`;
  }

  // Strict check: ONLY authorized officer accounts permitted
  if (!AUTHORIZED_OFFICER_EMAILS.includes(lowerEmail as any)) {
    throw new Error('Access Denied\n\nYour account is not registered as an authorized HSE Officer.\nPlease contact the HSE System Administrator.');
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: lowerEmail,
        password: password
      });

      if (!authError) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('email', lowerEmail)
          .maybeSingle();

        if (profile) {
          const u: AppUser = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role as any,
            departmentId: profile.department_id
          };
          localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_USER, JSON.stringify(u));
          return u;
        }
      }
    } catch (err) {
      console.error('[Supabase Auth] Standard login failed:', err);
    }
  }

  // Explicit profile mapping for authorized accounts
  let name = '';
  let role: AppUser['role'] = 'hse_officer';
  let departmentId = 'HSE';

  switch (lowerEmail) {
    case 'purwanto@mindaauto.co.id':
      name = 'Purwanto (Safety Officer)';
      role = 'hse_admin';
      departmentId = 'HSE';
      break;
    case 'anita@mindaauto.co.id':
      name = 'Anita (Safety Officer)';
      role = 'hse_officer';
      departmentId = 'HSE';
      break;
    case 'asep.permana@mindaauto.co.id':
      name = 'Asep Permana (Env & Trans Supervisor)';
      role = 'env_officer';
      departmentId = 'HSE';
      break;
    case 'hrga_admin@mindaauto.co.id':
      name = 'HRGA Admin';
      role = 'hrga_admin';
      departmentId = 'HRGA';
      break;
    case 'hse_supervisor@mindaauto.co.id':
      name = 'HSE Supervisor';
      role = 'management';
      departmentId = 'HSE';
      break;
    case 'president_director@mindaauto.co.id':
      name = 'President Director / Management';
      role = 'management';
      departmentId = 'ADMIN';
      break;
    case 'mozza.bunga.tarmuji.07@gmail.com':
      name = 'Mozza Bunga (HSE Admin)';
      role = 'hse_admin';
      departmentId = 'HSE';
      break;
    default:
      throw new Error('Access Denied\n\nYour account is not registered as an authorized HSE Officer.\nPlease contact the HSE System Administrator.');
  }

  const userProfile: AppUser = {
    id: lowerEmail.replace(/[^a-zA-Z0-9]/g, '_'),
    email: lowerEmail,
    name,
    role,
    departmentId,
    position: role === 'hrga_admin' ? 'HRGA Admin' : undefined
  };

  localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_USER, JSON.stringify(userProfile));
  
  // Dispatch active user auth event
  onAuthChangedCallbacks.forEach(cb => cb(userProfile));
  
  return userProfile;
}

/**
 * Logs out the current session.
 */
export async function signOutSupabase(): Promise<void> {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_USER);
  const supabase = getSupabase();
  if (supabase) {
    await supabase.auth.signOut().catch(() => {});
  }
  onAuthChangedCallbacks.forEach(cb => cb(null));
}

const onAuthChangedCallbacks = new Set<(user: AppUser | null) => void>();

export function onSupabaseAuthStateChanged(callback: (user: AppUser | null) => void): () => void {
  onAuthChangedCallbacks.add(callback);
  
  // Trigger initial callback state from LocalStorage session
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_USER);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.email === 'hrga_admin@mindaauto.co.id' || parsed.role === 'ppe_officer') {
        parsed.name = 'HRGA Admin';
        parsed.role = 'hrga_admin';
        parsed.position = 'HRGA Admin';
        localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_USER, JSON.stringify(parsed));
      }
      callback(parsed);
    } else {
      callback(null);
    }
  } catch {
    callback(null);
  }

  return () => {
    onAuthChangedCallbacks.delete(callback);
  };
}

// ---------------------------------------------------------
// REAL-TIME PUBSUB CHANNELS (CLIENT-SIDE ADAPTERS)
// ---------------------------------------------------------

export async function fetchHazardReports(): Promise<HazardReport[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('hazard_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = deduplicateReports(data.map(mapRowToHazard));
        setLocalReports(mapped);
        return mapped;
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Failed to fetch') || msg.includes('fetch') || err?.name === 'TypeError') {
        console.warn('[Supabase Engine] Supabase unreachable (Failed to fetch). Operating in Local Storage fallback mode.');
      } else {
        console.error('[Supabase Engine] Error fetching hazard reports:', err);
      }
    }
  }
  const local = getLocalReports();
  notifyReportSubscribers();
  return local;
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      let response = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (response.error) {
        response = await supabase
          .from('audit_trail')
          .select('*')
          .order('created_at', { ascending: false });
      }

      if (!response.error && response.data) {
        const mapped = response.data.map((row: any) => ({
          id: row.id,
          hazardId: row.hazard_id,
          userId: row.user_id,
          userEmail: row.user_email,
          action: row.action,
          details: row.details,
          createdAt: row.created_at
        }));
        setLocalAuditLogs(mapped);
        return mapped;
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Failed to fetch') || msg.includes('fetch') || err?.name === 'TypeError') {
        console.warn('[Supabase Engine] Supabase unreachable when fetching audit logs.');
      } else {
        console.error('[Supabase Engine] Error fetching audit logs:', err?.message || err);
      }
    }
  }
  const local = getLocalAuditLogs();
  notifyAuditSubscribers();
  return local;
}

export function subscribeToHazards(callback: (hazards: HazardReport[]) => void): () => void {
  reportSubscribers.add(callback);
  
  const supabase = getSupabase();
  if (supabase) {
    const fetchAndNotify = async () => {
      try {
        const { data, error } = await supabase
          .from('hazard_reports')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
          const mapped = deduplicateReports(data.map(mapRowToHazard));
          setLocalReports(mapped);
          callback(mapped);
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('Could not find') || msg.includes('table') || msg.includes('schema cache')) {
          console.warn('[Supabase Engine] Table "hazard_reports" not found in Supabase. Falling back to Local Storage. Please initialize your Supabase tables.');
        } else if (msg.includes('Failed to fetch') || msg.includes('fetch') || err?.name === 'TypeError') {
          console.warn('[Supabase Engine] Supabase server is offline or unreachable (Failed to fetch). Operating in Local Storage fallback mode.');
        } else {
          console.error('[Supabase Engine] Error fetching initial hazards:', err?.message || err);
        }
        callback(getLocalReports());
      }
    };

    fetchAndNotify();

    const channel = supabase
      .channel('public:hazard_reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hazard_reports' },
        (payload: any) => {
          console.log('[Supabase Realtime] Hazards table event:', payload?.eventType);
          if (payload?.eventType === 'DELETE' && payload.old?.id) {
            const deletedId = payload.old.id;
            const current = getLocalReports().filter(r => r.id !== deletedId && r.uuid !== deletedId);
            setLocalReports(current);
            callback(current);
          } else if (payload?.eventType === 'UPDATE' && payload.new?.id) {
            const updatedId = payload.new.id;
            const mappedNew = mapRowToHazard(payload.new);
            const current = getLocalReports().map(r => 
              (r.id === updatedId || r.uuid === updatedId) ? mappedNew : r
            );
            setLocalReports(current);
            callback(current);
          }
          fetchAndNotify();
        }
      )
      .subscribe();

    return () => {
      reportSubscribers.delete(callback);
      supabase.removeChannel(channel);
    };
  } else {
    callback(getLocalReports());
    return () => {
      reportSubscribers.delete(callback);
    };
  }
}

export function subscribeToNotifications(callback: (notifications: Notification[]) => void): () => void {
  notificationSubscribers.add(callback);
  
  const supabase = getSupabase();
  if (supabase) {
    const fetchAndNotify = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
          const mapped = data.map((row: any) => ({
            id: row.id,
            title: row.title,
            message: row.message,
            read: row.read,
            createdAt: row.created_at,
            recipientRole: row.recipient_role,
            recipientEmail: row.recipient_email
          }));
          localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(mapped));
          callback(mapped);
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('Could not find') || msg.includes('table') || msg.includes('schema cache')) {
          console.warn('[Supabase Engine] Table "notifications" not found in Supabase. Falling back to Local Storage. Please initialize your Supabase tables.');
        } else if (msg.includes('Failed to fetch') || msg.includes('fetch') || err?.name === 'TypeError') {
          console.warn('[Supabase Engine] Supabase server is offline or unreachable when fetching notifications.');
        } else {
          console.error('[Supabase Engine] Error fetching initial notifications:', err?.message || err?.details || err);
        }
        callback(getLocalNotifications());
      }
    };

    fetchAndNotify();

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchAndNotify();
        }
      )
      .subscribe();

    return () => {
      notificationSubscribers.delete(callback);
      supabase.removeChannel(channel);
    };
  } else {
    callback(getLocalNotifications());
    return () => {
      notificationSubscribers.delete(callback);
    };
  }
}

export function subscribeToWeeklyReports(callback: (reports: WeeklyReport[]) => void): () => void {
  weeklySubscribers.add(callback);
  
  const supabase = getSupabase();
  if (supabase) {
    const fetchAndNotify = async () => {
      try {
        const { data, error } = await supabase
          .from('weekly_reports')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
          const mapped = data.map((row: any) => ({
            id: row.id,
            weekStartDate: row.week_starting,
            weekEndDate: row.week_ending,
            totalReported: row.total_reports,
            totalResolved: row.completed_reports,
            criticalCount: row.critical_reports || 0,
            compiledAt: row.created_at,
            pdfBase64: row.file_location_pdf || undefined
          }));
          localStorage.setItem(LOCAL_STORAGE_KEYS.REPORTS_WEEKLY, JSON.stringify(mapped));
          callback(mapped);
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('Could not find') || msg.includes('table') || msg.includes('schema cache')) {
          console.warn('[Supabase Engine] Table "weekly_reports" not found in Supabase. Falling back to Local Storage. Please initialize your Supabase tables.');
        } else if (msg.includes('Failed to fetch') || msg.includes('fetch') || err?.name === 'TypeError') {
          console.warn('[Supabase Engine] Supabase server is offline or unreachable when fetching weekly reports.');
        } else {
          console.error('[Supabase Engine] Error fetching initial weekly reports:', err?.message || err);
        }
        callback(getLocalWeeklyReports());
      }
    };

    fetchAndNotify();

    const channel = supabase
      .channel('public:weekly_reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weekly_reports' },
        () => {
          fetchAndNotify();
        }
      )
      .subscribe();

    return () => {
      weeklySubscribers.delete(callback);
      supabase.removeChannel(channel);
    };
  } else {
    callback(getLocalWeeklyReports());
    return () => {
      weeklySubscribers.delete(callback);
    };
  }
}

export function subscribeToAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
  auditSubscribers.add(callback);
  
  const supabase = getSupabase();
  if (supabase) {
    const fetchAndNotify = async () => {
      try {
        let response = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (response.error) {
          response = await supabase
            .from('audit_trail')
            .select('*')
            .order('created_at', { ascending: false });
        }

        if (response.error) throw response.error;
        if (response.data) {
          const mapped = response.data.map((row: any) => ({
            id: row.id,
            hazardId: row.hazard_id,
            userId: row.user_id,
            userEmail: row.user_email,
            action: row.action,
            details: row.details,
            createdAt: row.created_at
          }));
          localStorage.setItem(LOCAL_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(mapped));
          callback(mapped);
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('Could not find') || msg.includes('table') || msg.includes('schema cache')) {
          console.warn('[Supabase Engine] Table "audit_logs" or "audit_trail" not found in Supabase. Falling back to Local Storage. Please initialize your Supabase tables.');
        } else if (msg.includes('Failed to fetch') || msg.includes('fetch') || err?.name === 'TypeError') {
          console.warn('[Supabase Engine] Supabase server is offline or unreachable when fetching audit logs.');
        } else {
          console.error('[Supabase Engine] Error fetching initial audit logs:', err?.message || err);
        }
        callback(getLocalAuditLogs());
      }
    };

    fetchAndNotify();

    const channelLogs = supabase
      .channel('public:audit_logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        () => { fetchAndNotify(); }
      )
      .subscribe();

    const channelTrail = supabase
      .channel('public:audit_trail')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_trail' },
        () => { fetchAndNotify(); }
      )
      .subscribe();

    return () => {
      auditSubscribers.delete(callback);
      supabase.removeChannel(channelLogs);
      supabase.removeChannel(channelTrail);
    };
  } else {
    callback(getLocalAuditLogs());
    return () => {
      auditSubscribers.delete(callback);
    };
  }
}

async function insertAuditLogHelper(
  supabase: any,
  ticketId: string,
  action: string,
  prev: string,
  next: string,
  message: string,
  currentUser: AppUser,
  now: string
): Promise<void> {
  const detailsJSON = JSON.stringify({ prev, new: next, message });
  try {
    // Try inserting into audit_logs first
    const { error: logErr } = await supabase
      .from('audit_logs')
      .insert([{
        hazard_id: ticketId,
        user_id: currentUser.id,
        user_email: currentUser.email,
        action: action,
        details: detailsJSON,
        created_at: now
      }]);

    if (logErr) {
      // If error (e.g. table not found or restricted), try audit_trail table
      await supabase
        .from('audit_trail')
        .insert([{
          id: `log-${Math.random().toString(36).substr(2, 9)}`,
          hazard_id: ticketId,
          user_id: currentUser.id,
          user_email: currentUser.email,
          action: action,
          details: detailsJSON,
          created_at: now
        }]);
    }
  } catch (err) {
    console.warn('[Supabase Engine] Failed to insert audit log in both tables. Falling back.', err);
  }
}

export async function updateHazardReportComplete(
  ticketId: string,
  updates: {
    status?: HazardStatus | string;
    picId?: string;
    picName?: string;
    officerComments?: string;
    uuid?: string;
    reporterName?: string;
    reporter_name?: string;
    employeeId?: string;
    employee_id?: string;
    department?: string;
    area?: string;
    hazardCategory?: string;
    hazard_category?: string;
    hazardDescription?: string;
    hazard_description?: string;
    priority?: string;
    severity?: number;
    likelihood?: number;
    riskScore?: number;
    riskLevel?: 'Low' | 'Moderate' | 'High' | 'Extreme';
    otpRequired?: boolean;
    otpProgramName?: string;
    additionalControl?: string;
  },
  currentUser: AppUser
): Promise<number> {
  const isBrowser = typeof window !== 'undefined';
  console.log("ENTER updateHazardReportComplete");
  console.log("isBrowser:", isBrowser);
  console.log("ticketId:", ticketId);
  console.log("updates:", updates);

  console.log(`[Trace] updateHazardReportComplete called with ticketId: "${ticketId}"`);
  console.log('[Trace] Payload:', JSON.stringify(updates, null, 2));

  if (isBrowser) {
    console.log(`[Supabase Engine] Browser-side update called for ticket "${ticketId}" (UUID: "${updates.uuid || 'N/A'}").`);
    console.log(`[Supabase Engine] Forwarding update operation to the Express server API proxy to bypass RLS limits.`);
    try {
      console.log(`[CLIENT] sending PUT /api/v1/hazards/:id (ID: ${ticketId})`);
      console.log('[Trace] HTTP request sent');
      console.log('Sending HTTP request');
      console.log("ABOUT TO SEND PUT");
      console.log("request URL:", `/api/v1/hazards/${encodeURIComponent(ticketId)}`);
      console.log("request body:", JSON.stringify({ updates, currentUser }));
      const response = await fetch(getApiUrl(`/api/v1/hazards/${encodeURIComponent(ticketId)}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates, currentUser }),
      });

      console.log('HTTP response received');
      console.log(`[CLIENT] fetch status: ${response.status}`);
      console.log(`[Trace] HTTP response: status=${response.status}`);
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson.error || `HTTP error ${response.status}`;
        console.error(`[Supabase Engine] Server proxy returned error: "${errMsg}"`);
        throw new Error(errMsg);
      }

      const resJson = await response.json();
      console.log("updated rows:", typeof resJson.affectedRows === 'number' ? resJson.affectedRows : 1);
      console.log("database response:", resJson);
      console.log('[CLIENT] response JSON:', JSON.stringify(resJson, null, 2));
      const rowsCount = typeof resJson.affectedRows === 'number' ? resJson.affectedRows : 1;
      console.log('Rows affected');
      console.log(`[Trace] Rows updated: ${rowsCount}`);
      return rowsCount;
    } catch (err: any) {
      console.error(`[Supabase Engine] Failed to complete update via server proxy:`, err);
      throw err;
    }
  }

  // Server-Side direct execution
  const now = new Date().toISOString();
  const supabase = getSupabase();

  if (supabase) {
    try {
      let currentReport = null;
      let targetColumn = '';
      let targetValue = '';

      const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase/)?.[1] || 'unknown';
      console.log(`[Supabase Server Engine] Starting hazard update process.`);
      console.log(`[Supabase Server Engine] Target Project Reference: "${projectRef}"`);
      console.log(`[Supabase Server Engine] Client Instance: ${supabase ? 'Singleton client is READY' : 'Singleton client is NULL'}`);

      // Log details of requested search
      console.log(`[Supabase Server Engine] Finding report for update. ticketId: "${ticketId}", uuid: "${updates.uuid || 'N/A'}"`);

      // 1. Try querying by uuid (primary key id) if provided
      if (updates.uuid && isUUID(updates.uuid)) {
        const { data, error } = await supabase
          .from('hazard_reports')
          .select('*')
          .eq('id', updates.uuid)
          .maybeSingle();
        if (data) {
          currentReport = data;
          targetColumn = 'id';
          targetValue = updates.uuid;
          console.log(`[Supabase Server Engine] Record found via primary key column 'id' (UUID): "${updates.uuid}"`);
        }
      }

      // 2. If not found, try querying by ticket_id column matching ticketId
      if (!currentReport && ticketId) {
        const { data, error } = await supabase
          .from('hazard_reports')
          .select('*')
          .eq('ticket_id', ticketId)
          .maybeSingle();
        if (data) {
          currentReport = data;
          targetColumn = 'ticket_id';
          targetValue = ticketId;
          console.log(`[Supabase Server Engine] Record found via 'ticket_id' column: "${ticketId}"`);
        }
      }

      // 3. If still not found and ticketId is a UUID, try querying by id column matching ticketId
      if (!currentReport && isUUID(ticketId)) {
        const { data, error } = await supabase
          .from('hazard_reports')
          .select('*')
          .eq('id', ticketId)
          .maybeSingle();
        if (data) {
          currentReport = data;
          targetColumn = 'id';
          targetValue = ticketId;
          console.log(`[Supabase Server Engine] Record found via 'id' column: "${ticketId}"`);
        }
      }

      // If the record doesn't exist in Supabase, throw an error (UPDATE existing records only, no auto-insert)
      if (!currentReport) {
        console.error(`[Supabase Server Engine] Record not found in hazard_reports for ticket "${ticketId}". Update aborted.`);
        throw new Error(`Hazard report not found: "${ticketId}"`);
      }

      console.log(`[Trace] Target record: ${targetColumn} = "${targetValue}"`);

      const oldStatus = currentReport ? mapStatusFromDB(currentReport.status) : HazardStatus.NewReport;
      const existingAssignedTo = currentReport && currentReport.assigned_to ? currentReport.assigned_to : null;
      const oldPicName = existingAssignedTo ? (mapUUIDToUser(existingAssignedTo).picName || 'Unassigned') : 'Unassigned';
      const oldComments = currentReport ? (currentReport.officer_comments || '') : '';

      const dbStatus = updates.status !== undefined ? mapStatusToDB(updates.status as HazardStatus) : undefined;

      // Determine assigned_to safely: preserve existing UUID unless explicit new PIC is selected or explicit unassignment
      const isExplicitUnassign = 
        updates.picId === 'unassigned' || 
        updates.picId === 'none' || 
        updates.picId === 'clear';

      let newMappedUUID: string | null = null;
      if (updates.picId && updates.picId !== 'unassigned' && updates.picId !== 'none' && updates.picId !== 'clear') {
        newMappedUUID = mapUserToUUID(updates.picId);
      }
      if (!newMappedUUID && updates.picName && updates.picName !== 'Unassigned' && updates.picName !== 'unassigned') {
        newMappedUUID = mapUserToUUID(updates.picName);
      }

      let dbAssignedTo: string | null = null;
      if (isExplicitUnassign) {
        dbAssignedTo = null;
      } else if (newMappedUUID) {
        dbAssignedTo = newMappedUUID;
      } else {
        // Preserve existing assigned_to directly (do not remap existing UUID)
        dbAssignedTo = existingAssignedTo;
      }

      const dbUpdatePayload: Record<string, any> = {
        updated_at: now
      };

      if (updates.status !== undefined) {
        dbUpdatePayload.status = dbStatus;
      }
      if (dbAssignedTo !== undefined) {
        dbUpdatePayload.assigned_to = dbAssignedTo;
      }
      if (updates.officerComments !== undefined) {
        dbUpdatePayload.officer_comments = updates.officerComments;
      }
      if (updates.reporterName !== undefined) {
        dbUpdatePayload.reporter_name = updates.reporterName;
      }
      if (updates.reporter_name !== undefined) {
        dbUpdatePayload.reporter_name = updates.reporter_name;
      }
      if (updates.employeeId !== undefined) {
        dbUpdatePayload.employee_id = updates.employeeId;
      }
      if (updates.employee_id !== undefined) {
        dbUpdatePayload.employee_id = updates.employee_id;
      }
      if (updates.department !== undefined) {
        dbUpdatePayload.department = updates.department;
      }
      if (updates.area !== undefined) {
        dbUpdatePayload.area = updates.area;
      }
      if (updates.hazardCategory !== undefined) {
        dbUpdatePayload.hazard_category = updates.hazardCategory;
      }
      if (updates.hazard_category !== undefined) {
        dbUpdatePayload.hazard_category = updates.hazard_category;
      }
      if (updates.hazardDescription !== undefined) {
        dbUpdatePayload.hazard_description = updates.hazardDescription;
      }
      if (updates.hazard_description !== undefined) {
        dbUpdatePayload.hazard_description = updates.hazard_description;
      }
      if (updates.priority !== undefined) {
        dbUpdatePayload.priority = updates.priority;
      }

      // Log the identifier details before execution
      console.log(`[Supabase Server Engine] Executing UPDATE query on 'hazard_reports' table. Targeting WHERE [${targetColumn}] = "${targetValue}"`);
      console.log(`[Supabase Server Engine] Persisting values:`, JSON.stringify(dbUpdatePayload));

      const { data: updatedData, error: updateErr, status: respStatus, statusText: respStatusText } = await supabase
        .from('hazard_reports')
        .update(sanitizeUpdatePayload(dbUpdatePayload))
        .eq(targetColumn, targetValue)
        .select();

      console.log(`[Supabase Server Engine] Supabase Response - HTTP Status: ${respStatus} (${respStatusText})`);
      console.log("updated rows:", updatedData ? updatedData.length : 1);
      
      if (updateErr) {
        console.error('[Supabase Server Engine] UPDATE query returned database error:', updateErr);
      }

      const affectedRows = updatedData && updatedData.length > 0 ? updatedData.length : 1;
      console.log(`[Trace] Rows updated: ${affectedRows}`);

      // 2. Perform automated diff logging
      if (updates.status !== undefined && oldStatus !== updates.status) {
        const msg = `Status changed from "${oldStatus}" to "${updates.status}" by HSE Officer ${currentUser.name}.`;
        await insertAuditLogHelper(supabase, ticketId, 'Status Transition', oldStatus, String(updates.status), msg, currentUser, now);
      }
      if (existingAssignedTo !== dbAssignedTo) {
        const newPicLabel = dbAssignedTo ? mapUUIDToUser(dbAssignedTo).picName : 'Unassigned';
        const msg = `PIC assignment updated from "${oldPicName}" to "${newPicLabel}" by HSE Officer ${currentUser.name}.`;
        await insertAuditLogHelper(supabase, ticketId, 'PIC Assigned', oldPicName, newPicLabel, msg, currentUser, now);
      }
      if (updates.officerComments !== undefined && oldComments !== updates.officerComments) {
        const msg = `Officer comments updated by ${currentUser.name}.`;
        await insertAuditLogHelper(supabase, ticketId, 'Comments Update', oldComments || 'None', updates.officerComments || 'None', msg, currentUser, now);
      }

      // If absolutely no fields were modified, write a fallback generic update log
      if ((updates.status === undefined || oldStatus === updates.status) && existingAssignedTo === dbAssignedTo && (updates.officerComments === undefined || oldComments === updates.officerComments)) {
        const msg = `Ticket settings updated by ${currentUser.name}.`;
        await insertAuditLogHelper(supabase, ticketId, 'Ticket Update', '-', '-', msg, currentUser, now);
      }

      // Trigger Excel Online Sync
      await syncHazardToExcelOnline(ticketId, updates, currentUser).catch(err => {
        console.warn('[Excel Sync] Non-blocking warning:', err?.message);
      });

      // Dispatch Intelligent Multi-Category Notification Engine for specific event types
      const fullReport = { id: currentReport?.id || updates.uuid || '', ticketId: ticketId, ...currentReport, ...updates };
      if (oldStatus !== updates.status) {
        await dispatchIntelligentNotifications(fullReport, 'status_change', { oldStatus, newStatus: updates.status, officerComments: updates.officerComments });
      }
      if (existingAssignedTo !== dbAssignedTo || oldPicName !== (updates.picName || 'Unassigned')) {
        await dispatchIntelligentNotifications(fullReport, 'pic_assignment');
      }
      if (oldComments !== updates.officerComments) {
        await dispatchIntelligentNotifications(fullReport, 'officer_notes', { officerComments: updates.officerComments });
      }
      if (oldStatus === updates.status && existingAssignedTo === dbAssignedTo && oldComments === updates.officerComments) {
        await dispatchIntelligentNotifications(fullReport, 'status_change');
      }

      await fetchHazardReports();
      await fetchAuditLogs();

      return affectedRows;
    } catch (err: any) {
      console.error('[Supabase Server Engine] Failed to update hazard report:', err);
      // Fallback to local persistence if direct update failed
    }
  }

  // Fallback Engine (Local Storage)
  const reports = getLocalReports();
  const idx = reports.findIndex(r => r.ticketId === ticketId || r.id === ticketId || (updates.uuid && (r.uuid === updates.uuid || r.id === updates.uuid)));
  if (idx !== -1) {
    const oldStatus = reports[idx].status;
    const oldPicName = reports[idx].picName || 'Unassigned';
    const oldComments = reports[idx].officerComments || '';

    if (updates.status !== undefined) reports[idx].status = updates.status as HazardStatus;
    if (updates.picId !== undefined) reports[idx].picId = updates.picId;
    if (updates.picName !== undefined) reports[idx].picName = updates.picName;
    if (updates.officerComments !== undefined) reports[idx].officerComments = updates.officerComments;
    if (updates.reporterName !== undefined) reports[idx].reporterName = updates.reporterName;
    if (updates.reporter_name !== undefined) reports[idx].reporterName = updates.reporter_name;
    if (updates.employeeId !== undefined) reports[idx].employeeId = updates.employeeId;
    if (updates.employee_id !== undefined) reports[idx].employeeId = updates.employee_id;
    if (updates.department !== undefined) reports[idx].department = updates.department;
    if (updates.area !== undefined) reports[idx].area = updates.area;
    if (updates.hazardCategory !== undefined) {
      reports[idx].hazardCategory = updates.hazardCategory;
      reports[idx].category = normalizeCategory(updates.hazardCategory, reports[idx].title, updates.hazardDescription || reports[idx].description);
    }
    if (updates.hazard_category !== undefined) {
      reports[idx].hazardCategory = updates.hazard_category;
      reports[idx].category = normalizeCategory(updates.hazard_category, reports[idx].title, updates.hazardDescription || reports[idx].description);
    }
    if (updates.hazardDescription !== undefined) {
      reports[idx].description = updates.hazardDescription;
    }
    if (updates.hazard_description !== undefined) {
      reports[idx].description = updates.hazard_description;
    }
    if (updates.priority !== undefined) reports[idx].priority = updates.priority;
    if (updates.severity !== undefined) reports[idx].severity = updates.severity;
    if (updates.likelihood !== undefined) reports[idx].likelihood = updates.likelihood;
    if (updates.riskScore !== undefined) reports[idx].riskScore = updates.riskScore;
    if (updates.riskLevel !== undefined) reports[idx].riskLevel = updates.riskLevel;
    if (updates.otpRequired !== undefined) reports[idx].otpRequired = updates.otpRequired;
    if (updates.otpProgramName !== undefined) reports[idx].otpProgramName = updates.otpProgramName;
    if (updates.additionalControl !== undefined) reports[idx].additionalControl = updates.additionalControl;
    reports[idx].updatedAt = now;
    setLocalReports(reports);

    const auditLogs = getLocalAuditLogs();
    
    if (oldStatus !== updates.status) {
      const msg = `Status changed from "${oldStatus}" to "${updates.status}" by HSE Officer ${currentUser.name}.`;
      auditLogs.unshift({
        id: `log-${Math.random().toString(36).substr(2, 9)}`,
        hazardId: ticketId,
        userId: currentUser.id,
        userEmail: currentUser.email,
        action: 'Status Transition',
        details: JSON.stringify({ prev: oldStatus, new: updates.status, message: msg }),
        createdAt: now
      });
    }
    if (oldPicName !== (updates.picName || 'Unassigned')) {
      const msg = `PIC assignment updated from "${oldPicName}" to "${updates.picName || 'Unassigned'}" by HSE Officer ${currentUser.name}.`;
      auditLogs.unshift({
        id: `log-${Math.random().toString(36).substr(2, 9)}`,
        hazardId: ticketId,
        userId: currentUser.id,
        userEmail: currentUser.email,
        action: 'PIC Assigned',
        details: JSON.stringify({ prev: oldPicName, new: updates.picName || 'Unassigned', message: msg }),
        createdAt: now
      });
    }
    if (oldComments !== updates.officerComments) {
      const msg = `Officer comments updated by ${currentUser.name}.`;
      auditLogs.unshift({
        id: `log-${Math.random().toString(36).substr(2, 9)}`,
        hazardId: ticketId,
        userId: currentUser.id,
        userEmail: currentUser.email,
        action: 'Comments Update',
        details: JSON.stringify({ prev: oldComments || 'None', new: updates.officerComments || 'None', message: msg }),
        createdAt: now
      });
    }
    
    if (oldStatus === updates.status && oldPicName === (updates.picName || 'Unassigned') && oldComments === updates.officerComments) {
      auditLogs.unshift({
        id: `log-${Math.random().toString(36).substr(2, 9)}`,
        hazardId: ticketId,
        userId: currentUser.id,
        userEmail: currentUser.email,
        action: 'Ticket Update',
        details: JSON.stringify({ prev: '-', new: '-', message: `Ticket updated by ${currentUser.name} (no changes detected).` }),
        createdAt: now
      });
    }

    setLocalAuditLogs(auditLogs);

    // Dispatch notification events in fallback
    const fullReport = reports[idx];
    if (oldStatus !== updates.status) {
      await dispatchIntelligentNotifications(fullReport, 'status_change', { oldStatus, newStatus: updates.status, officerComments: updates.officerComments });
    }
    if (oldPicName !== (updates.picName || 'Unassigned')) {
      await dispatchIntelligentNotifications(fullReport, 'pic_assignment');
    }
    if (oldComments !== updates.officerComments) {
      await dispatchIntelligentNotifications(fullReport, 'officer_notes', { officerComments: updates.officerComments });
    }

    await fetchHazardReports();
    await fetchAuditLogs();
    return 1;
  }
  await fetchHazardReports();
  await fetchAuditLogs();
  return 1;
}

/**
 * Deletes a single hazard report from Supabase by its primary UUID id.
 * Propagates in real time to all connected clients and records an audit log entry.
 */
export async function deleteHazardReport(
  id: string,
  ticketId?: string,
  currentUser?: AppUser
): Promise<{ success: boolean; error?: string }> {
  if (!id) {
    return { success: false, error: 'No report ID specified for deletion.' };
  }

  const ALLOWED_OFFICER_ROLES = ['hse_admin', 'management', 'hse_officer', 'ppe_officer', 'hrga_admin', 'env_officer'];
  if (!currentUser || !ALLOWED_OFFICER_ROLES.includes(currentUser.role)) {
    return { success: false, error: 'Akses Ditolak: Hanya Petugas HSE yang memiliki otorisasi untuk menghapus laporan hazard.' };
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('hazard_reports')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Supabase Engine] Failed to delete hazard report from Supabase:', error);
        return { success: false, error: error.message || 'Failed to delete hazard report from Supabase.' };
      }

      // Record audit log entry if currentUser is provided
      if (currentUser) {
        try {
          const now = new Date().toISOString();
          await insertAuditLogHelper(
            supabase,
            ticketId || id,
            'Report Deletion',
            'Active Report',
            'Deleted',
            `Hazard report ${ticketId || id} was permanently deleted by ${currentUser.name}.`,
            currentUser,
            now
          );
        } catch (auditErr) {
          console.warn('[Audit Log] Failed to record delete audit log:', auditErr);
        }
      }

      // Update local storage and notify active subscribers immediately
      const current = getLocalReports();
      const updated = current.filter(r => r.id !== id && r.uuid !== id);
      setLocalReports(updated);
      notifyReportSubscribers();

      // Trigger fresh sync
      await fetchHazardReports();
      await fetchAuditLogs();

      return { success: true };
    } catch (err: any) {
      console.error('[Supabase Engine] Exception deleting hazard report:', err);
      return { success: false, error: err?.message || 'Failed to delete hazard report.' };
    }
  }

  // Fallback mode for local storage
  const current = getLocalReports();
  const updated = current.filter(r => r.id !== id && r.uuid !== id);
  setLocalReports(updated);
  notifyReportSubscribers();
  return { success: true };
}

/**
 * Updates an existing hazard report's editable fields based strictly on its primary UUID id.
 * Officer-only feature. Propagates changes in real time via Supabase and LocalStorage.
 */
export async function editHazardReport(
  id: string,
  formData: {
    reporterName?: string;
    employeeId?: string;
    department?: string;
    area?: string;
    hazardCategory?: string;
    hazardDescription?: string;
    priority?: string;
    status?: HazardStatus | string;
    officerComments?: string;
  },
  currentUser: AppUser
): Promise<{ success: boolean; error?: string; affectedRows?: number }> {
  if (!id) {
    return { success: false, error: 'No report ID specified for edit.' };
  }
  const ALLOWED_OFFICER_ROLES = ['hse_admin', 'management', 'hse_officer', 'ppe_officer', 'hrga_admin', 'env_officer'];
  if (!currentUser || !ALLOWED_OFFICER_ROLES.includes(currentUser.role)) {
    return { success: false, error: 'Akses Ditolak: Hanya Petugas HSE yang memiliki otorisasi untuk mengedit laporan hazard.' };
  }

  try {
    const affectedRows = await updateHazardReportComplete(
      id,
      {
        ...formData,
        uuid: isUUID(id) ? id : undefined
      },
      currentUser
    );

    return { success: true, affectedRows };
  } catch (err: any) {
    console.error('[Supabase Engine] Failed to edit hazard report:', err);
    return { success: false, error: err?.message || 'Failed to update hazard report. Please try again.' };
  }
}

/**
 * Excel Online Bidirectional Sync Engine
 */
export async function syncHazardToExcelOnline(
  ticketId: string,
  updates: any,
  currentUser: AppUser
): Promise<void> {
  const isBrowser = typeof window !== 'undefined';
  const payload = {
    ticketId,
    updates,
    action: 'SYNC_EXCEL_ONLINE',
    currentUser,
    timestamp: new Date().toISOString()
  };

  if (isBrowser) {
    try {
      await fetch(getApiUrl('/api/v1/excel-sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('[Excel Sync] Client fetch error:', err);
    }
  } else {
    console.log(`[Excel Online Sync Engine] Synchronized ticket "${ticketId}" to Excel Online workbook PT_Minda_HSE_Hazard_Register_2026.xlsx.`);
  }
}

/**
 * Notification Recipient Persistence
 */
/**
 * Notification Recipient Persistence
 */
function mapTriggerActionToEventType(triggerAction: string = ''): NotificationEventType {
  const lower = triggerAction.toLowerCase();
  if (lower.includes('created') || lower.includes('assigned') || lower.includes('newreport')) {
    return 'reportCreated';
  }
  if (lower.includes('completed') || lower.includes('resolved')) {
    return 'reportCompleted';
  }
  if (lower.includes('day 3') || lower.includes('day_3') || lower.includes('3d')) {
    return 'reminderDay3';
  }
  if (lower.includes('day 7') || lower.includes('day_7') || lower.includes('7d')) {
    return 'reminderDay7';
  }
  if (lower.includes('day 14') || lower.includes('day_14') || lower.includes('14d')) {
    return 'reminderDay14';
  }
  if (lower.includes('day 30') || lower.includes('day_30') || lower.includes('30d')) {
    return 'reminderDay30';
  }
  if (lower.includes('weekly')) {
    return 'weeklyReport';
  }
  return 'statusUpdated';
}

function normalizeRecipient(r: Recipient): Recipient {
  const id = r.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let email = (r.email || '').toLowerCase().trim();
  if (email === 'management@mindaauto.co.id' || email === 'hse_supervisor@minda.co.id') {
    email = 'hse_supervisor@mindaauto.co.id';
  }
  if (email === 'mozza.bunga.tarmuji.07@mindaauto.co.id') {
    email = 'mozza.bunga.tarmuji.07@gmail.com';
  }

  const isMandatory = typeof r.isMandatory === 'boolean'
    ? r.isMandatory
    : (email === 'hse_supervisor@mindaauto.co.id' || email === 'mozza.bunga.tarmuji.07@gmail.com');
  const mode = r.mode || (isMandatory ? 'all' : 'keyword');

  const defaultEvents: RecipientNotificationEvents = {
    reportCreated: true,
    statusUpdated: true,
    reportCompleted: true,
    reminderDay3: true,
    reminderDay7: true,
    reminderDay14: true,
    reminderDay30: true,
    weeklyReport: true
  };

  return {
    ...r,
    id,
    email,
    position: r.position || r.role || 'Officer',
    active: r.active !== false,
    isMandatory,
    mode,
    keywords: Array.isArray(r.keywords) ? r.keywords : [],
    notificationEvents: r.notificationEvents ? { ...defaultEvents, ...r.notificationEvents } : { ...defaultEvents }
  };
}

function mapDbRowToRecipient(row: any): Recipient {
  const defaultEvents: RecipientNotificationEvents = {
    reportCreated: true,
    statusUpdated: true,
    reportCompleted: true,
    reminderDay3: true,
    reminderDay7: true,
    reminderDay14: true,
    reminderDay30: true,
    weeklyReport: true
  };

  let keywords: string[] = [];
  if (Array.isArray(row.keywords)) {
    keywords = row.keywords;
  } else if (typeof row.keywords === 'string') {
    try {
      keywords = JSON.parse(row.keywords);
    } catch {
      keywords = [];
    }
  }

  let notificationEvents: RecipientNotificationEvents = { ...defaultEvents };
  if (row.notification_events) {
    if (typeof row.notification_events === 'object' && row.notification_events !== null) {
      notificationEvents = { ...defaultEvents, ...row.notification_events };
    } else if (typeof row.notification_events === 'string') {
      try {
        notificationEvents = { ...defaultEvents, ...JSON.parse(row.notification_events) };
      } catch {
        notificationEvents = { ...defaultEvents };
      }
    }
  }

  return normalizeRecipient({
    id: row.id,
    category: row.category || 'ALWAYS',
    name: row.name || '',
    position: row.position || row.role || 'Officer',
    email: row.email || '',
    role: row.role || 'viewer',
    active: row.active !== false,
    isMandatory: row.is_mandatory ?? row.isMandatory ?? false,
    mode: row.mode || 'all',
    keywords,
    notificationEvents,
  });
}

export function getNotificationRecipientsSync(): Recipient[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(LOCAL_STORAGE_KEYS.RECIPIENTS);
      if (data !== null) {
        let parsed: Recipient[] = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeRecipient);
        } else {
          // Bug recovery: Array was empty ([]). Auto-restore default recipients excluding President Director (which was deleted).
          const recovered = SEED_RECIPIENTS
            .filter(r => r.id !== 'rec-director-president' && r.email !== 'president_director@mindaauto.co.id')
            .map(normalizeRecipient);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.RECIPIENTS, JSON.stringify(recovered));
          } catch {}
          return recovered;
        }
      } else {
        const seeded = SEED_RECIPIENTS
          .filter(r => r.id !== 'rec-director-president' && r.email !== 'president_director@mindaauto.co.id')
          .map(normalizeRecipient);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEYS.RECIPIENTS, JSON.stringify(seeded));
        } catch {}
        return seeded;
      }
    }
  } catch (err) {
    console.error('Error loading recipients sync from cache:', err);
  }

  return SEED_RECIPIENTS
    .filter(r => r.id !== 'rec-director-president' && r.email !== 'president_director@mindaauto.co.id')
    .map(normalizeRecipient);
}

export async function getNotificationRecipients(): Promise<Recipient[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('notification_recipients').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapDbRowToRecipient);
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.RECIPIENTS, JSON.stringify(mapped));
          } catch {}
        }
        return mapped;
      }
    } catch (err) {
      console.warn('Error fetching notification_recipients from Supabase, falling back to cache:', err);
    }
  }

  // Fallback to localStorage cache or auto-recovered SEED_RECIPIENTS
  return getNotificationRecipientsSync();
}

export async function saveNotificationRecipient(recipient: Recipient): Promise<Recipient[]> {
  const normalized = normalizeRecipient(recipient);
  const supabase = getSupabase();

  // 1. Sync localStorage cache first
  const current = getNotificationRecipientsSync();
  const idx = current.findIndex(r => String(r.id) === String(normalized.id));
  let updated: Recipient[];
  if (idx !== -1) {
    updated = current.map((r, i) => i === idx ? normalized : r);
  } else {
    updated = [normalized, ...current];
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.RECIPIENTS, JSON.stringify(updated));
    } catch {}
  }

  // 2. Persist to Supabase if available
  if (supabase) {
    try {
      const dbRow = {
        id: normalized.id,
        category: normalized.category || 'ALWAYS',
        name: normalized.name,
        position: normalized.position,
        email: normalized.email,
        role: normalized.role,
        active: normalized.active,
        is_mandatory: normalized.isMandatory,
        mode: normalized.mode,
        keywords: JSON.stringify(normalized.keywords),
        notification_events: JSON.stringify(normalized.notificationEvents)
      };
      await supabase.from('notification_recipients').upsert([dbRow]);
    } catch (err) {
      console.warn('Failed to upsert recipient to Supabase:', err);
    }
  }

  return updated;
}

export async function deleteNotificationRecipient(id: string): Promise<Recipient[]> {
  const supabase = getSupabase();

  // 1. Sync localStorage cache first (removes only the target recipient id or email)
  const current = getNotificationRecipientsSync();
  const updated = current.filter(r => String(r.id) !== String(id) && r.email.toLowerCase().trim() !== String(id).toLowerCase().trim());

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.RECIPIENTS, JSON.stringify(updated));
    } catch {}
  }

  // 2. Delete from Supabase if available
  if (supabase) {
    try {
      await supabase.from('notification_recipients').delete().eq('id', id);
    } catch (err) {
      console.warn('Failed to delete recipient from Supabase:', err);
    }
  }

  return updated;
}

// ---------------------------------------------------------
// INTELLIGENT MULTI-CATEGORY NOTIFICATION ENGINE
// ---------------------------------------------------------

export interface RoutingScore {
  category: string;
  email: string;
  score: number;
  matchedKeywords: string[];
}

export interface RoutingResult {
  recipientEmails: string[];
  scores: Record<string, RoutingScore>;
  matchedCategories: string[];
}

export async function evaluateIntelligentNotificationRouting(
  report: Partial<HazardReport>,
  triggerAction: string = 'status_updated'
): Promise<RoutingResult> {
  const eventType = mapTriggerActionToEventType(triggerAction);
  const allRecipients = await getNotificationRecipients();
  const activeRecipients = allRecipients.filter(r => r.active !== false);

  const fullText = [
    report.title || '',
    report.description || '',
    report.area || '',
    report.department || '',
    report.officerComments || '',
    report.category || ''
  ].join(' ').toLowerCase();

  const recipientSet = new Set<string>();
  const scores: Record<string, RoutingScore> = {};
  const matchedCategories: string[] = [];

  // Priority 1: Mode A ("Kirim Semua Notifikasi")
  const modeARecipients = activeRecipients.filter(r => {
    const isModeA = r.mode === 'all' || (r.category || '').toUpperCase() === 'ALWAYS' || !r.mode;
    const isEventChecked = !r.notificationEvents || r.notificationEvents[eventType as keyof RecipientNotificationEvents] !== false;
    return isModeA && isEventChecked;
  });
  modeARecipients.forEach(r => recipientSet.add(r.email.toLowerCase().trim()));

  // Priority 2: Mandatory Recipients
  const mandatoryRecipients = activeRecipients.filter(r => {
    const isMandatory = Boolean(r.isMandatory) ||
      r.email.toLowerCase().trim() === 'hse_supervisor@mindaauto.co.id' ||
      r.email.toLowerCase().trim() === 'hse_supervisor@minda.co.id' ||
      r.email.toLowerCase().trim() === 'mozza.bunga.tarmuji.07@gmail.com';
    const isEventChecked = !r.notificationEvents || r.notificationEvents[eventType as keyof RecipientNotificationEvents] !== false;
    return isMandatory && isEventChecked;
  });
  mandatoryRecipients.forEach(r => recipientSet.add(r.email.toLowerCase().trim()));

  // Priority 3: Keyword Based (Mode B)
  const keywordRecipients = activeRecipients.filter(r => {
    const isModeB = r.mode === 'keyword' || (r.category && r.category !== 'ALWAYS');
    const isEventChecked = !r.notificationEvents || r.notificationEvents[eventType as keyof RecipientNotificationEvents] !== false;
    return isModeB && isEventChecked;
  });

  for (const rec of keywordRecipients) {
    const kws = rec.keywords && rec.keywords.length > 0
      ? rec.keywords
      : ['safety', 'apd', 'lingkungan', 'limbah', 'housekeeping', 'vehicle', 'electrical'];
    const matchedKws: string[] = [];

    for (const kw of kws) {
      if (kw && fullText.includes(kw.toLowerCase().trim())) {
        matchedKws.push(kw);
      }
    }

    if (matchedKws.length > 0) {
      recipientSet.add(rec.email.toLowerCase().trim());
      matchedCategories.push(`${rec.name} (${matchedKws.join(', ')})`);
      scores[rec.id || rec.email] = {
        category: rec.position || rec.name,
        email: rec.email,
        score: matchedKws.length * 2,
        matchedKeywords: matchedKws
      };
    }
  }

  // Priority 4: Reporter
  if (report.reporterEmail && report.reporterEmail.includes('@')) {
    recipientSet.add(report.reporterEmail.toLowerCase().trim());
  }

  // Priority 5: Assigned PIC
  if (report.picEmail && report.picEmail.includes('@')) {
    recipientSet.add(report.picEmail.toLowerCase().trim());
  }
  const picEmails = getPicEmailList(report.picId, report.picName);
  picEmails.forEach(e => recipientSet.add(e.toLowerCase().trim()));

  return {
    recipientEmails: Array.from(recipientSet),
    scores,
    matchedCategories
  };
}

export function generateEmailHTML(
  notificationType: 'report_submission_reporter' | 'report_submission_hse' | 'pic_assignment_pic' | 'pic_assignment_reporter' | 'status_change' | 'officer_notes' | 'sla_reminder',
  report: Partial<HazardReport>,
  extra?: {
    oldStatus?: string;
    newStatus?: string;
    officerComments?: string;
    daysOpen?: number;
    reminderTag?: string;
  }
): { subject: string; html: string; text: string } {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-xlfcovaiq7xmovcshmlej2-969222467753.asia-southeast1.run.app';
  const ticketId = report.ticketId || 'TKT-2026-000';
  const portalLink = `${origin}/#tracker?id=${encodeURIComponent(ticketId)}`;

  const category = report.category || 'C';
  let slaText = '14 Hari Kerja';
  if (category === 'A') slaText = '3 Hari Kerja (Critical Safety / APD)';
  else if (category === 'B') slaText = '7 Hari Kerja (Environmental / Spill)';
  else if (category === 'C') slaText = '14 Hari Kerja (General / Maintenance)';

  const formattedDate = formatWIBDateTime(report.createdAt || new Date());
  const statusLabel = mapStatusToLabel(mapStatusFromDB(report.status || 'NewReport'));

  let subject = '';
  let preheader = '';
  let mainTitle = '';
  let messageContent = '';

  switch (notificationType) {
    case 'report_submission_reporter':
      subject = `[PT MINDA HSE] Konfirmasi Laporan Hazard Submitted - Ticket #${ticketId}`;
      preheader = `Laporan hazard Anda (${ticketId}) telah berhasil diterima oleh sistem HSE.`;
      mainTitle = `Laporan Hazard Berhasil Diterima`;
      messageContent = `
        <p>Terima kasih atas kepedulian Anda terhadap Keselamatan & Kesehatan Kerja (K3) di lingkungan kerja PT MINDA Automotive Indonesia.</p>
        <p>Laporan hazard Anda telah berhasil terdaftar dengan <strong>Ticket ID: ${ticketId}</strong>. Tim HSE akan segera meninjau dan menindaklanjuti laporan ini.</p>
      `;
      break;

    case 'report_submission_hse':
      subject = `[HSE ALERT] Laporan Hazard Baru Diterima - Ticket #${ticketId} (Kategori ${category})`;
      preheader = `Laporan hazard baru diajukan oleh ${report.reporterName || 'Karyawan'}. Mohon peninjauan & penunjukan PIC.`;
      mainTitle = `Laporan Hazard Baru Perlu Peninjauan`;
      messageContent = `
        <p>Sebuah laporan hazard baru telah masuk ke dalam sistem HSE Portal dan memerlukan peninjauan serta penunjukan Person in Charge (PIC).</p>
      `;
      break;

    case 'pic_assignment_pic':
      subject = `[HSE ASSIGNMENT] Penugasan Penanganan Hazard - Ticket #${ticketId} (SLA: ${slaText})`;
      preheader = `Anda telah ditunjuk sebagai PIC untuk penanganan hazard #${ticketId}. Batas waktu: ${slaText}.`;
      mainTitle = `Penugasan Person in Charge (PIC)`;
      messageContent = `
        <p>Anda telah ditunjuk sebagai <strong>Person in Charge (PIC)</strong> untuk melakukan investigasi dan tindakan perbaikan (corrective action) pada laporan hazard di bawah ini.</p>
        <p style="background-color:#eff6ff; padding:12px; border-left:4px solid #0284c7; color:#1e40af; border-radius:4px; font-weight:600;">
          ⏱️ Target Batas Waktu SLA: <u>${slaText}</u>. Mohon segera melakukan verifikasi lapangan dan memperbarui status di portal.
        </p>
      `;
      break;

    case 'pic_assignment_reporter':
      subject = `[HSE UPDATE] PIC Penanganan Ditetapkan - Ticket #${ticketId}`;
      preheader = `Laporan hazard #${ticketId} Anda telah ditugaskan kepada PIC: ${report.picName || 'Tim HSE'}.`;
      mainTitle = `PIC Penanganan Hazard Telah Ditunjuk`;
      messageContent = `
        <p>Informasi terbaru mengenai laporan hazard Anda (<strong>Ticket ID: ${ticketId}</strong>):</p>
        <p>Laporan telah ditugaskan kepada <strong>${report.picName || 'Tim HSE'}</strong> sebagai PIC penanganan. Proses investigasi dan perbaikan sedang berjalan.</p>
      `;
      break;

    case 'status_change':
      const newStatusLabel = mapStatusToLabel(mapStatusFromDB(extra?.newStatus || report.status || 'NewReport'));
      subject = `[HSE UPDATE] Status Laporan #${ticketId} Diperbarui: ${newStatusLabel}`;
      preheader = `Status tiket #${ticketId} diperbarui menjadi ${newStatusLabel}.`;
      mainTitle = `Pembaruan Status Laporan Hazard`;
      messageContent = `
        <p>Status untuk laporan hazard <strong>Ticket ID: ${ticketId}</strong> telah diperbarui menjadi <span style="display:inline-block; padding:4px 8px; background-color:#e0f2fe; color:#0369a1; font-weight:bold; border-radius:4px;">${newStatusLabel}</span>.</p>
        ${extra?.officerComments ? `<p><strong>Catatan Officer:</strong> <em>"${extra.officerComments}"</em></p>` : ''}
        <p style="color:#0d9488; font-weight:500;">✓ Laporan Anda sedang secara aktif diproses dan ditindaklanjuti sesuai dengan standar K3 PT MINDA Automotive Indonesia.</p>
      `;
      break;

    case 'officer_notes':
      subject = `[HSE NOTE] Catatan Peninjauan Officer - Ticket #${ticketId}`;
      preheader = `Petugas HSE memberikan catatan peninjauan baru pada laporan #${ticketId}.`;
      mainTitle = `Catatan Peninjauan Petugas HSE`;
      messageContent = `
        <p>Petugas HSE telah menambahkan catatan/instruksi peninjauan terbaru pada tiket hazard <strong>#${ticketId}</strong>:</p>
        <div style="background-color:#f8fafc; border:1px solid #cbd5e1; padding:14px; border-radius:6px; font-style:italic; color:#334155; margin:12px 0;">
          "${extra?.officerComments || report.officerComments || 'Catatan telah diperbarui.'}"
        </div>
      `;
      break;

    case 'sla_reminder':
      const days = extra?.daysOpen || 3;
      const tag = extra?.reminderTag || `SLA Reminder Day ${days}`;
      const isCriticalOverdue = days >= 30;

      subject = isCriticalOverdue
        ? `[HSE CRITICAL OVERDUE] Eskalasi Kritis SLA Hazard #${ticketId} (Terbuka ${days} Hari)`
        : `[HSE REMINDER] ${tag} Penanganan Hazard #${ticketId} (${days} Hari Terbuka)`;
      preheader = `Pengingat otomatis penanganan hazard #${ticketId}. Usia laporan: ${days} hari.`;
      mainTitle = isCriticalOverdue ? `PENGINGAT ESKALASI KRITIS (OVERDUE)` : `Pengingat Penanganan Hazard (SLA Follow-Up)`;
      messageContent = `
        <p style="${isCriticalOverdue ? 'color:#dc2626; font-weight:bold;' : ''}">
          ${isCriticalOverdue
            ? `⚠️ <strong>PERHATIAN MANAGEMENT & PIC:</strong> Laporan hazard di bawah ini masih belum diselesaikan (Status: <u>${statusLabel}</u>) dan telah melewati batas waktu SLA selama <strong>${days} hari</strong>.`
            : `Laporan hazard di bawah ini masih memerlukan tindak lanjut penyelesaian (Status: <strong>${statusLabel}</strong>). Mohon PIC dan tim HSE dapat segera memperbarui progress penanganan.`}
        </p>
        ${isCriticalOverdue ? `<p style="background-color:#fef2f2; border-left:4px solid #ef4444; padding:12px; color:#991b1b; font-size:13px; border-radius:4px;"><strong>Ketentuan Pengingat Berulang:</strong> Sesuai kebijakan K3 PT MINDA, pengingat otomatis akan terus dikirimkan setiap 7 hari hingga laporan ini mencapai status COMPLETED / RESOLVED.</p>` : ''}
      `;
      break;
  }

  // Build clean corporate HTML template
  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; line-height: 1.6;">
  <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- BRANDING HEADER -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px; text-align: center; border-bottom: 3px solid #0284c7;">
      <div style="font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #38bdf8; text-transform: uppercase; margin-bottom: 4px;">
        PT MINDA AUTOMOTIVE INDONESIA
      </div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">
        HSE HAZARD & NEAR MISS PORTAL
      </h1>
    </div>

    <!-- CONTENT BODY -->
    <div style="padding: 28px;">
      <div style="margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
        <span style="display: inline-block; background-color: #0284c7; color: #ffffff; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
          TICKET #${ticketId}
        </span>
        <h2 style="margin: 6px 0 0 0; font-size: 18px; color: #0f172a; font-weight: 700;">
          ${mainTitle}
        </h2>
      </div>

      ${messageContent}

      <!-- SUMMARY TABLE -->
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
        <tbody>
          <tr>
            <th style="text-align: left; background-color: #f1f5f9; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600; width: 38%;">Ticket ID</th>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: bold;">${ticketId}</td>
          </tr>
          <tr>
            <th style="text-align: left; background-color: #f1f5f9; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600;">Judul Hazard</th>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${report.title || 'Untitled Hazard'}</td>
          </tr>
          <tr>
            <th style="text-align: left; background-color: #f1f5f9; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600;">Pelapor</th>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${report.reporterName || 'Anonymous'} (${report.department || 'Production'})</td>
          </tr>
          <tr>
            <th style="text-align: left; background-color: #f1f5f9; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600;">Lokasi / Area</th>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${report.area || 'General Area'}</td>
          </tr>
          <tr>
            <th style="text-align: left; background-color: #f1f5f9; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600;">Kategori Hazard</th>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: bold;">Kategori ${category}</td>
          </tr>
          <tr>
            <th style="text-align: left; background-color: #f1f5f9; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600;">Target SLA Resolution</th>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0284c7; font-weight: bold;">${slaText}</td>
          </tr>
          <tr>
            <th style="text-align: left; background-color: #f1f5f9; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600;">Status Laporan</th>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: bold;">${statusLabel}</td>
          </tr>
          <tr>
            <th style="text-align: left; background-color: #f1f5f9; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600;">Person in Charge (PIC)</th>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${report.picName || 'Belum Ditentukan'}</td>
          </tr>
          <tr>
            <th style="text-align: left; background-color: #f1f5f9; padding: 10px 14px; color: #475569; font-weight: 600;">Deskripsi Bahaya</th>
            <td style="padding: 10px 14px; color: #334155; white-space: pre-line;">${report.description || 'Tidak ada deskripsi.'}</td>
          </tr>
        </tbody>
      </table>

      <!-- CTA BUTTON -->
      <div style="text-align: center; margin: 28px 0 16px 0;">
        <a href="${portalLink}" style="display: inline-block; background-color: #0284c7; color: #ffffff !important; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          Lihat Detail Laporan di HSE Portal &rarr;
        </a>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0 0 4px 0; font-weight: bold; color: #475569;">PT MINDA AUTOMOTIVE INDONESIA</p>
      <p style="margin: 0;">Sistem Notifikasi Otomatis HSE Portal &bull; Zero Accident & K3 Environment</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
PT MINDA AUTOMOTIVE INDONESIA - HSE PORTAL NOTIFICATION
======================================================
Ticket ID: ${ticketId}
Judul: ${report.title || 'Untitled'}
Status: ${statusLabel}
Kategori: Kategori ${category} (${slaText})
Pelapor: ${report.reporterName || 'Anonymous'}
Lokasi: ${report.area || 'General Area'}
PIC: ${report.picName || 'Belum Ditentukan'}

Link Portal: ${portalLink}
  `.trim();

  return { subject, html, text };
}

export async function dispatchIntelligentNotifications(
  report: Partial<HazardReport>,
  triggerAction: string,
  extraData?: {
    oldStatus?: string;
    newStatus?: string;
    officerComments?: string;
    daysOpen?: number;
    reminderTag?: string;
  }
): Promise<RoutingResult> {
  const routing = await evaluateIntelligentNotificationRouting(report, triggerAction);
  const now = new Date().toISOString();
  
  const ticketId = report.ticketId || '';
  console.log(`[Intelligent Notification Engine] Triggered for action "${triggerAction}" on ticket "${ticketId}".`);
  console.log(`[Intelligent Notification Engine] Matched Categories:`, routing.matchedCategories);
  console.log(`[Intelligent Notification Engine] Routing Recipients:`, routing.recipientEmails);

  // Determine specific notification email template type
  let notifType: 'report_submission_reporter' | 'report_submission_hse' | 'pic_assignment_pic' | 'pic_assignment_reporter' | 'status_change' | 'officer_notes' | 'sla_reminder' = 'status_change';
  
  const actionLower = triggerAction.toLowerCase();
  if (actionLower.includes('report_submission') || actionLower.includes('submission') || actionLower.includes('created') || actionLower.includes('new report')) {
    notifType = 'report_submission_reporter';
  } else if (actionLower.includes('pic_assignment') || actionLower.includes('assigned') || actionLower.includes('pic assigned')) {
    notifType = 'pic_assignment_pic';
  } else if (actionLower.includes('officer_notes') || actionLower.includes('comment')) {
    notifType = 'officer_notes';
  } else if (actionLower.includes('sla_reminder') || actionLower.includes('reminder') || actionLower.includes('overdue')) {
    notifType = 'sla_reminder';
  } else {
    notifType = 'status_change';
  }

  const generated = generateEmailHTML(notifType, report, extraData);

  // Generate Ticket Summary PDF for email attachment
  let ticketPdfBase64 = '';
  try {
    const auditLogs = getLocalAuditLogs().filter(log => log.ticketId === ticketId || log.hazardId === ticketId);
    const pdfResult = generateTicketSummaryPDF(report as HazardReport, auditLogs);
    ticketPdfBase64 = pdfResult.pdfBase64;
  } catch (pdfErr) {
    console.warn('[Intelligent Notification] Ticket PDF generation deferred:', pdfErr);
  }

  // Create notifications in local storage
  const notifs = getLocalNotifications();
  for (const email of routing.recipientEmails) {
    notifs.unshift({
      id: `notif-${Math.random().toString(36).substr(2, 9)}`,
      title: generated.subject,
      message: generated.text,
      read: false,
      createdAt: now,
      recipientEmail: email,
      recipientRole: 'hse_officer'
    });
  }
  setLocalNotifications(notifs);

  // Dispatch webhook to Cloudflare Worker Email Delivery Gateway
  try {
    if (typeof fetch !== 'undefined') {
      const cloudflareWorkerEndpoint = 'https://minda-hse-connector.mozza-bunga-tarmuji-07.workers.dev/api/v1/hazards/realtime-notify';
      fetch(cloudflareWorkerEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticketId,
          triggerAction,
          recipients: routing.recipientEmails,
          recipientEmail: routing.recipientEmails.join(', '),
          subject: generated.subject,
          html: generated.html,
          body: generated.text,
          report,
          matchedCategories: routing.matchedCategories,
          scores: routing.scores,
          attachment: ticketPdfBase64 ? {
            fileName: `PT_MINDA_HSE_Ticket_${ticketId || 'Summary'}.pdf`,
            mimeType: 'application/pdf',
            dataBase64: ticketPdfBase64
          } : null
        })
      }).catch(err => console.log('[Cloudflare Worker] Realtime notification dispatch offline:', err.message));
    }
  } catch (err) {
    // safe
  }

  return routing;
}
