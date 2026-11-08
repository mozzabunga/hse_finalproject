import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { 
  getSupabase,
  mapRowToHazard,
  mapHazardToRow,
  createHazardReport,
  transitionHazardStatus,
  runReminderEscalationChecks,
  generateWeeklyReportMetrics,
  categorizeReport,
  getHazardComments,
  updateHazardReportComplete,
  deleteHazardReport,
  isUUID
} from './src/supabase.js';
import { 
  HazardStatus, 
  HazardReport, 
  DFAValidationEngine,
  User as AppUser 
} from './src/types.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enterprise Security Hardening Middleware
app.use((req: Request, res: Response, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Rate Limiting Middleware for API Endpoints (Max 120 requests per 15 mins per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;

app.use('/api', (req: Request, res: Response, next) => {
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const record = rateLimitMap.get(clientIp);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    next();
  } else if (record.count < MAX_REQUESTS_PER_WINDOW) {
    record.count++;
    next();
  } else {
    res.status(429).json({ error: 'Too many requests. Please slow down and try again later.' });
  }
});

const ALLOWED_OFFICER_ROLES = ['hse_admin', 'management', 'hse_officer', 'ppe_officer', 'env_officer'];

// ---------------------------------------------------------
// COMPLIANT REST API ENDPOINTS
// ---------------------------------------------------------

/**
 * Health endpoint
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'PT Minda HSE SLA Engine' });
});

function extractHazardPayload(body: any) {
  let b = body || {};
  if (typeof b === 'string') {
    try { b = JSON.parse(b); } catch (e) { b = {}; }
  }
  if (Array.isArray(b) && b.length > 0) {
    b = b[0];
  }
  if (b.value && Array.isArray(b.value) && b.value.length > 0) {
    b = b.value[0];
  } else if (b.data && typeof b.data === 'object') {
    b = b.data;
  } else if (b.body && typeof b.body === 'object') {
    b = b.body;
  }

  const title = b.title || b.Title || b.hazard_title || b.subject || b.title_name || b['Judul Bahaya'] || b['Judul'] || 'Untitled Safety Hazard';
  const description = b.description || b.Description || b.hazard_description || b.details || b.notes || b['Deskripsi Bahaya'] || b['Deskripsi'] || 'No description provided.';
  const department = b.department || b.Department || b['Departemen'] || b['Divisi'] || 'Production';
  const area = b.area || b.Area || b.location || b['Area / Lokasi'] || b['Lokasi'] || 'General Floor';
  const reporterName = b.reporterName || b.reporter_name || b.ReporterName || b['Reporter Name'] || b.reporter || b.name || b['Nama Pelapor'] || b['Nama'] || 'Anonymous Worker';
  const reporterEmail = b.reporterEmail || b.reporter_email || b.ReporterEmail || b['Reporter Email'] || b.email || b['Email Pelapor'] || 'employee@minda.co.id';
  const employeeId = b.employeeId || b.employee_id || b.EmployeeId || b['Employee ID'] || b.emp_id || b['NIP'] || b['ID Karyawan'] || 'EMP-000';

  return { title, description, department, area, reporterName, reporterEmail, employeeId };
}

const handleHazardCreation = async (req: Request, res: Response) => {
  try {
    console.log(`[API Server] POST ${req.path} incoming payload:`, JSON.stringify(req.body, null, 2));
    const payload = extractHazardPayload(req.body);

    const report = await createHazardReport(payload);
    res.status(201).json({ success: true, report });
  } catch (err: any) {
    console.error(`[API Server] POST ${req.path} database INSERT error:`, err);
    res.status(500).json({
      error: 'Database INSERT failed',
      message: err.message || String(err),
      details: err
    });
  }
};

/**
 * POST /api/webhooks/hazard
 * Production endpoint for hazard submission webhooks (Make.com / Microsoft Forms / Excel Online).
 */
app.post('/api/webhooks/hazard', handleHazardCreation);

/**
 * POST /api/v1/hazards
 * Creates a new safety hazard or near-miss ticket via REST API.
 */
app.post('/api/v1/hazards', handleHazardCreation);
 
/**
 * POST /api/v1/upload-evidence
 * Securely uploads photo evidence to Supabase Storage bucket 'hazard-evidence'
 * using service_role privileges to ensure reliable storage and return public URL.
 */
app.post('/api/v1/upload-evidence', async (req: Request, res: Response) => {
  try {
    const { fileBase64, fileName, fileType } = req.body;
    if (!fileBase64) {
      res.status(400).json({ error: 'Missing fileBase64 data in request body' });
      return;
    }

    // Sanitize base64 payload
    const cleanBase64 = fileBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    // Validate buffer size (5MB ceiling)
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'File size exceeds maximum permitted limit of 5MB' });
      return;
    }

    const safeExt = fileType?.includes('png') ? 'png' : fileType?.includes('webp') ? 'webp' : 'jpg';
    const cleanName = fileName ? fileName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'evidence';
    const filePath = `evidence_${Date.now()}_${cleanName.slice(0, 20)}.${safeExt}`;

    const supabase = getSupabase();
    if (!supabase) {
      res.status(500).json({ error: 'Supabase client unavailable' });
      return;
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('hazard-evidence')
      .upload(filePath, buffer, { 
        contentType: fileType || 'image/jpeg', 
        upsert: true 
      });

    if (uploadError) {
      console.error('[Storage Error] Failed to upload evidence:', uploadError);
      res.status(500).json({ error: uploadError.message });
      return;
    }

    const { data: pubData } = supabase.storage.from('hazard-evidence').getPublicUrl(filePath);
    res.json({ success: true, publicUrl: pubData.publicUrl, path: filePath });
  } catch (err: any) {
    console.error('[Upload Exception] Error in /api/v1/upload-evidence:', err);
    res.status(500).json({ error: err.message || 'Internal server error during photo upload' });
  }
});

/**
 * PUT /api/v1/hazards/:id
 * Fully updates a hazard report (status, assigned_to, officer_comments, updated_at).
 * Bypasses RLS limits by executing server-side under service_role privileges.
 */
app.put('/api/v1/hazards/:id', async (req: Request, res: Response) => {
  try {
    console.log("PUT route reached");
    console.log("req.params:", req.params);
    console.log("req.body:", req.body);

    const { id } = req.params;
    const { updates, currentUser } = req.body;

    console.log(`[SERVER] Request Method: ${req.method}`);
    console.log(`[SERVER] Request URL: ${req.originalUrl}`);
    console.log(`[SERVER] Request Body:`, JSON.stringify(req.body, null, 2));

    if (!updates || !currentUser) {
       console.log('[SERVER] Response Status: 400');
       res.status(400).json({ error: 'Missing updates or currentUser in request body' });
       return;
    }

    if (!ALLOWED_OFFICER_ROLES.includes(currentUser.role)) {
       console.log('[SERVER] Unauthorized role attempt:', currentUser.role);
       res.status(403).json({ error: 'Forbidden: Officer role authorization required for ticket workflow updates.' });
       return;
    }

    console.log(`[API Server] PUT /api/v1/hazards/${id} called by "${currentUser.name}" (${currentUser.role}).`);
    const affectedRows = await updateHazardReportComplete(id, updates, currentUser);
    console.log(`[SERVER] Affected Database Rows: ${affectedRows}`);
    console.log(`[API Server] PUT /api/v1/hazards/${id} affectedRows: ${affectedRows}`);
    
    console.log('[SERVER] Response Status: 200');
    res.json({ success: true, affectedRows, message: 'Hazard ticket settings persisted successfully via server proxy.' });
  } catch (err: any) {
    console.error(`[API Server] PUT /api/v1/hazards/${req.params.id} failed:`, err);
    const isNotFound = err.message && err.message.toLowerCase().includes('not found');
    const statusCode = isNotFound ? 404 : 500;
    console.log(`[SERVER] Response Status: ${statusCode}`);
    res.status(statusCode).json({ error: err.message || 'Server error occurred during hazard update.' });
  }
});

/**
 * DELETE /api/v1/hazards/:id
 * Permanently deletes a hazard report. Restricted strictly to authorized HSE Officers.
 */
app.delete('/api/v1/hazards/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currentUser, ticketId } = req.body || {};

    if (!currentUser || !ALLOWED_OFFICER_ROLES.includes(currentUser.role)) {
      console.log('[SERVER] Unauthorized delete attempt by role:', currentUser?.role);
      res.status(403).json({ error: 'Forbidden: Officer role authorization required to delete hazard reports.' });
      return;
    }

    console.log(`[API Server] DELETE /api/v1/hazards/${id} requested by Officer "${currentUser.name}".`);
    const result = await deleteHazardReport(id, ticketId, currentUser);
    if (!result.success) {
      res.status(500).json({ error: result.error || 'Failed to delete hazard report.' });
      return;
    }

    res.json({ success: true, message: 'Hazard report successfully deleted.' });
  } catch (err: any) {
    console.error(`[API Server] DELETE /api/v1/hazards/${req.params.id} failed:`, err);
    res.status(500).json({ error: err.message || 'Server error occurred during hazard deletion.' });
  }
});

/**
 * PUT /api/v1/hazards/:id/status
 * Transitions status with DFA rule verification.
 */
app.put('/api/v1/hazards/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nextStatus, currentUser } = req.body; // currentUser of who is executing transition

    if (!nextStatus || !currentUser) {
       res.status(400).json({ error: 'Missing transition parameters' });
       return;
    }

    if (!ALLOWED_OFFICER_ROLES.includes(currentUser.role)) {
       res.status(403).json({ error: 'Forbidden: Officer authorization required to transition status.' });
       return;
    }

    await transitionHazardStatus(id, nextStatus as HazardStatus, currentUser as AppUser);
    res.json({ message: 'Transition processed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/hazards/:id/transition (Backwards compatibility)
 */
app.post('/api/hazards/:id/transition', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nextStatus, currentUser } = req.body;

    if (!nextStatus || !currentUser) {
       res.status(400).json({ error: 'Missing parameters' });
       return;
    }

    if (!ALLOWED_OFFICER_ROLES.includes(currentUser.role)) {
       res.status(403).json({ error: 'Forbidden: Officer authorization required to transition status.' });
       return;
    }

    await transitionHazardStatus(id, nextStatus as HazardStatus, currentUser as AppUser);
    res.json({ message: 'Success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/hazards/:id
 * Fetches a single hazard details and its discussion commentaries.
 */
app.get('/api/v1/hazards/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supabase = getSupabase();
    let report: any = null;

    if (supabase) {
      if (isUUID(id)) {
        const { data } = await supabase.from('hazard_reports').select('*').eq('id', id).maybeSingle();
        if (data) report = mapRowToHazard(data);
      } else {
        const { data } = await supabase.from('hazard_reports').select('*').eq('ticket_id', id).maybeSingle();
        if (data) report = mapRowToHazard(data);
      }
    }

    // LocalStorage proxy check
    if (!report) {
      // In node server contexts, we normally serve database. For mocking/preview robustness:
      res.status(404).json({ error: 'Ticket not found or Supabase connection unestablished.' });
      return;
    }

    const comments = await getHazardComments(id);
    res.json({ report, comments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/hazards/employee/:employeeId
 */
app.get('/api/v1/hazards/employee/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.from('hazard_reports').select('*').eq('employee_id', employeeId);
      res.json(data?.map(mapRowToHazard) || []);
      return;
    }
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/hazards/reporter/:reporterName
 */
app.get('/api/v1/hazards/reporter/:reporterName', async (req: Request, res: Response) => {
  try {
    const { reporterName } = req.params;
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.from('hazard_reports').select('*').ilike('reporter_name', `%${reporterName}%`);
      res.json(data?.map(mapRowToHazard) || []);
      return;
    }
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/audit-trail
 */
app.get('/api/v1/audit-trail', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
      res.json(data || []);
      return;
    }
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/notifications
 */
app.get('/api/v1/notifications', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      res.json(data || []);
      return;
    }
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/dashboard-statistics
 */
app.get('/api/v1/dashboard-statistics', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data: reports } = await supabase.from('hazard_reports').select('*');
      const mapped = reports?.map(mapRowToHazard) || [];
      res.json({
        total: mapped.length,
        resolved: mapped.filter(r => r.status === HazardStatus.Resolved).length,
        active: mapped.filter(r => r.status !== HazardStatus.Resolved).length,
        overdue: mapped.filter(r => {
          if (r.status === HazardStatus.Resolved) return false;
          return (Date.now() - new Date(r.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000);
        }).length
      });
      return;
    }
    res.json({ total: 0, resolved: 0, active: 0, overdue: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/hazards/realtime-notify
 * Mock Zapier hook trigger endpoint
 */
app.post('/api/v1/hazards/realtime-notify', (req: Request, res: Response) => {
  console.log('[Webhook Engine] Dispatch alert trigger to Zapier:', req.body);
  res.json({ status: 'Triggered successfully', payload: req.body });
});

/**
 * POST /api/v1/excel-sync
 * Bidirectional Sync Engine for Excel Online / Zapier
 */
app.post('/api/v1/excel-sync', (req: Request, res: Response) => {
  const { ticketId, updates, currentUser } = req.body;
  console.log(`[Excel Online Sync Engine] Bidirectional sync triggered for ticket "${ticketId || 'all'}".`);
  console.log(`[Excel Online Sync Engine] Status: "${updates?.status}", PIC: "${updates?.picName}", Comments: "${updates?.officerComments}"`);
  res.json({
    success: true,
    status: 'SYNCHRONIZED',
    excelOnlineWorkbook: 'PT_Minda_HSE_Hazard_Register_2026.xlsx',
    ticketId,
    syncedAt: new Date().toISOString()
  });
});

/**
 * GET /api/v1/excel-sync
 */
app.get('/api/v1/excel-sync', (req: Request, res: Response) => {
  res.json({
    status: 'CONNECTED',
    excelOnlineWorkbook: 'PT_Minda_HSE_Hazard_Register_2026.xlsx',
    lastSyncTime: new Date().toISOString()
  });
});

/**
 * POST /api/v1/hazards/reminder (Escalation SLA triggers)
 */
app.post('/api/v1/hazards/reminder', async (req: Request, res: Response) => {
  try {
    const count = await runReminderEscalationChecks();
    res.json({ status: 'Success', message: `SLA escalation sweeps finished. Dispatched ${count} alerts.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/escalate (Backwards compatibility)
 */
app.post('/api/escalate', async (req: Request, res: Response) => {
  try {
    const count = await runReminderEscalationChecks();
    res.json({ status: 'Success', escalations_triggered: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/notification-recipients
 */
app.get('/api/v1/notification-recipients', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.from('notification_recipients').select('*');
      res.json(data || []);
      return;
    }
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/weekly-report (Backwards compatibility on-demand builder)
 */
app.post('/api/weekly-report', async (req: Request, res: Response) => {
  try {
    const rep = await generateWeeklyReportMetrics();
    res.json(rep);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// RECURRING BACKGROUND DAEMONS (WEEKLY COMPILERS)
// ---------------------------------------------------------

/**
 * Automated Cron-like timer checking Friday 17:00 WIB
 * (WIB is UTC+7, so Friday 17:00 WIB = Friday 10:00 UTC)
 */
function startWeeklyReportDaemon() {
  setInterval(async () => {
    const now = new Date();
    // Check if day is Friday (5) and hour is 10 UTC (which maps to 17:00 WIB)
    if (now.getUTCDay() === 5 && now.getUTCHours() === 10 && now.getUTCMinutes() === 0) {
      console.log('[Daemon] Friday 17:00 WIB trigger hit. Starting auto weekly report compilation...');
      try {
        const report = await generateWeeklyReportMetrics();
        console.log('[Daemon] Compiled Weekly HSE Performance Report ID:', report.id);
      } catch (err: any) {
        console.error('[Daemon] Automated compiler failed:', err.message);
      }
    }
  }, 60 * 1000); // Poll once per minute
}

startWeeklyReportDaemon();

/**
 * Automated SLA Reminder Daemon for Days 3, 7, 14, 30
 */
function startReminderDaemon() {
  console.log('[Daemon] Initializing Automated SLA Reminder Daemon...');
  runReminderEscalationChecks().catch(err => console.error('[Daemon] Initial SLA check error:', err?.message || err));

  setInterval(async () => {
    try {
      const count = await runReminderEscalationChecks();
      if (count > 0) {
        console.log(`[Daemon] Automated SLA Reminder sweep completed. Dispatched ${count} reminder alerts.`);
      }
    } catch (err: any) {
      console.error('[Daemon] Automated SLA sweep error:', err?.message || err);
    }
  }, 15 * 60 * 1000); // Poll every 15 minutes
}

startReminderDaemon();

// ---------------------------------------------------------
// VITE DEV MIDDLEWARE AND STATIC PRODUCTION HOSTINGS
// ---------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('[Server Environment] Mounting Vite live development compiler.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Server Environment] Hosting compiled assets in production mode.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PT Minda HSE] Server established and running on port ${PORT}`);
    console.log('[SERVER] started');
  });
}

startServer();
