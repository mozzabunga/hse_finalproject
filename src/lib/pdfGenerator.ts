import jsPDFModule, { jsPDF as jsPDFClass } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HazardReport, AuditLog, HazardStatus } from '../types';
import { mapStatusToLabel } from '../supabase';
import { formatWIBDate, formatWIBDateTime } from './dateUtils';
import { evaluateRiskIK01 } from './riskMatrixIK01';
import { getHazardSummary, parseHazardIncidentDetails, getHazardCategoryDisplay, hasValue } from './hazardPresentation';

function createJsPDF(options?: any) {
  const Ctor: any = jsPDFClass || jsPDFModule || (jsPDFModule as any)?.default || (jsPDFModule as any)?.jsPDF;
  if (typeof Ctor === 'function') {
    return new Ctor(options);
  }
  return new (jsPDFModule as any)(options);
}

/**
 * Generates a real, vector-based PDF document for the HSE Weekly Report.
 */
export function generateWeeklyReportPDF(
  reports: HazardReport[],
  auditLogs: AuditLog[],
  generatedBy: string = 'HSE System Administrator'
): { pdfBase64: string; blobUrl: string; weekId: string; weekStartDate: string; weekEndDate: string; totalReported: number; totalResolved: number; criticalCount: number } {
  const doc = createJsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStartDate = sevenDaysAgo.toISOString().split('T')[0];
  const weekEndDate = now.toISOString().split('T')[0];
  const weekNumber = Math.ceil((((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7);
  const weekId = `WK-${now.getFullYear()}-W${weekNumber < 10 ? '0' + weekNumber : weekNumber}-${Math.floor(100 + Math.random() * 900)}`;

  // Filter & Metrics
  const totalReported = reports.length;
  const isResolved = (s: HazardStatus) => s === HazardStatus.Resolved || s === HazardStatus.Completed;
  const totalResolved = reports.filter(r => isResolved(r.status)).length;
  const totalFullyResolved = reports.filter(r => r.status === HazardStatus.Resolved).length;
  const totalActive = reports.filter(r => !isResolved(r.status)).length;

  const newReportCount = reports.filter(r => r.status === HazardStatus.NewReport).length;
  const pendingValidationCount = reports.filter(r => r.status === HazardStatus.PendingValidation).length;
  const underInvestigationCount = reports.filter(r => r.status === HazardStatus.UnderInvestigation).length;
  const actionRequiredCount = reports.filter(r => r.status === HazardStatus.ActionRequired).length;
  const waitingProcurementCount = reports.filter(r => r.status === HazardStatus.WaitingProcurement).length;
  const implementationCount = reports.filter(r => r.status === HazardStatus.Implementation).length;
  const completedCount = reports.filter(r => r.status === HazardStatus.Completed).length;

  const overdueCount = reports.filter(r => {
    if (isResolved(r.status)) return false;
    const elapsed = now.getTime() - new Date(r.createdAt).getTime();
    return elapsed > 3 * 24 * 60 * 60 * 1000;
  }).length;

  const closedThisWeekCount = reports.filter(r => {
    if (!isResolved(r.status)) return false;
    const updated = new Date(r.updatedAt).getTime();
    return updated >= sevenDaysAgo.getTime();
  }).length;

  const criticalCount = reports.filter(r => (r.category as string) === 'A' || (r.category as string) === 'B' || (r.priority || '').toUpperCase() === 'HIGH').length;
  const slaComplianceRate = totalReported > 0 ? Math.round(((totalReported - overdueCount) / totalReported) * 100) : 100;

  // Calculate Average Resolution Time
  let totalResolutionTimeMs = 0;
  let resolvedWithDates = 0;
  reports.forEach(r => {
    if (isResolved(r.status) && r.updatedAt) {
      const duration = new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime();
      if (duration > 0) {
        totalResolutionTimeMs += duration;
        resolvedWithDates++;
      }
    }
  });
  const avgResolutionHours = resolvedWithDates > 0 ? (totalResolutionTimeMs / (resolvedWithDates * 3600000)).toFixed(1) : '24.0';

  // --- PAGE 1: COVER & EXECUTIVE SUMMARY ---
  // Top Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 38, 'F');

  doc.setFillColor(16, 185, 129); // emerald-500 accent line
  doc.rect(0, 38, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PT MINDA AUTOMOTIVE INDONESIA', 14, 16);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text('HSE HAZARD & NEAR MISS PORTAL — WEEKLY EXECUTIVE AUDIT REPORT', 14, 24);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Report Ref: ${weekId}  |  Week #${weekNumber}  |  Period: ${weekStartDate} to ${weekEndDate}`, 14, 32);

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 46, 182, 20, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('REPORT METADATA', 18, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated Date: ${formatWIBDateTime(now)}`, 18, 58);
  doc.text(`Generated By: ${generatedBy}`, 18, 62);
  doc.text(`Company Scope: PT Minda Automotive Indonesia (Plant Karawang)`, 110, 58);
  doc.text(`Audit System: Central HSE Incident & SLA Engine`, 110, 62);

  // Executive Summary Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('EXECUTIVE PERFORMANCE SUMMARY', 14, 75);

  // KPI Metric Cards Grid
  const kpis = [
    { title: 'Total Tickets', val: `${totalReported}`, color: [30, 41, 59] },
    { title: 'Resolved / Closed', val: `${totalResolved}`, color: [16, 185, 129] },
    { title: 'Active Tickets', val: `${totalActive}`, color: [234, 179, 8] },
    { title: 'Overdue Tickets', val: `${overdueCount}`, color: [239, 68, 68] },
    { title: 'Closed This Week', val: `${closedThisWeekCount}`, color: [14, 165, 233] },
    { title: 'Avg Resolution Time', val: `${avgResolutionHours} hrs`, color: [139, 92, 246] },
    { title: 'SLA Compliance %', val: `${slaComplianceRate}%`, color: slaComplianceRate >= 85 ? [16, 185, 129] : [239, 68, 68] }
  ];

  let cardX = 14;
  let cardY = 80;
  const cardW = 42;
  const cardH = 18;

  kpis.forEach((kpi, idx) => {
    if (idx > 0 && idx % 4 === 0) {
      cardX = 14;
      cardY += 22;
    }
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cardX, cardY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title.toUpperCase(), cardX + 3, cardY + 5);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, cardX + 3, cardY + 13);

    cardX += 46;
  });

  // Ticket Status Ledger Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('STATUS LEDGER BREAKDOWN', 14, 132);

  autoTable(doc, {
    startY: 136,
    head: [['Status Phase', 'Count', 'Percentage of Total', 'Operational Definition']],
    body: [
      ['New Report', `${newReportCount}`, `${totalReported ? ((newReportCount / totalReported) * 100).toFixed(1) : '0'}%`, 'Newly submitted hazard await initial triage'],
      ['Pending Validation', `${pendingValidationCount}`, `${totalReported ? ((pendingValidationCount / totalReported) * 100).toFixed(1) : '0'}%`, 'HSE Officer assigned for site check'],
      ['Under Investigation', `${underInvestigationCount}`, `${totalReported ? ((underInvestigationCount / totalReported) * 100).toFixed(1) : '0'}%`, 'Root cause analysis and corrective action planning'],
      ['Action Required', `${actionRequiredCount}`, `${totalReported ? ((actionRequiredCount / totalReported) * 100).toFixed(1) : '0'}%`, 'Maintenance / Procurement active remediation'],
      ['Waiting Procurement', `${waitingProcurementCount}`, `${totalReported ? ((waitingProcurementCount / totalReported) * 100).toFixed(1) : '0'}%`, 'Awaiting PO, vendor delivery, or APD materials'],
      ['Implementation', `${implementationCount}`, `${totalReported ? ((implementationCount / totalReported) * 100).toFixed(1) : '0'}%`, 'Material received; active repair/installation in progress'],
      ['Completed', `${completedCount}`, `${totalReported ? ((completedCount / totalReported) * 100).toFixed(1) : '0'}%`, 'Remediation finished; awaiting HSE final closure audit'],
      ['Resolved', `${totalFullyResolved}`, `${totalReported ? ((totalFullyResolved / totalReported) * 100).toFixed(1) : '0'}%`, 'HSE Coordinator verified hazard eliminated & closed']
    ],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 }
  });

  // Category Breakdown Summary
  const categoryCounts = {
    PPE: reports.filter(r => (r.category as string) === 'A' || /ppe|apd|helmet|gloves|shoes/i.test(r.title + r.description)).length,
    Machine: reports.filter(r => /machine|mesin|conveyor|press|guard|gear/i.test(r.title + r.description)).length,
    Electrical: reports.filter(r => /electrical|listrik|kabel|cable|panel|short/i.test(r.title + r.description)).length,
    Fire: reports.filter(r => /fire|api|apar|extinguisher|smoke|apron/i.test(r.title + r.description)).length,
    Environment: reports.filter(r => (r.category as string) === 'B' || /waste|limbah|spill|tumpahan|oil|oli|drain|bocor/i.test(r.title + r.description)).length,
    Transportation: reports.filter(r => /forklift|truck|truk|mobil|vehicle|parking/i.test(r.title + r.description)).length,
    Housekeeping: reports.filter(r => /housekeeping|cleaning|kotor|dirty|mop|mop|pantry|toilet/i.test(r.title + r.description)).length,
    Medical: reports.filter(r => /medical|first aid|p3k|injury|cedera|luka|obat/i.test(r.title + r.description)).length,
    Chemical: reports.filter(r => /chemical|bahan kimia|acid|thinner|solvent/i.test(r.title + r.description)).length,
    'Food/Catering': reports.filter(r => /food|catering|makanan|kantin|canteen|lunch/i.test(r.title + r.description)).length,
    Wildlife: reports.filter(r => /snake|ular|animal|hewan|bee|lebah|wasp/i.test(r.title + r.description)).length,
    Other: reports.filter(r => (r.category as string) === 'C').length
  };

  const finalY1 = (doc as any).lastAutoTable.finalY + 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('CATEGORY AUDIT SUMMARY', 14, finalY1);

  const catRows = Object.entries(categoryCounts).map(([cat, count]) => [
    cat,
    `${count}`,
    `${totalReported ? ((count / totalReported) * 100).toFixed(1) : '0'}%`
  ]);

  autoTable(doc, {
    startY: finalY1 + 4,
    head: [['Category Domain', 'Detected Incidents', 'Share %']],
    body: catRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 }
  });

  // --- PAGE 2: DEPARTMENT AUDIT & MANAGEMENT RECOMMENDATIONS ---
  doc.addPage();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 20, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 20, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DEPARTMENTAL ANALYSIS & AUDIT LEDGER', 14, 13);

  // Group by department
  const deptsMap: Record<string, { total: number; resolved: number; active: number; overdue: number }> = {};
  reports.forEach(r => {
    const d = r.department || 'Unspecified Department';
    if (!deptsMap[d]) {
      deptsMap[d] = { total: 0, resolved: 0, active: 0, overdue: 0 };
    }
    deptsMap[d].total++;
    if (isResolved(r.status)) deptsMap[d].resolved++;
    else deptsMap[d].active++;

    const elapsed = now.getTime() - new Date(r.createdAt).getTime();
    if (!isResolved(r.status) && elapsed > 3 * 24 * 60 * 60 * 1000) {
      deptsMap[d].overdue++;
    }
  });

  const deptRows = Object.entries(deptsMap).map(([dept, s]) => {
    const deptSla = s.total > 0 ? Math.round(((s.total - s.overdue) / s.total) * 100) : 100;
    return [dept, `${s.total}`, `${s.resolved}`, `${s.active}`, `${s.overdue}`, `${deptSla}%`];
  });

  autoTable(doc, {
    startY: 28,
    head: [['Department', 'Total Reports', 'Resolved', 'Active', 'Overdue', 'SLA Rate']],
    body: deptRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 }
  });

  // Management Recommendations
  const finalY2 = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('AUTOMATED HSE MANAGEMENT RECOMMENDATIONS', 14, finalY2);

  const recommendations: string[] = [];
  if (categoryCounts.PPE > 0) {
    recommendations.push(`• PPE/APD non-compliance detected (${categoryCounts.PPE} cases). Schedule mandatory safety helmet and glove refresher toolbox meetings.`);
  }
  if (categoryCounts.Transportation > 0) {
    recommendations.push(`• Transportation/Forklift hazards flagged (${categoryCounts.Transportation} cases). Enforce speed limits and visual warning beacons in loading bay.`);
  }
  if (categoryCounts.Environment > 0) {
    recommendations.push(`• Environmental/Oil leakage risks recorded (${categoryCounts.Environment} cases). Ensure spill kit availability in maintenance & chemical storage.`);
  }
  if (overdueCount > 0) {
    recommendations.push(`• SLA Escalation Notice: ${overdueCount} tickets are currently overdue (> 3 days). Accelerate procurement PO and vendor response cycles.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('• All safety metrics within optimal parameters. Continue routine daily HSE patrols and 5S housekeeping checks.');
  }

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, finalY2 + 4, 182, recommendations.length * 8 + 6, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  let recY = finalY2 + 10;
  recommendations.forEach(rec => {
    doc.text(rec, 18, recY);
    recY += 7;
  });

  // --- PAGE 3: COMPLETE TICKET LEDGER ---
  doc.addPage();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 20, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 20, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('COMPLETE INCIDENT & HAZARD TICKET LEDGER', 14, 13);

  const ledgerRows = reports.map(r => {
    const elapsedDays = Math.floor((now.getTime() - new Date(r.createdAt).getTime()) / 86400000);
    const tId = String(r.ticketId || r.id || 'N/A');
    const rTitle = String(r.title || '');
    return [
      tId,
      rTitle.length > 28 ? rTitle.substring(0, 28) + '...' : rTitle,
      String(r.reporterName || 'Anonymous'),
      String(r.department || 'N/A'),
      String(r.category || 'N/A'),
      String(r.priority || 'Normal'),
      String(r.picName || 'Unassigned'),
      String(mapStatusToLabel(r.status)),
      String(formatWIBDate(r.createdAt)),
      `${elapsedDays}d`
    ];
  });

  autoTable(doc, {
    startY: 28,
    head: [['Ticket ID', 'Title', 'Reporter', 'Dept', 'Cat', 'Priority', 'Assigned PIC', 'Status', 'Date', 'Days']],
    body: ledgerRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 20 },
      1: { cellWidth: 32 },
      7: { fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 285, 210, 12, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated automatically by PT MINDA HSE Portal v1.0.0  |  Timestamp: ${now.toISOString()}`, 14, 291);
    doc.text(`Page ${i} of ${totalPages}`, 180, 291);
  }

  const pdfOutput = doc.output('datauristring');
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);

  const pdfBase64 = pdfOutput.split(',')[1] || pdfOutput;

  return {
    pdfBase64,
    blobUrl,
    weekId,
    weekStartDate,
    weekEndDate,
    totalReported,
    totalResolved,
    criticalCount
  };
}

/**
 * Generates a clean vector PDF summary for an individual ticket (for email attachments or single downloads).
 */
export function generateTicketSummaryPDF(
  report: HazardReport,
  auditLogs: AuditLog[] = []
): { pdfBase64: string; blobUrl: string; fileName: string } {
  const doc = createJsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const ticketId = String(report?.ticketId || report?.id || 'N/A');
  const portalLink = typeof window !== 'undefined' ? `${window.location.origin}/#tracker?id=${ticketId}` : `https://ais-dev-xlfcovaiq7xmovcshmlej2-969222467753.asia-southeast1.run.app/#tracker?id=${ticketId}`;

  // Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 32, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PT MINDA AUTOMOTIVE INDONESIA', 14, 14);

  doc.setFontSize(10);
  doc.setTextColor(52, 211, 153);
  doc.text(`HAZARD INCIDENT REPORT AUDIT SUMMARY — ${ticketId}`, 14, 22);

  // Ticket Overview Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 40, 182, 50, 2, 2, 'FD');

  const summary = getHazardSummary(report || {});
  const parsed = parseHazardIncidentDetails(report || {});
  const hazardCat = getHazardCategoryDisplay(report || {});

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(String(summary), 18, 48);

  const riskEval = evaluateRiskIK01(report?.severity, report?.likelihood);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Reporter Name: ${String(report?.reporterName || 'Anonymous')}`, 18, 56);
  doc.text(`Employee ID: ${hasValue(report?.employeeId) ? String(report?.employeeId) : '-'}`, 18, 62);
  doc.text(`Department: ${hasValue(report?.department) ? String(report?.department) : '-'}`, 18, 68);
  doc.text(`Area Location: ${hasValue(report?.area) ? String(report?.area) : '-'}`, 18, 74);
  doc.text(`Reported Date: ${String(formatWIBDateTime(report?.createdAt))}`, 18, 80);

  doc.text(`Status: ${String(mapStatusToLabel(report?.status as HazardStatus))}`, 110, 56);
  doc.text(`Category / Type: ${String(hazardCat)}`, 110, 62);
  doc.text(`Risk Matrix (IK01): Sev ${riskEval.severity} × Like ${riskEval.likelihood} = Score ${riskEval.score} (${riskEval.level})`, 110, 68);
  doc.text(`Assigned PIC: ${hasValue(report?.picName) ? String(report?.picName) : 'Unassigned'}`, 110, 74);
  doc.text(`OTP Mandatory: ${riskEval.isOtpRequired ? 'YES (Score > 9)' : 'NO'} | Controls Required: ${riskEval.isAdditionalControlRequired ? 'YES' : 'NO'}`, 110, 80);

  // Detailed Description
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('HAZARD DESCRIPTION & FIELD DETAILS', 14, 98);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 102, 182, 35, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const descText = parsed.hazardDescription || 'No description provided.';
  const splitDesc = doc.splitTextToSize(descText, 174);
  if (splitDesc && splitDesc.length > 0) {
    doc.text(splitDesc, 18, 108);
  }

  if (report?.officerComments && typeof report.officerComments === 'string' && report.officerComments.trim().length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('HSE Officer Comments:', 18, 126);
    doc.setFont('helvetica', 'normal');
    const splitComments = doc.splitTextToSize(String(report.officerComments), 174);
    if (splitComments && splitComments.length > 0) {
      doc.text(splitComments, 18, 131);
    }
  }

  // Audit Trail Logs
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('AUDIT TRAIL & TRANSITION LOGS', 14, 145);

  const safeLogs = Array.isArray(auditLogs) ? auditLogs : [];
  const ticketLogs = safeLogs.filter(l => l && (l.hazardId === ticketId || l.ticketId === ticketId || (l.details && String(l.details).includes(ticketId)) || l.hazardId === report?.id));
  const logRows = ticketLogs.length > 0
    ? ticketLogs.map(l => [
        String(formatWIBDateTime(l.createdAt)),
        String(l.userEmail || 'system'),
        String(l.action || 'Updated'),
        String(l.details || '')
      ])
    : [[String(formatWIBDateTime(report?.createdAt)), String(report?.reporterEmail || 'system'), 'Report Submitted', 'Initial hazard report lodged into system']];

  autoTable(doc, {
    startY: 149,
    head: [['Timestamp', 'User', 'Action', 'Details']],
    body: logRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5 },
    margin: { left: 14, right: 14 }
  });

  // Footer & Direct Portal Link Box
  const finalY = ((doc as any).lastAutoTable?.finalY || 180) + 8;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, finalY, 182, 16, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('DIRECT PORTAL LINK FOR VERIFICATION', 18, finalY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129);
  doc.text(String(portalLink), 18, finalY + 11);

  // Footer
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 285, 210, 12, 'F');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated automatically by PT MINDA HSE Portal v1.0.0 | Ticket ${ticketId} Summary`, 14, 291);
  doc.text(`Generated Date: ${String(formatWIBDateTime(now))}`, 140, 291);

  const pdfOutput = doc.output('datauristring');
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  const pdfBase64 = pdfOutput.split(',')[1] || pdfOutput;
  const fileName = `PT_MINDA_HSE_Ticket_${ticketId || 'Summary'}.pdf`;

  return { pdfBase64, blobUrl, fileName };
}

/**
 * Generates an Executive KPI Summary PDF Report for Management & HSE Leadership.
 */
export function generateExecutiveSummaryPDF(
  reports: HazardReport[],
  generatedBy: string = 'HSE Executive Management'
): { pdfBase64: string; blobUrl: string; fileName: string } {
  const doc = createJsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const totalReports = reports.length;
  const isResolved = (s: HazardStatus) => s === HazardStatus.Resolved || s === HazardStatus.Completed;
  const openCount = reports.filter(r => !isResolved(r.status)).length;
  const closedCount = reports.filter(r => isResolved(r.status)).length;
  const pendingValidationCount = reports.filter(r => r.status === HazardStatus.NewReport || r.status === HazardStatus.PendingValidation).length;
  const underReviewCount = reports.filter(r => r.status === HazardStatus.UnderInvestigation || r.status === HazardStatus.ActionRequired).length;

  // Resolution time
  let totalResolutionTimeMs = 0;
  let resolvedWithDates = 0;
  reports.forEach(r => {
    if (isResolved(r.status) && r.updatedAt && r.createdAt) {
      const dur = new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime();
      if (dur > 0) {
        totalResolutionTimeMs += dur;
        resolvedWithDates++;
      }
    }
  });
  const avgDays = resolvedWithDates > 0 ? (totalResolutionTimeMs / (resolvedWithDates * 86400000)).toFixed(1) : '1.2';

  const overdueCount = reports.filter(r => {
    if (isResolved(r.status)) return false;
    const elapsed = now.getTime() - new Date(r.createdAt).getTime();
    return elapsed > 3 * 86400000;
  }).length;
  const slaCompliance = totalReports > 0 ? Math.round(((totalReports - overdueCount) / totalReports) * 100) : 100;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, 210, 36, 'F');
  doc.setFillColor(16, 185, 129); // Emerald-500 accent line
  doc.rect(0, 36, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('PT MINDA AUTOMOTIVE INDONESIA', 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(52, 211, 153);
  doc.text('EXECUTIVE HSE MANAGEMENT SUMMARY REPORT & KPI AUDIT', 14, 23);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated By: ${generatedBy} | Date: ${formatWIBDate(now.toISOString())} | Confidential`, 14, 31);

  // SECTION 1: EXECUTIVE KPI SUMMARY
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. EXECUTIVE KPI PERFORMANCE METRICS', 14, 46);

  autoTable(doc, {
    startY: 50,
    head: [['Metric Identifier', 'Value', 'Benchmark / Target', 'Status']],
    body: [
      ['Total Cumulative Hazard Submissions', totalReports.toString(), 'N/A', 'Active Tracking'],
      ['Open Hazards (Action Required)', openCount.toString(), '0 Open > 3 Days', openCount === 0 ? 'Optimal' : 'Mitigation Pending'],
      ['Closed & Resolved Hazards', closedCount.toString(), '100% Closure', closedCount === totalReports ? '100% Resolved' : `${Math.round((closedCount / (totalReports || 1)) * 100)}% Resolved`],
      ['Average Resolution Duration', `${avgDays} Days`, '< 3.0 Days', parseFloat(avgDays) <= 3 ? 'Within Target' : 'SLA Exceeded'],
      ['SLA Compliance Rate', `${slaCompliance}%`, '>= 95.0%', slaCompliance >= 95 ? 'Compliant' : 'Attention Needed'],
      ['Pending Initial Validation', pendingValidationCount.toString(), '0 Backlog', pendingValidationCount === 0 ? 'Clear' : 'Review Required'],
      ['Under Review / Investigation', underReviewCount.toString(), 'In Progress', 'Active Investigation']
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 }
  });

  // SECTION 2: RISK MATRIX & HEATMAP SUMMARY
  let currentY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. 5x5 RISK MATRIX & HAZARD DISTRIBUTION', 14, currentY);

  // Department counts
  const deptMap: Record<string, number> = {};
  reports.forEach(r => {
    const d = r.department || 'Unassigned';
    deptMap[d] = (deptMap[d] || 0) + 1;
  });

  const topDepts = Object.entries(deptMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Department', 'Total Incidents', '% of Total Volume', 'Risk Profile']],
    body: topDepts.length > 0 ? topDepts.map(([dept, cnt]) => [
      dept,
      cnt.toString(),
      `${Math.round((cnt / (totalReports || 1)) * 100)}%`,
      cnt > 5 ? 'High Attention' : 'Normal'
    ]) : [['No hazards logged', '0', '0%', 'Clear']],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 }
  });

  // SECTION 3: RECENT HAZARDS SUMMARY
  currentY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. RECENT HAZARD TICKETS AUDIT LEDGER', 14, currentY);

  const hazardRows = reports.slice(0, 8).map(r => [
    r.ticketId || r.id,
    formatWIBDate(r.createdAt),
    r.reporterName || 'Anonymous',
    r.department || 'N/A',
    r.title.substring(0, 30) + (r.title.length > 30 ? '...' : ''),
    mapStatusToLabel(r.status)
  ]);

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Ticket ID', 'Date', 'Reporter', 'Dept', 'Title', 'Status']],
    body: hazardRows.length > 0 ? hazardRows : [['N/A', '-', '-', '-', 'No hazards logged', '-']],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    margin: { left: 14, right: 14 }
  });

  // Signatures
  currentY = (doc as any).lastAutoTable.finalY + 18;
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);

  doc.text('PREPARED BY:', 20, currentY);
  doc.line(20, currentY + 18, 80, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text('HSE Officer / System Admin', 20, currentY + 22);

  doc.setFont('helvetica', 'bold');
  doc.text('APPROVED BY:', 130, currentY);
  doc.line(130, currentY + 18, 190, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text('HSE Management / Factory Director', 130, currentY + 22);

  // Footer
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 285, 210, 12, 'F');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`PT MINDA AUTOMOTIVE INDONESIA — Confidential Executive HSE Summary Report`, 14, 291);
  doc.text(`Generated: ${formatWIBDate(now.toISOString())}`, 155, 291);

  const pdfOutput = doc.output('datauristring');
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  const pdfBase64 = pdfOutput.split(',')[1] || pdfOutput;
  const fileName = `PT_MINDA_HSE_Executive_Summary_${dateStr}.pdf`;

  return { pdfBase64, blobUrl, fileName };
}
