<?php
/**
 * PT MINDA AUTOMOTIVE INDONESIA - HSE PORTAL
 * English Language Dictionary (Corporate Automotive Manufacturing Standard)
 */

return [
    // Header & Navigation
    'company.name'            => 'PT MINDA AUTOMOTIVE INDONESIA',
    'portal.title'            => 'HSE Portal & SLA System',
    'nav.home'                => 'Home Dashboard',
    'nav.report'              => 'Track & Report Hazard',
    'nav.officer'             => 'Officer Portal',
    'nav.workflow'            => 'Safety SOP',
    'header.officerLogin'     => 'Officer Login',
    'header.logout'           => 'Logout Session',
    'header.notifications'    => 'Notifications',
    'header.recentNotifs'     => 'Recent Notifications',
    'header.markAllRead'      => 'Mark all read',
    'header.noNotifs'         => 'No new alerts or warnings',
    'header.dismiss'          => 'Dismiss',

    // Footer
    'footer.rights'           => 'All Rights Reserved.',
    'footer.slaText'          => 'SLA Compliance Monitoring System v2.10',
    'footer.k3Text'           => 'K3 Standard (Zero Accident Culture)',

    // Home / Public Tracker Landing
    'landing.title'           => 'HSE Hazard & Near Miss Reporting Portal',
    'landing.subtitle'        => 'Occupational Health and Safety (K3) Standard of PT Minda Automotive Indonesia. Employees can log safety hazards or track corrective action lifecycle in real-time.',
    'landing.makeReport'      => 'Log New Hazard',
    'landing.makeReportDesc'  => 'Report unsafe conditions, unsafe acts, damaged PPE, or near-miss incidents directly via this corporate HSE Portal.',
    'landing.trackReport'     => 'Track Your Report',
    'landing.trackReportDesc' => 'Monitor remediation progress, designated Person in Charge (PIC), audit trail logs, and official remarks using Ticket ID or keyword.',

    // Redirect Modal / Processing
    'redirect.title'          => 'HSE Portal Direct Reporting Form',
    'redirect.desc'           => 'Submit safety hazard reports directly to PT Minda Automotive Indonesia HSE management system with automated PIC dispatch.',
    'redirect.infoTitle'      => 'Direct Reporting Information',
    'redirect.infoStep1'      => 'Reports are logged directly into the corporate HSE database.',
    'redirect.infoStep2'      => 'Automated SLA monitoring and PIC notification are triggered instantly.',
    'redirect.infoStep3'      => 'Use your unique Ticket ID to monitor corrective action milestones.',
    'redirect.infoStep4'      => 'Attach photographic evidence to accelerate verification and triage.',
    'redirect.goBack'         => 'Back',
    'redirect.openForm'       => 'Open Reporting Form →',
    'redirect.viewProcessing' => 'View System Processing Checklist →',

    // Search Tracker
    'track.searchTitle'       => 'Search Safety Incident Report',
    'track.searchDesc'        => 'Enter your unique Safety Ticket ID (e.g. HZ-2026-0001) or location keywords to track remediation workflow progress.',
    'track.placeholder'       => 'HZ-2026-0001 or Injection Molding Area',
    'track.searchBtn'         => 'Search Report',
    'track.guidelinesTitle'   => 'Search Guidelines & Criteria:',
    'track.guidelineTicket'   => 'Ticket ID: Exact match on official reference identifier (e.g. HZ-2026-0001).',
    'track.guidelineKeyword'  => 'Keywords: Query by department, shop floor area, reporter name, or title keywords.',
    'track.results'           => 'Search Results',
    'track.noResults'         => 'No Incident Reports Found',
    'track.noResultsDesc'     => 'No records matched your search query. Verify your Ticket ID syntax or try broader department/area keywords.',
    'track.timelineTitle'     => 'Incident Remediation Lifecycle Timeline',
    'track.currentStage'      => 'Current Stage',
    'track.updatesTitle'      => 'Officer Progress Updates & Action Log',
    'track.noComments'        => 'No public remarks or corrective updates have been posted for this ticket yet.',
    'track.k3Advisory'        => 'K3 COMPLIANCE ADVISORY: Under corporate safety governance, public tracker records are read-only. Shop floor personnel cannot alter ticket data. For amendments, contact HSE Committee (Anita - Safety Officer).',

    // Form Section
    'form.title'              => 'Report Near Miss / Safety Hazard',
    'form.desc'               => 'PT Minda Automotive Indonesia enforces a strict Zero Accident (K3) Policy. Use this form to report workplace risks. Automated routing will dispatch tickets to the designated PIC.',
    'form.empId'              => 'Employee ID / NIK *',
    'form.name'               => 'Full Name *',
    'form.email'              => 'Corporate Email *',
    'form.department'         => 'Department Location',
    'form.area'               => 'Shop Floor Area Site',
    'form.submitBtn'          => 'Dispatch Hazard Report',
    'form.submitting'         => 'Logging Ticket...',
    'form.successTitle'       => 'Hazard Report Logged Successfully!',
    'form.successDesc'        => 'Your incident report has been registered under Reference ID',
    'form.filtersBtn'         => 'Advanced Filters',
    'form.clearFilters'       => 'Clear Filters',

    // SOP / Workflow Section
    'sop.title'               => 'HSE Standard Operating Procedure (SOP)',
    'sop.desc'                => 'PT Minda Automotive Indonesia maintains an accident-free manufacturing environment under ISO 45001 and IATF 16949 protocols. This portal automates the full hazard lifecycle with SLA oversight.',
    'sop.stage1Title'         => 'Hazard Identification & Logging',
    'sop.stage1Desc'          => 'Operators and wardens identify near misses, damaged equipment, or safety deviations and submit records via the portal.',
    'sop.stage2Title'         => 'Automated DFA Categorization',
    'sop.stage2Desc'          => 'The routing engine classifies reports: Category A (Safety/PPE), Category B (Environment/5S), or Category C (Facilities/Maintenance) and assigns PICs.',
    'sop.stage3Title'         => 'SLA Monitoring & Escalation',
    'sop.stage3Desc'          => 'Resolution timer begins. Unresolved tickets after 3 days trigger compliance warnings. Overdue items trigger executive escalations.',
    'sop.stage4Title'         => 'Verification & Formal Closure',
    'sop.stage4Desc'          => 'Safety officers execute transitions following Deterministic Finite Automata (DFA) rules. Physical containment and corrective actions must be verified.',

    // Status Labels
    'status.NewReport'          => 'New Report',
    'status.PendingValidation'  => 'Pending Validation',
    'status.UnderInvestigation' => 'Under Investigation',
    'status.ActionRequired'     => 'Action Required',
    'status.WaitingProcurement' => 'Waiting Procurement',
    'status.Implementation'     => 'Implementation',
    'status.Completed'          => 'Completed',
    'status.Resolved'           => 'Resolved (SOP Verified)',

    // Timeline Stages
    'stage.NewReport'          => 'Logged',
    'stage.PendingValidation'  => 'Site Validation',
    'stage.UnderInvestigation' => 'Risk Assessment',
    'stage.ActionRequired'     => 'Corrective Action',
    'stage.WaitingProcurement' => 'Procurement / PO',
    'stage.Implementation'     => 'Mitigation Work',
    'stage.Completed'          => 'Action Completed',
    'stage.Resolved'           => 'Verification & Closed',

    // Login Page
    'login.title'             => 'HSE Officer Authentication',
    'login.desc'              => 'Restricted administrative portal for safety officers and compliance leadership.',
    'login.username'          => 'Corporate Username / Email',
    'login.password'          => 'Access Passcode',
    'login.remember'          => 'Remember Me',
    'login.submit'            => 'Access Officer Portal',
    'login.verifying'         => 'Verifying Session...',
    'login.back'              => 'Return to Employee Portal',
    'login.notice'            => 'Access is restricted to authorized HSE officers of PT Minda Automotive Indonesia to safeguard incident investigations and audit integrity.',

    // Officer Panel Subtabs
    'officer.tabDashboard'    => 'Main Dashboard & KPI',
    'officer.tabTickets'      => 'Manage Hazard Tickets',
    'officer.tabRecipients'   => 'Notification Distribution List',
    'officer.tabWeekly'       => 'Managerial Weekly Reports',
    'officer.tabSla'          => 'SLA Escalation Inspection',
    'officer.tabLogs'         => 'System Audit Logs',
    'officer.tabTemplates'    => 'Notification Email Templates',
    'officer.roleLabel'       => 'Operator Role',
    'officer.exportExecPdf'   => 'Export Executive Summary (PDF)',
    'officer.totalReports'    => 'Total Hazard Reports',
    'officer.openReports'     => 'Active Open Hazards',
    'officer.resolvedReports' => 'Resolved & Closed',
    'officer.overdueSla'      => 'SLA Breaches (>3 Days)',
    'officer.slaRate'         => 'SLA Compliance Rate',
    'officer.avgResolution'   => 'Avg Resolution Time',
    'officer.topDept'         => 'Top Incident Department',
    'officer.topCategory'     => 'Primary Category',
    'officer.days'            => 'Days',
];
