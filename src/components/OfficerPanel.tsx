import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  ShieldAlert, Lock, ArrowRight, ClipboardList, BarChart3, Users, User, FileText, 
  History, Eye, UserPlus, Check, Sliders, Play, AlertCircle, RefreshCw, Send, CheckCircle2, Mail,
  SlidersHorizontal, ChevronDown, ChevronUp, X, Search, HelpCircle, Tag, Plus, ShieldCheck, AlertTriangle,
  Trash2, Edit3
} from 'lucide-react';
import { 
  transitionHazardStatus, 
  assignHazardPIC, 
  addHazardComment, 
  getHazardComments,
  generateWeeklyReportMetrics, 
  runReminderEscalationChecks, 
  subscribeToAuditLogs, 
  subscribeToNotifications, 
  subscribeToWeeklyReports,
  signInWithSupabase,
  getSupabase,
  getNotificationTemplates,
  saveNotificationTemplate,
  resetNotificationTemplates,
  renderNotificationTemplate,
  updateHazardReportComplete,
  getNotificationRecipients,
  saveNotificationRecipient,
  deleteNotificationRecipient,
  deleteWeeklyReport,
  deleteHazardReport,
  editHazardReport,
  fetchHazardReports,
  fetchAuditLogs,
  mapStatusToLabel
} from '../supabase';
import { generateTicketSummaryPDF, generateExecutiveSummaryPDF } from '../lib/pdfGenerator';
import { formatWIBDate, formatWIBDateTime } from '../lib/dateUtils';
import { 
  getHazardSummary, 
  parseHazardIncidentDetails, 
  sanitizeDisplayValue, 
  getReporterDetails,
  getHazardCategoryBadge,
  getHazardCategoryDisplay,
  hasValue 
} from '../lib/hazardPresentation';
import { 
  evaluateRiskIK01, 
  SEVERITY_DEFINITIONS, 
  LIKELIHOOD_DEFINITIONS, 
  HIERARCHY_OF_CONTROLS, 
  getMatrixCellIK01,
  SeverityDefinition,
  LikelihoodDefinition
} from '../lib/riskMatrixIK01';
import { 
  HazardReport, 
  HazardStatus, 
  HazardCategory, 
  User as AppUser, 
  AuditLog, 
  WeeklyReport, 
  Recipient, 
  RecipientNotificationEvents,
  DFAValidationEngine,
  NotificationTemplate
} from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';
import { useLanguage } from '../lib/i18n';

interface OfficerPanelProps {
  currentUser: AppUser | null;
  onLoginSuccess: (user: AppUser) => void;
  reports: HazardReport[];
}

export default function OfficerPanel({ currentUser, onLoginSuccess, reports }: OfficerPanelProps) {
  const toast = useToast();
  const { language, setLanguage, t } = useLanguage();
  // Authentication Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Tab/Subtab State inside Officer Panel
  const [activeSubtab, setActiveSubtab] = useState<'dashboard' | 'tickets' | 'recipients' | 'weekly' | 'sla' | 'logs' | 'templates'>('dashboard');

  // Selected Ticket detail state
  const [selectedReport, setSelectedReport] = useState<HazardReport | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isCommentInternal, setIsCommentInternal] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [picSelectionId, setPicSelectionId] = useState('');
  const [confirmDeleteRecId, setConfirmDeleteRecId] = useState<string | null>(null);

  // Delete Hazard Report Confirmation State
  const [reportToDelete, setReportToDelete] = useState<HazardReport | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit Hazard Report Modal State
  const [reportToEdit, setReportToEdit] = useState<HazardReport | null>(null);
  const [editReporterName, setEditReporterName] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editHazardCategory, setEditHazardCategory] = useState('');
  const [editHazardDescription, setEditHazardDescription] = useState('');
  const [editPriority, setEditPriority] = useState<string>('Medium');
  const [editStatus, setEditStatus] = useState<HazardStatus>(HazardStatus.NewReport);
  const [editOfficerComments, setEditOfficerComments] = useState('');
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editReportError, setEditReportError] = useState<string | null>(null);

  // Local edit states for Ticket Detail page
  const [editedStatus, setEditedStatus] = useState<HazardStatus>(HazardStatus.NewReport);
  const [editedPicId, setEditedPicId] = useState('');
  const [editedOfficerComments, setEditedOfficerComments] = useState('');
  const [editedSeverity, setEditedSeverity] = useState<number>(2);
  const [editedLikelihood, setEditedLikelihood] = useState<number>(2);
  const [editedOtpProgramName, setEditedOtpProgramName] = useState<string>('');
  const [editedAdditionalControl, setEditedAdditionalControl] = useState<string>('APD');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Loaded Lists from Realtime channels
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  // Interactive Risk Matrix States
  const [selectedRiskMatrixCell, setSelectedRiskMatrixCell] = useState<{
    severity: number;
    likelihood: number;
    reports: HazardReport[];
  } | null>(null);
  const [showRiskHelpModal, setShowRiskHelpModal] = useState(false);

  // Feedback states
  const [compilingReport, setCompilingReport] = useState(false);
  const [compilationSuccess, setCompilationSuccess] = useState<WeeklyReport | null>(null);
  const [runningSLA, setRunningSLA] = useState(false);
  const [slaResultCount, setSlaResultCount] = useState<number | null>(null);

  // Advanced Filter & Search State for Safety Tickets Subtab
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTicketId, setSearchTicketId] = useState('');
  const [searchEmployeeId, setSearchEmployeeId] = useState('');
  const [searchReporterName, setSearchReporterName] = useState('');
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  
  const [dateRangePreset, setDateRangePreset] = useState<string>('all'); // all, last24h, last7d, last30d, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Recipient Registry (Email Notification Configuration) Subtab State
  const [recSearch, setRecSearch] = useState('');
  const [recCategoryFilter, setRecCategoryFilter] = useState('all');
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [recName, setRecName] = useState('');
  const [recPosition, setRecPosition] = useState('');
  const [recEmail, setRecEmail] = useState('');
  const [recRole, setRecRole] = useState('hse_officer');
  const [recActive, setRecActive] = useState(true);
  const [recIsMandatory, setRecIsMandatory] = useState(false);
  const [recMode, setRecMode] = useState<'all' | 'keyword'>('keyword');
  const [recKeywords, setRecKeywords] = useState<string[]>(['Safety', 'APD']);
  const [recCustomKwInput, setRecCustomKwInput] = useState('');
  const [recNotificationEvents, setRecNotificationEvents] = useState<RecipientNotificationEvents>({
    reportCreated: true,
    statusUpdated: true,
    reportCompleted: true,
    reminderDay3: true,
    reminderDay7: true,
    reminderDay14: true,
    reminderDay30: true,
    weeklyReport: true
  });
  const [isSavingRec, setIsSavingRec] = useState(false);

  const PRESET_KEYWORDS = [
    'Safety', 'APD', 'Forklift', 'Ergonomi', 'Listrik', 'Housekeeping',
    'Environment', 'Fire', 'Chemical', 'Machine', 'Toilet', 'Parking',
    'Waste', 'Catering', 'P3K', 'Hydraulic', 'Vehicle', 'Noise', 'Pollution', 'Limbah', 'Spill'
  ];

  const handleSelectRecipient = (rec: Recipient) => {
    setSelectedRecId(rec.id);
    setRecName(rec.name || '');
    setRecPosition(rec.position || rec.role || '');
    setRecEmail(rec.email || '');
    setRecRole(rec.role || 'hse_officer');
    setRecActive(rec.active !== false);
    setRecIsMandatory(Boolean(rec.isMandatory));
    setRecMode(rec.mode || 'keyword');
    setRecKeywords(Array.isArray(rec.keywords) ? [...rec.keywords] : []);
    setRecNotificationEvents(rec.notificationEvents ? { ...rec.notificationEvents } : {
      reportCreated: true,
      statusUpdated: true,
      reportCompleted: true,
      reminderDay3: true,
      reminderDay7: true,
      reminderDay14: true,
      reminderDay30: true,
      weeklyReport: true
    });
    // Smooth scroll to top/form for clear user feedback
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearRecForm = () => {
    setSelectedRecId(null);
    setRecName('');
    setRecPosition('');
    setRecEmail('');
    setRecRole('hse_officer');
    setRecActive(true);
    setRecIsMandatory(false);
    setRecMode('keyword');
    setRecKeywords(['Safety', 'APD']);
    setRecCustomKwInput('');
    setRecNotificationEvents({
      reportCreated: true,
      statusUpdated: true,
      reportCompleted: true,
      reminderDay3: true,
      reminderDay7: true,
      reminderDay14: true,
      reminderDay30: true,
      weeklyReport: true
    });
  };

  const handleToggleKeyword = (kw: string) => {
    setRecKeywords(prev => 
      prev.some(k => k.toLowerCase() === kw.toLowerCase())
        ? prev.filter(k => k.toLowerCase() !== kw.toLowerCase())
        : [...prev, kw]
    );
  };

  const handleAddCustomKeyword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = recCustomKwInput.trim();
    if (trimmed && !recKeywords.some(k => k.toLowerCase() === trimmed.toLowerCase())) {
      setRecKeywords(prev => [...prev, trimmed]);
      setRecCustomKwInput('');
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setRecKeywords(prev => prev.filter(k => k.toLowerCase() !== kwToRemove.toLowerCase()));
  };

  const handleSaveRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recName.trim() || !recEmail.trim()) {
      toast.error('Nama dan Email Wajib diisi.');
      return;
    }
    setIsSavingRec(true);
    try {
      const recToSave: Recipient = {
        id: selectedRecId || `rec-${Date.now()}`,
        category: recMode === 'all' ? 'ALWAYS' : 'A',
        name: recName.trim(),
        position: recPosition.trim() || recRole,
        email: recEmail.trim(),
        role: recRole,
        active: recActive,
        isMandatory: recIsMandatory,
        mode: recMode,
        keywords: recKeywords,
        notificationEvents: recNotificationEvents
      };
      const updated = await saveNotificationRecipient(recToSave);
      setRecipients(updated);
      toast.success(selectedRecId ? 'Konfigurasi penerima berhasil diperbarui!' : 'Penerima baru berhasil ditambahkan!');
      handleClearRecForm();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan konfigurasi penerima.');
    } finally {
      setIsSavingRec(false);
    }
  };

  const handleToggleActiveRecipient = async (rec: Recipient, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedRec: Recipient = { ...rec, active: rec.active === false };
    try {
      const updated = await saveNotificationRecipient(updatedRec);
      setRecipients(updated);
      toast.success(`Status ${rec.name} diubah menjadi ${updatedRec.active ? 'Aktif' : 'Nonaktif'}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui status.');
    }
  };

  const handleDeleteRecipient = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updated = await deleteNotificationRecipient(id);
      setRecipients(updated);
      if (selectedRecId === id) handleClearRecForm();
      setConfirmDeleteRecId(null);
      toast.success('Penerima berhasil dihapus dari konfigurasi.');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus penerima.');
    }
  };

  const filteredRecipients = useMemo(() => {
    return recipients.filter(r => {
      const q = recSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.position && r.position.toLowerCase().includes(q)) ||
        (r.keywords && r.keywords.some(k => k.toLowerCase().includes(q)))
      );
      
      const matchesFilter = recCategoryFilter === 'all' || 
        (recCategoryFilter === 'all_notifications' && r.mode === 'all') ||
        (recCategoryFilter === 'keyword_based' && r.mode === 'keyword') ||
        (recCategoryFilter === 'mandatory' && r.isMandatory);

      return matchesSearch && matchesFilter;
    });
  }, [recipients, recSearch, recCategoryFilter]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchTicketId('');
    setSearchEmployeeId('');
    setSearchReporterName('');
    setFilterStatus('all');
    setFilterCategory('all');
    setFilterDepartment('all');
    setDateRangePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const DEPARTMENTS = [
    'Production',
    'Maintenance',
    'Logistics',
    'Quality',
    'HSE',
    'Warehouse',
    'Assembly',
    'Administration'
  ];

  // Customizable Notification Templates State
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<'assigned' | 'status_updated' | 'overdue' | 'completed'>('assigned');
  const [subjectInput, setSubjectInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync templates on tab or template selection change
  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'hse_admin' && currentUser.role !== 'hse_officer' && currentUser.role !== 'ppe_officer' && currentUser.role !== 'hrga_admin' && currentUser.role !== 'env_officer')) return;
    const loaded = getNotificationTemplates();
    setTemplates(loaded);
    const active = loaded.find(t => t.id === selectedTemplateId);
    if (active) {
      setSubjectInput(active.subject);
      setBodyInput(active.body);
    }
  }, [currentUser, selectedTemplateId]);

  const handleSaveTemplate = () => {
    const updated = saveNotificationTemplate(selectedTemplateId, subjectInput, bodyInput);
    setTemplates(updated);
    setSuccessMsg('Notification template saved successfully!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleResetTemplates = () => {
    const reset = resetNotificationTemplates();
    setTemplates(reset);
    const active = reset.find(t => t.id === selectedTemplateId);
    if (active) {
      setSubjectInput(active.subject);
      setBodyInput(active.body);
    }
    setSuccessMsg('Templates reset to factory defaults!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const [activeFocusField, setActiveFocusField] = useState<'subject' | 'body'>('body');
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const handleInsertPlaceholder = (phName: string) => {
    const placeholder = `{${phName}}`;
    if (activeFocusField === 'subject') {
      const input = subjectInputRef.current;
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const before = subjectInput.substring(0, start);
        const after = subjectInput.substring(end);
        const newSub = before + placeholder + after;
        setSubjectInput(newSub);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + placeholder.length, start + placeholder.length);
        }, 0);
      } else {
        setSubjectInput(prev => prev + placeholder);
      }
    } else {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const before = bodyInput.substring(0, start);
        const after = bodyInput.substring(end);
        const newBody = before + placeholder + after;
        setBodyInput(newBody);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
        }, 0);
      } else {
        setBodyInput(prev => prev + placeholder);
      }
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  
  const mockPreviewData: Record<string, string> = {
    ticketId: 'TKT-2026-001',
    title: 'Exposed High-Voltage Electrical Wiring in Area 3',
    description: 'Uncovered 380V power cable presenting severe electrocution hazard near operator walkway.',
    reporterName: 'Ahmad Fauzi',
    employeeId: 'EMP-9821',
    department: 'Production',
    area: 'Injection Molding Area 3',
    category: 'Class A (Critical)',
    subCategory: 'Electrical Hazard',
    severity: 'High / Critical',
    priority: 'Urgent',
    assignedPIC: selectedTemplateId === 'assigned' ? 'HRGA Admin' : 'Asep Permana (Env & Trans Supervisor)',
    assignedEmail: 'hse_supervisor@mindaauto.co.id',
    createdDate: formatWIBDate(),
    updatedDate: formatWIBDate(),
    resolvedDate: formatWIBDate(),
    daysOpen: '2',
    status: selectedTemplateId === 'completed' ? 'Completed' : 'Under Active Investigation',
    oldStatus: 'NewReport',
    newStatus: selectedTemplateId === 'completed' ? 'Completed' : 'Under Active Investigation',
    portalLink: typeof window !== 'undefined' ? `${window.location.origin}/#tracker?id=TKT-2026-001` : 'https://minda-hse.portal/tracker?id=TKT-2026-001',
    company: 'PT Minda Automotive Indonesia',
    generatedTime: formatWIBDateTime()
  };

  const renderLiveText = (text: string) => {
    let res = text;
    Object.entries(mockPreviewData).forEach(([k, v]) => {
      res = res.split(`{${k}}`).join(v);
    });
    return res;
  };

  const testRendered = {
    subject: renderLiveText(subjectInput),
    body: renderLiveText(bodyInput)
  };

  // Real-time Subscriptions Setup
  useEffect(() => {
    if (!currentUser) return;

    const unsubLogs = subscribeToAuditLogs((logs) => setAuditLogs(logs));
    const unsubWeekly = subscribeToWeeklyReports((reports) => setWeeklyReports(reports));

    // Fetch Recipients static configuration
    const fetchRecipients = async () => {
      try {
        const list = await getNotificationRecipients();
        setRecipients(list);
      } catch (err) {
        console.error(err);
      }
    };

    fetchRecipients();

    return () => {
      unsubLogs();
      unsubWeekly();
    };
  }, [currentUser]);

  // Handle Login using Supabase Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);

    try {
      const userProfile = await signInWithSupabase(email, password);
      onLoginSuccess(userProfile);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Access Denied\n\nYour account is not registered as an authorized HSE Officer.\nPlease contact the HSE System Administrator.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Comments Loader
  const loadComments = async (ticketId: string) => {
    try {
      const list = await getHazardComments(ticketId);
      setComments(list);
    } catch (err) {
      console.error(err);
    }
  };

  // Select Ticket for detail management pane
  const [isInternalComment, setIsInternalComment] = useState(false); // keep backward-compatible state name or let's use isCommentInternal
  
  // Keep selected report and edit states in sync with real-time reports data
  useEffect(() => {
    if (selectedReport) {
      const liveReport = reports.find(
        r => r.id === selectedReport.id || r.ticketId === selectedReport.ticketId
      );
      if (liveReport) {
        setSelectedReport(liveReport);
        setEditedStatus(liveReport.status);
        setEditedPicId(liveReport.picId || 'unassigned');
        setEditedOfficerComments(liveReport.officerComments || '');
        setEditedSeverity(liveReport.severity || 2);
        setEditedLikelihood(liveReport.likelihood || 2);
        setEditedOtpProgramName(liveReport.otpProgramName || '');
        setEditedAdditionalControl(liveReport.additionalControl || 'APD');
      }
    }
  }, [reports]);

  const handleSelectReport = async (report: HazardReport) => {
    setSelectedReport(report);
    setPicSelectionId(report.picId || 'unassigned');
    setCommentText('');
    setIsCommentInternal(false);
    
    // Initialize editing values
    setEditedStatus(report.status);
    setEditedPicId(report.picId || 'unassigned');
    setEditedOfficerComments(report.officerComments || '');
    setEditedSeverity(report.severity || 2);
    setEditedLikelihood(report.likelihood || 2);
    setEditedOtpProgramName(report.otpProgramName || '');
    setEditedAdditionalControl(report.additionalControl || 'APD');
    setSaveSuccess(null);
    setSaveError(null);

    await loadComments(report.id);
  };

  // Save full ticket updates (assigned PIC, status, officer comments, IK Pedoman risk evaluation)
  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !currentUser) return;

    setSaveSuccess(null);
    setSaveError(null);

    const statusChanged = editedStatus !== selectedReport.status;
    const picChanged = editedPicId !== selectedReport.picId;
    const commentsChanged = editedOfficerComments !== (selectedReport.officerComments || '');

    // Log transition advisory
    if (statusChanged && !DFAValidationEngine.isValidTransition(selectedReport.status, editedStatus)) {
      console.info(`[DFA Advisory] Status transition from "${selectedReport.status}" to "${editedStatus}" by ${currentUser.name}.`);
    }

    setIsSaving(true);

    let picName = 'HSE Team';
    if (editedPicId === 'usr_hrga_admin' || editedPicId === 'hrga') picName = 'HRGA Admin';
    else if (editedPicId === 'usr_asep_permana' || editedPicId === 'asep') picName = 'Asep Permana';
    else picName = 'HSE Team';

    const evalResult = evaluateRiskIK01(editedSeverity, editedLikelihood);

    try {
      const affectedRows = await updateHazardReportComplete(
        selectedReport.id,
        {
          status: editedStatus,
          picId: editedPicId,
          picName: picName,
          officerComments: editedOfficerComments,
          uuid: selectedReport.uuid,
          severity: editedSeverity,
          likelihood: editedLikelihood,
          riskScore: evalResult.score,
          riskLevel: evalResult.level,
          otpRequired: evalResult.isOtpRequired,
          otpProgramName: editedOtpProgramName,
          additionalControl: editedAdditionalControl
        },
        currentUser
      );

      if (affectedRows === 1) {
        setSaveSuccess('Ticket changes saved and synchronized successfully!');
        
        // Trigger granular Toast success messages as required
        if (statusChanged) {
          toast.success(`Status updated to "${editedStatus}" successfully!`);
        }
        if (picChanged) {
          toast.success(`PIC assigned to "${picName}" successfully!`);
        }
        if (commentsChanged) {
          toast.success('Officer comments saved successfully!');
        }
        if (!statusChanged && !picChanged && !commentsChanged) {
          toast.success('Ticket updated successfully!');
        }

        // Immediately refresh reports collection from database
        const freshReports = await fetchHazardReports();
        await fetchAuditLogs();

        // Update selectedReport using the newest object from refreshed reports array
        const updatedReport = freshReports.find(
          r => r.id === selectedReport.id || r.ticketId === selectedReport.ticketId
        );
        if (updatedReport) {
          setSelectedReport(updatedReport);
          setEditedStatus(updatedReport.status);
          setEditedPicId(updatedReport.picId || 'unassigned');
          setEditedOfficerComments(updatedReport.officerComments || '');
        }

        // Reload comments
        await loadComments(selectedReport.id);
      } else {
        const mismatchErr = `Expected exactly 1 row to be updated, but got ${affectedRows}.`;
        setSaveError(mismatchErr);
        toast.error(mismatchErr);
      }

    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || 'Failed to update ticket. Please try again.';
      setSaveError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm and Execute Permanent Cloud Deletion of Hazard Report
  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const targetId = reportToDelete.id || reportToDelete.uuid || '';
      if (!targetId) {
        setDeleteError('No valid report ID found for deletion.');
        setIsDeleting(false);
        return;
      }
      const res = await deleteHazardReport(targetId, reportToDelete.ticketId, currentUser || undefined);

      if (!res.success) {
        const errMsg = res.error || 'Failed to delete hazard report. Please try again.';
        setDeleteError(errMsg);
        toast.error(errMsg);
        setIsDeleting(false);
        return;
      }

      toast.success(`Ticket ${reportToDelete.ticketId || reportToDelete.id} successfully deleted.`);
      if (selectedReport?.id === reportToDelete.id || selectedReport?.ticketId === reportToDelete.ticketId) {
        setSelectedReport(null);
      }
      setReportToDelete(null);
      setDeleteError(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      const errMsg = err?.message || 'Failed to delete hazard report. Please try again.';
      setDeleteError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Edit Modal for a Hazard Report
  const handleOpenEditModal = (report: HazardReport, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReportToEdit(report);
    setEditReporterName(report.reporterName || '');
    setEditEmployeeId(report.employeeId || '');
    setEditDepartment(report.department || '');
    setEditArea(report.area || '');
    setEditHazardCategory(report.hazardCategory || report.category || 'B');
    setEditHazardDescription(report.description || report.title || '');
    setEditPriority(report.priority || 'Medium');
    setEditStatus(report.status || HazardStatus.NewReport);
    setEditOfficerComments(report.officerComments || '');
    setEditReportError(null);
  };

  // Execute and Save Edited Hazard Report
  const handleSaveEditReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportToEdit || !currentUser) return;

    if (!editHazardDescription.trim()) {
      setEditReportError('Hazard description is required.');
      return;
    }

    setIsEditingReport(true);
    setEditReportError(null);

    try {
      const targetId = reportToEdit.id || reportToEdit.uuid || '';
      if (!targetId) {
        setEditReportError('No valid report ID found for update.');
        setIsEditingReport(false);
        return;
      }

      const res = await editHazardReport(
        targetId,
        {
          reporterName: editReporterName.trim(),
          employeeId: editEmployeeId.trim(),
          department: editDepartment.trim(),
          area: editArea.trim(),
          hazardCategory: editHazardCategory.trim(),
          hazardDescription: editHazardDescription.trim(),
          priority: editPriority,
          status: editStatus,
          officerComments: editOfficerComments.trim()
        },
        currentUser
      );

      if (!res.success) {
        const errMsg = res.error || 'Failed to update hazard report. Please try again.';
        setEditReportError(errMsg);
        toast.error(errMsg);
        setIsEditingReport(false);
        return;
      }

      toast.success(`Hazard Report ${reportToEdit.ticketId || targetId} updated successfully!`);

      // Immediately refresh reports collection from database
      const freshReports = await fetchHazardReports();
      await fetchAuditLogs();

      // Update selectedReport if this ticket is currently open
      if (selectedReport?.id === targetId || selectedReport?.ticketId === reportToEdit.ticketId) {
        const updated = freshReports.find(r => r.id === targetId || r.ticketId === reportToEdit.ticketId);
        if (updated) {
          setSelectedReport(updated);
          setEditedStatus(updated.status);
          setEditedPicId(updated.picId || 'unassigned');
          setEditedOfficerComments(updated.officerComments || '');
        }
      }

      setReportToEdit(null);
      setEditReportError(null);
    } catch (err: any) {
      console.error('Edit error:', err);
      const errMsg = err?.message || 'Failed to update hazard report. Please try again.';
      setEditReportError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsEditingReport(false);
    }
  };

  // Change Ticket PIC
  const handleAssignPIC = async () => {
    if (!selectedReport || !currentUser) return;
    
    let picName = 'HSE Team';
    if (picSelectionId === 'hrga' || picSelectionId === 'usr_hrga_admin') picName = 'HRGA Admin';
    else if (picSelectionId === 'asep' || picSelectionId === 'usr_asep_permana') picName = 'Asep Permana';
    else picName = 'HSE Team';

    try {
      await assignHazardPIC(selectedReport.id, picName, picSelectionId, currentUser);
      const freshReports = await fetchHazardReports();
      await fetchAuditLogs();
      const updatedReport = freshReports.find(
        r => r.id === selectedReport.id || r.ticketId === selectedReport.ticketId
      );
      if (updatedReport) {
        setSelectedReport(updatedReport);
        setEditedPicId(updatedReport.picId || 'unassigned');
      }
      toast.success(`Successfully assigned PIC to "${picName}"!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to assign PIC.');
    }
  };

  // Transition Ticket State using DFA Rules
  const handleTransitionState = async (nextStatus: HazardStatus) => {
    if (!selectedReport || !currentUser) return;

    // Check transition validity
    if (!DFAValidationEngine.isValidTransition(selectedReport.status, nextStatus)) {
      toast.error(`Transition from "${selectedReport.status}" to "${nextStatus}" is prohibited under corporate DFA rules!`);
      return;
    }

    try {
      await transitionHazardStatus(selectedReport.id, nextStatus, currentUser);
      const freshReports = await fetchHazardReports();
      await fetchAuditLogs();
      const updatedReport = freshReports.find(
        r => r.id === selectedReport.id || r.ticketId === selectedReport.ticketId
      );
      if (updatedReport) {
        setSelectedReport(updatedReport);
        setEditedStatus(updatedReport.status);
      }
      await loadComments(selectedReport.id);
      toast.success(`Status transitioned to "${nextStatus}" successfully!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to transition ticket status.');
    }
  };

  // Post Comment log
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText || !selectedReport || !currentUser) return;

    setIsPostingComment(true);
    try {
      const finalComment = isCommentInternal ? `[INTERNAL] ${commentText}` : commentText;
      await addHazardComment(selectedReport.id, finalComment, currentUser);
      setCommentText('');
      setIsCommentInternal(false);
      await loadComments(selectedReport.id);
      toast.success('HSE comment posted successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to post comment.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleExportTicketPDF = (report: HazardReport) => {
    try {
      const reportAuditLogs = auditLogs.filter(log => log.ticketId === report.ticketId || log.hazardId === report.ticketId);
      const pdfResult = generateTicketSummaryPDF(report, reportAuditLogs);
      handleDownloadPDF(pdfResult.pdfBase64, pdfResult.fileName);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export Ticket Summary PDF.');
    }
  };

  // Compile weekly report PDF
  const handleCompileWeekly = async () => {
    setCompilingReport(true);
    setCompilationSuccess(null);
    try {
      const rep = await generateWeeklyReportMetrics(currentUser?.name || 'HSE Administrator');
      setCompilationSuccess(rep);
      toast.success('Weekly metrics report compiled successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to compile weekly report metrics.');
    } finally {
      setCompilingReport(false);
    }
  };

  const handleDownloadPDF = (pdfBase64: string, filename: string) => {
    try {
      let cleanBase64 = pdfBase64 || '';
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }
      const binaryString = window.atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Downloaded: ${filename}`);
    } catch (err: any) {
      console.error('Download PDF error:', err);
      toast.error('Could not download PDF file.');
    }
  };

  const handleDeleteWeekly = async (id: string) => {
    const updated = await deleteWeeklyReport(id);
    setWeeklyReports(updated);
    toast.success(`Report ${id} deleted.`);
  };

  // Execute manual SLA escalation check daemon
  const handleTriggerSLAChecks = async () => {
    setRunningSLA(true);
    setSlaResultCount(null);
    try {
      const triggerCount = await runReminderEscalationChecks();
      setSlaResultCount(triggerCount);
      toast.success(`SLA escalation daemon run completed. ${triggerCount} actions triggered.`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'SLA escalation check daemon failed.');
    } finally {
      setRunningSLA(false);
    }
  };

  // ---------------------------------------------------------
  // EXECUTIVE KPI & RISK ANALYTICS (MEMOIZED FOR PERFORMANCE)
  // ---------------------------------------------------------
  const isResolved = (s: HazardStatus) => s === HazardStatus.Resolved || s === HazardStatus.Completed;

  const executiveMetrics = useMemo(() => {
    const totalReports = reports.length;
    const closedCount = reports.filter(r => isResolved(r.status)).length;
    const openCount = totalReports - closedCount;

    // SLA & Overdue (3 days)
    const nowMs = Date.now();
    const overdueCount = reports.filter(r => {
      if (isResolved(r.status)) return false;
      const elapsed = nowMs - new Date(r.createdAt).getTime();
      return elapsed > 3 * 24 * 60 * 60 * 1000;
    }).length;

    const slaComplianceRate = totalReports > 0 ? Math.round(((totalReports - overdueCount) / totalReports) * 100) : 100;

    // Average Resolution Time (in days)
    let totalResTimeMs = 0;
    let resolvedCountWithDates = 0;
    reports.forEach(r => {
      if (isResolved(r.status) && r.updatedAt && r.createdAt) {
        const dur = new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime();
        if (dur > 0) {
          totalResTimeMs += dur;
          resolvedCountWithDates++;
        }
      }
    });
    const avgResolutionDays = resolvedCountWithDates > 0 ? (totalResTimeMs / (resolvedCountWithDates * 86400000)).toFixed(1) : '1.2';

    // Status breakdown
    const pendingValidationCount = reports.filter(r => r.status === HazardStatus.NewReport || r.status === HazardStatus.PendingValidation).length;
    const underReviewCount = reports.filter(r => r.status === HazardStatus.UnderInvestigation || r.status === HazardStatus.ActionRequired).length;

    // Resolved today count
    const todayStr = new Date().toDateString();
    const resolvedTodayCount = reports.filter(r => isResolved(r.status) && new Date(r.updatedAt).toDateString() === todayStr).length;

    // Department Distribution & Top Department
    const depMap: Record<string, number> = {};
    reports.forEach(r => {
      const d = r.department || 'Unassigned';
      depMap[d] = (depMap[d] || 0) + 1;
    });
    let topDepartment = 'None';
    let maxDepCount = 0;
    Object.entries(depMap).forEach(([d, c]) => {
      if (c > maxDepCount) {
        maxDepCount = c;
        topDepartment = d;
      }
    });

    const departmentChartData = Object.keys(depMap).map(k => ({
      name: k,
      reports: depMap[k]
    }));

    // Category Distribution & Top Category
    const catMap: Record<string, number> = { 'A': 0, 'B': 0, 'C': 0 };
    reports.forEach(r => {
      if (r.category) catMap[r.category] = (catMap[r.category] || 0) + 1;
    });
    let topCategory = 'Cat A (PPE)';
    let maxCatCount = 0;
    Object.entries(catMap).forEach(([catKey, c]) => {
      if (c > maxCatCount) {
        maxCatCount = c;
        topCategory = catKey === 'A' ? 'Cat A (PPE / APD)' : catKey === 'B' ? 'Cat B (Environmental)' : 'Cat C (Maintenance)';
      }
    });

    const categoryChartData = [
      { name: 'Cat A (PPE / APD)', value: catMap['A'], color: '#f43f5e' },
      { name: 'Cat B (Environmental)', value: catMap['B'], color: '#fbbf24' },
      { name: 'Cat C (Maintenance)', value: catMap['C'], color: '#3b82f6' }
    ].filter(c => c.value > 0);

    // Status map for cards
    const statusMap: Record<string, number> = {};
    reports.forEach(r => {
      statusMap[r.status] = (statusMap[r.status] || 0) + 1;
    });

    // 5x5 RISK MATRIX (IK Pedoman PEP-HSE-P-01-IK-01)
    const riskMatrixCellCounts: Record<string, number> = {};
    const riskMatrixCellReports: Record<string, HazardReport[]> = {};
    for (let s = 1; s <= 5; s++) {
      for (let l = 1; l <= 5; l++) {
        riskMatrixCellCounts[`${s}_${l}`] = 0;
        riskMatrixCellReports[`${s}_${l}`] = [];
      }
    }

    reports.forEach(r => {
      let s = (r as any).severity ? Number((r as any).severity) : 0;
      if (!s || s < 1 || s > 5) {
        if (r.category === 'C') s = 4;
        else if (r.category === 'B') s = 2;
        else s = 2;
      }

      let l = (r as any).likelihood ? Number((r as any).likelihood) : 0;
      if (!l || l < 1 || l > 5) {
        if (r.category === 'C') l = 3;
        else if (r.category === 'B') l = 4;
        else l = 2;
      }

      const key = `${s}_${l}`;
      riskMatrixCellCounts[key] = (riskMatrixCellCounts[key] || 0) + 1;
      if (!riskMatrixCellReports[key]) riskMatrixCellReports[key] = [];
      riskMatrixCellReports[key].push(r);
    });

    // HAZARD HEATMAP (Group by Area Location x Department)
    const heatmapMap: Record<string, { area: string; dept: string; count: number; highestRisk: string }> = {};
    reports.forEach(r => {
      const area = r.area || 'General Factory';
      const dept = r.department || 'General';
      const key = `${area}__${dept}`;
      
      let s = (r as any).severity ? Number((r as any).severity) : 2;
      let l = (r as any).likelihood ? Number((r as any).likelihood) : 2;
      const evalRes = evaluateRiskIK01(s, l);
      const riskLevel = evalRes.level;

      if (!heatmapMap[key]) {
        heatmapMap[key] = { area, dept, count: 1, highestRisk: riskLevel };
      } else {
        heatmapMap[key].count += 1;
        const currentRank = { Low: 1, Moderate: 2, High: 3, Extreme: 4 };
        if ((currentRank[riskLevel as keyof typeof currentRank] || 1) > (currentRank[heatmapMap[key].highestRisk as keyof typeof currentRank] || 1)) {
          heatmapMap[key].highestRisk = riskLevel;
        }
      }
    });

    const heatmapList = Object.values(heatmapMap).sort((a, b) => b.count - a.count);

    // MONTHLY TREND CHART DATA (Jan - Dec Created vs Resolved)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrendMap: Record<number, { month: string; created: number; resolved: number }> = {};
    for (let m = 0; m < 12; m++) {
      monthlyTrendMap[m] = { month: monthNames[m], created: 0, resolved: 0 };
    }

    reports.forEach(r => {
      const createdDate = new Date(r.createdAt);
      if (!isNaN(createdDate.getTime())) {
        const m = createdDate.getMonth();
        monthlyTrendMap[m].created += 1;
      }
      if (isResolved(r.status) && r.updatedAt) {
        const resolvedDate = new Date(r.updatedAt);
        if (!isNaN(resolvedDate.getTime())) {
          const m = resolvedDate.getMonth();
          monthlyTrendMap[m].resolved += 1;
        }
      }
    });

    const monthlyTrendData = Object.values(monthlyTrendMap);

    return {
      totalReports,
      openCount,
      closedCount,
      overdueCount,
      slaComplianceRate,
      avgResolutionDays,
      pendingValidationCount,
      underReviewCount,
      resolvedTodayCount,
      topDepartment,
      topCategory,
      departmentChartData,
      categoryChartData,
      statusMap,
      riskMatrixCellCounts,
      riskMatrixCellReports,
      heatmapList,
      monthlyTrendData
    };
  }, [reports]);

  // Backward compatibility alias variables for existing tab views
  const totalReports = executiveMetrics.totalReports;
  const activeReports = executiveMetrics.openCount;
  const overdueCount = executiveMetrics.overdueCount;
  const slaRate = executiveMetrics.slaComplianceRate;
  const departmentChartData = executiveMetrics.departmentChartData;
  const categoryChartData = executiveMetrics.categoryChartData;
  const statusMap = executiveMetrics.statusMap;

  // Executive Export Handler
  const handleExportExecutivePDF = () => {
    try {
      const pdfRes = generateExecutiveSummaryPDF(reports, currentUser?.name || 'HSE Manager');
      handleDownloadPDF(pdfRes.pdfBase64, pdfRes.fileName);
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Executive Summary PDF.');
    }
  };

  // 1. Role Auth Guard
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl mt-12 text-left">
        <div className="flex items-center gap-2 mb-4 text-emerald-400">
          <Lock className="w-5 h-5" />
          <h2 className="text-base font-bold uppercase tracking-wider">HSE Command Portal Auth</h2>
        </div>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Access is strictly restricted to certified Safety Officers, HSE Admins, and corporate management. Use your authorized `@mindaauto.co.id` credentials.
        </p>

        <form onSubmit={handleLogin} className="space-y-4 font-sans">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">Corporate Email Address</label>
            <input
              type="email"
              required
              placeholder="username@mindaauto.co.id"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">Access Passcode</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {authError && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/20 rounded text-rose-400 text-xs font-mono whitespace-pre-line leading-relaxed">
              {authError}
            </div>
          )}

          {/* System Access Notice */}
          <div className="bg-slate-950 p-4 border border-slate-800/80 rounded-xl space-y-3">
            <div className="border-b border-slate-800/60 pb-2.5">
              <span className="text-xs font-bold text-slate-100 block tracking-tight">PT MINDA AUTOMOTIVE INDONESIA</span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase block">HSE Portal Security Standard</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Hanya beberapa akun yang dibuat dapat mengakses Officer Portal untuk menjaga keamanan sistem, kerahasiaan data, dan keakuratan proses investigasi HSE.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Silakan masuk menggunakan akun dan kata sandi yang telah diberikan apabila Anda merupakan bagian dari Safety Officer PT Minda Automotive Indonesia.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <span>{isLoggingIn ? 'Verifying Session...' : 'Establish Secure Connection'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    );
  }

  // 2. Main Authorized Dashboard Layout
  const isHseAdmin = currentUser.role === 'hse_admin' || currentUser.role === 'hse_officer' || currentUser.role === 'ppe_officer' || currentUser.role === 'hrga_admin' || currentUser.role === 'env_officer';

  // Filtered reports for Officer/Admin ledger panel
  const filteredReports = reports.filter(r => {
    // 1. General search (matches title, description, or department if entered)
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      const matchesSearch = r.title.toLowerCase().includes(term) || 
                            r.ticketId.toLowerCase().includes(term) ||
                            r.department.toLowerCase().includes(term) ||
                            r.description?.toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }

    // 2. Ticket ID filter
    if (searchTicketId && !r.ticketId.toLowerCase().includes(searchTicketId.toLowerCase())) {
      return false;
    }

    // 3. Employee ID filter
    if (searchEmployeeId && !r.employeeId?.toLowerCase().includes(searchEmployeeId.toLowerCase())) {
      return false;
    }

    // 4. Reporter Name filter
    if (searchReporterName && !r.reporterName?.toLowerCase().includes(searchReporterName.toLowerCase())) {
      return false;
    }

    // 5. Status filter
    if (filterStatus !== 'all' && r.status !== filterStatus) {
      return false;
    }

    // 6. Category filter
    if (filterCategory !== 'all' && r.category !== filterCategory) {
      return false;
    }

    // 7. Department filter
    if (filterDepartment !== 'all' && r.department !== filterDepartment) {
      return false;
    }

    // 8. Date Range filter
    const createdAtTime = new Date(r.createdAt).getTime();
    const nowTime = Date.now();

    if (dateRangePreset === 'last24h') {
      const oneDayAgo = nowTime - 24 * 60 * 60 * 1000;
      if (createdAtTime < oneDayAgo) return false;
    } else if (dateRangePreset === 'last7d') {
      const sevenDaysAgo = nowTime - 7 * 24 * 60 * 60 * 1000;
      if (createdAtTime < sevenDaysAgo) return false;
    } else if (dateRangePreset === 'last30d') {
      const thirtyDaysAgo = nowTime - 30 * 24 * 60 * 60 * 1000;
      if (createdAtTime < thirtyDaysAgo) return false;
    } else if (dateRangePreset === 'custom') {
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        if (createdAtTime < start.getTime()) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (createdAtTime > end.getTime()) return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      
      {/* Upper Navigation Sidebar subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'dashboard', label: t('officer.tabDashboard'), icon: BarChart3 },
            { id: 'tickets', label: t('officer.tabTickets'), icon: ClipboardList },
            { id: 'recipients', label: t('officer.tabRecipients'), icon: Mail, disabled: !isHseAdmin },
            { id: 'templates', label: t('officer.tabTemplates'), icon: Mail, disabled: !isHseAdmin },
            { id: 'weekly', label: t('officer.tabWeekly'), icon: FileText },
            { id: 'sla', label: t('officer.tabSla'), icon: Sliders, disabled: !isHseAdmin },
            { id: 'logs', label: t('officer.tabLogs'), icon: History }
          ].map(tab => (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => {
                setActiveSubtab(tab.id as any);
                setSelectedReport(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition whitespace-nowrap min-h-[40px] cursor-pointer ${
                tab.disabled 
                  ? 'opacity-40 cursor-not-allowed text-slate-600'
                  : activeSubtab === tab.id
                    ? 'bg-emerald-500 text-slate-950 shadow font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded border border-slate-800">
          {t('officer.roleLabel')}: <span className="text-emerald-400 uppercase font-bold">{currentUser.position || (currentUser.role === 'ppe_officer' || currentUser.role === 'hrga_admin' ? 'HRGA Admin' : currentUser.role.replace('_', ' '))}</span>
        </div>
      </div>

      {/* ---------------------------------------------------------
          SUBTAB: EXECUTIVE KPI DASHBOARD & MANAGEMENT OVERVIEW
          --------------------------------------------------------- */}
      {activeSubtab === 'dashboard' && (
        <div className="space-y-6">

          {/* Header Row & Executive PDF Export Button */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-500/30">
                  {t('officer.mgmtOversight')}
                </span>
                <span className="text-xs text-slate-500 font-mono">&middot; {t('officer.readOnlyMode')}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 mt-1">{t('officer.execDashboardTitle')}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{t('officer.execDashboardDesc')}</p>
            </div>

            <button
              onClick={handleExportExecutivePDF}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50 cursor-pointer shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>{t('officer.exportExecPdf')}</span>
            </button>
          </div>

          {/* Executive KPI Cards (11 Key Indicators - Mobile-First Responsive Grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">{t('officer.openHazards')}</span>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{executiveMetrics.openCount}</p>
              <span className="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">{t('officer.actionsPending')}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">{t('officer.closedHazards')}</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{executiveMetrics.closedCount}</p>
              <span className="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">{t('officer.resolvedVerified')}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">{t('officer.avgResolution')}</span>
              <p className="text-2xl font-bold font-mono text-cyan-300 mt-1">{executiveMetrics.avgResolutionDays} <span className="text-xs text-slate-400 font-normal">{t('officer.days')}</span></p>
              <span className="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Target &lt; 3.0 {t('officer.days')}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">{t('officer.slaRate')}</span>
              <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">{executiveMetrics.slaComplianceRate}%</p>
              <span className="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Target &ge; 95%</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">Top Department</span>
              <p className="text-sm font-bold text-slate-200 mt-1 truncate" title={executiveMetrics.topDepartment}>{executiveMetrics.topDepartment}</p>
              <span className="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Highest Volume</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">Top Category</span>
              <p className="text-xs font-bold text-slate-200 mt-1 truncate" title={executiveMetrics.topCategory}>{executiveMetrics.topCategory}</p>
              <span className="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Most Frequent</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Pending Validation</span>
              <p className="text-2xl font-bold font-mono text-slate-200 mt-1">{executiveMetrics.pendingValidationCount}</p>
              <span className="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Initial Review</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">Under Review</span>
              <p className="text-2xl font-bold font-mono text-blue-300 mt-1">{executiveMetrics.underReviewCount}</p>
              <span className="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">In Investigation</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Resolved Today</span>
              <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">{executiveMetrics.resolvedTodayCount}</p>
              <span className="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Closed 24 Hours</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold">SLA Breaches</span>
              <p className={`text-2xl font-bold font-mono mt-1 ${executiveMetrics.overdueCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
                {executiveMetrics.overdueCount}
              </p>
              <span className="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">&gt; 3 Days Open</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Total Hazards Logged</span>
              <p className="text-2xl font-bold font-mono text-slate-100 mt-1">{executiveMetrics.totalReports}</p>
              <span className="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Cumulative Total Database Volume</span>
            </div>

          </div>

          {/* Row 2: 5x5 Risk Matrix & Factory Area Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* 5x5 RISK MATRIX */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-emerald-400" />
                      <span>5x5 Risk Matrix (IK Pedoman PEP-HSE-P-01-IK-01)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowRiskHelpModal(true)}
                      className="p-1 text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                      title="Pedoman Standar Evaluasi Risiko IK-01"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Low (1-4)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Med (5-9)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> High (10-16)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Extreme (20-25)</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mb-4">Evaluasi Risiko Standar Internal PT MINDA AUTOMOTIVE INDONESIA (IK Pedoman PEP-HSE-P-01-IK-01). Klik sel untuk detail tiket.</p>

                {/* 5x5 Interactive Table Grid */}
                <div className="overflow-x-auto">
                  <div className="min-w-[420px] font-mono text-xs">
                    
                    {/* Header Row: Likelihood Labels */}
                    <div className="grid grid-cols-6 gap-1 mb-1 text-center text-[10px] text-slate-400 font-bold">
                      <div className="p-1 text-left text-[9px] text-slate-500 uppercase">Sev \ Like</div>
                      <div title={LIKELIHOOD_DEFINITIONS[1].title}>1: Unlikely</div>
                      <div title={LIKELIHOOD_DEFINITIONS[2].title}>2: Rarely</div>
                      <div title={LIKELIHOOD_DEFINITIONS[3].title}>3: Possible</div>
                      <div title={LIKELIHOOD_DEFINITIONS[4].title}>4: Probable</div>
                      <div title={LIKELIHOOD_DEFINITIONS[5].title}>5: Certain</div>
                    </div>

                    {/* 5 Rows for Severity (IK Pedoman PEP-HSE-P-01-IK-01) */}
                    {[
                      { s: 5, label: '5: Fatality (>1)' },
                      { s: 4, label: '4: Cacat/Fatal(1)' },
                      { s: 3, label: '3: Cacat LTI' },
                      { s: 2, label: '2: Ringan LTI' },
                      { s: 1, label: '1: Ringan (P3K)' }
                    ].map(({ s, label }) => (
                      <div key={s} className="grid grid-cols-6 gap-1 mb-1 items-center">
                        <div className="text-[9px] font-bold text-slate-400 truncate pr-1" title={SEVERITY_DEFINITIONS[s].description}>
                          {label}
                        </div>
                        {[1, 2, 3, 4, 5].map(l => {
                          const evalRes = evaluateRiskIK01(s, l);
                          const rating = evalRes.score;
                          const riskLevel = evalRes.level;
                          const cellCount = executiveMetrics.riskMatrixCellCounts[`${s}_${l}`] || 0;
                          
                          let bgClass = 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400';
                          if (riskLevel === 'Extreme') {
                            bgClass = cellCount > 0 ? 'bg-rose-950 border-rose-500 text-rose-300 font-extrabold animate-pulse hover:bg-rose-900' : 'bg-rose-950/30 border-rose-500/20 text-rose-500/60';
                          } else if (riskLevel === 'High') {
                            bgClass = cellCount > 0 ? 'bg-orange-950 border-orange-500 text-orange-300 font-bold hover:bg-orange-900' : 'bg-orange-950/30 border-orange-500/20 text-orange-500/60';
                          } else if (riskLevel === 'Moderate') {
                            bgClass = cellCount > 0 ? 'bg-amber-950 border-amber-500 text-amber-300 font-bold hover:bg-amber-900' : 'bg-amber-950/30 border-amber-500/20 text-amber-500/60';
                          } else if (cellCount > 0) {
                            bgClass = 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold hover:bg-emerald-900';
                          }

                          return (
                            <button
                              key={l}
                              type="button"
                              onClick={() => {
                                const cellReports = executiveMetrics.riskMatrixCellReports[`${s}_${l}`] || [];
                                setSelectedRiskMatrixCell({
                                  severity: s,
                                  likelihood: l,
                                  reports: cellReports
                                });
                              }}
                              className={`p-2 rounded border text-center transition cursor-pointer hover:scale-105 ${bgClass}`}
                              title={`Severity ${s} x Likelihood ${l} (Score: ${rating} ${riskLevel}) - Click to view ${cellCount} hazards`}
                            >
                              <span className="text-sm block leading-none">{cellCount}</span>
                              <span className="text-[8px] opacity-75 block mt-0.5 font-bold">R:{rating}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}

                  </div>
                </div>
              </div>
            </div>

            {/* FACTORY AREA & DEPARTMENT HEATMAP */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  <span>Factory Location & Department Heatmap</span>
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">Cluster concentrations by factory area and organizational department.</p>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {executiveMetrics.heatmapList.length === 0 ? (
                    <p className="text-xs text-slate-600 text-center py-10 font-mono">No location clusters recorded</p>
                  ) : (
                    executiveMetrics.heatmapList.map((item, idx) => {
                      const maxCount = executiveMetrics.heatmapList[0]?.count || 1;
                      const intensityPct = Math.min(100, Math.round((item.count / maxCount) * 100));

                      return (
                        <div key={idx} className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs font-mono space-y-1">
                          <div className="flex items-center justify-between text-slate-200 font-bold">
                            <span className="truncate">{item.area} &middot; <span className="text-slate-400 font-normal">{item.dept}</span></span>
                            <span className="text-emerald-400 shrink-0">{item.count} Reports</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.highestRisk === 'High' ? 'bg-rose-500' : item.highestRisk === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${intensityPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Row 3: Monthly Trend Chart & Distribution Graphics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Monthly Trend Chart */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Monthly Incident Trend (Created vs. Resolved)</h3>
              <p className="text-[11px] text-slate-400 mb-4">Track creation volume against closure trajectory across current calendar year.</p>
              
              <div className="h-64 font-mono text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={executiveMetrics.monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="created" name="Hazards Logged" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="resolved" name="Hazards Resolved" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Incident Distribution BarChart */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Department Incident Distribution</h3>
              <p className="text-[11px] text-slate-400 mb-4">Department breakdown of reported hazards.</p>
              
              <div className="h-64 font-mono text-xs">
                {executiveMetrics.departmentChartData.length === 0 ? (
                  <p className="text-slate-600 text-center py-20">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={executiveMetrics.departmentChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis stroke="#64748b" allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="reports" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* Ticket status summary breakdown table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Interactive Ticket Status Ledger Summaries</h3>
              {filterStatus !== 'all' && (
                <button
                  onClick={() => setFilterStatus('all')}
                  className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Clear Status Filter ({filterStatus})
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
              {Object.values(HazardStatus).map((status) => {
                const count = executiveMetrics.statusMap[status] || 0;
                const isSelected = filterStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => {
                      if (isSelected) {
                        setFilterStatus('all');
                      } else {
                        setFilterStatus(status);
                        setActiveSubtab('tickets');
                      }
                    }}
                    className={`p-3.5 border rounded-lg text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-950/50'
                        : 'bg-slate-950 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <span className={`text-[9px] font-mono uppercase block leading-tight font-semibold ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {mapStatusToLabel(status as HazardStatus)}
                    </span>
                    <span className={`text-xl font-bold font-mono block mt-1 ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ---------------------------------------------------------
          SUBTAB: SAFETY TICKETS PANEL & DFA STATE TRANSITIONS
          --------------------------------------------------------- */}
      {activeSubtab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Tickets list */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-emerald-400" />
                  <span>Safety Tickets Ledger</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                  {filteredReports.length} Shown
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* General search mini input */}
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search Title..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded pl-7 pr-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`border text-[10px] font-mono font-bold px-2 py-1.5 rounded flex items-center gap-1 transition cursor-pointer ${
                    showFilters || searchTicketId || searchEmployeeId || searchReporterName || filterStatus !== 'all' || filterCategory !== 'all' || filterDepartment !== 'all' || dateRangePreset !== 'all'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                  title="Advanced Ledger Filters"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Filters</span>
                  {showFilters ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                </button>

                {(searchQuery || searchTicketId || searchEmployeeId || searchReporterName || filterStatus !== 'all' || filterCategory !== 'all' || filterDepartment !== 'all' || dateRangePreset !== 'all') && (
                  <button
                    onClick={handleClearFilters}
                    className="bg-rose-950/40 hover:bg-rose-900/40 border border-rose-500/30 text-rose-400 text-[10px] font-mono font-bold p-1.5 rounded transition cursor-pointer"
                    title="Reset All Ledger Filters"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Advanced Filters Panel inside ledger sidebar */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-slate-950/60 border border-slate-850 rounded-lg p-3 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2.5 text-left">
                    {/* Date Range Preset */}
                    <div className="col-span-2">
                      <label className="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Date Range</label>
                      <select
                        value={dateRangePreset}
                        onChange={e => setDateRangePreset(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="all">All Time</option>
                        <option value="last24h">Last 24 Hours</option>
                        <option value="last7d">Last 7 Days</option>
                        <option value="last30d">Last 30 Days</option>
                        <option value="custom">Custom Range</option>
                      </select>
                    </div>

                    {/* Status Select */}
                    <div>
                      <label className="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Status</label>
                      <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="all">All Statuses</option>
                        {Object.values(HazardStatus).map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    {/* Category Select */}
                    <div>
                      <label className="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Category</label>
                      <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="all">All Categories</option>
                        <option value="A">Class A (PPE / Safety)</option>
                        <option value="B">Class B (Environmental)</option>
                        <option value="C">Class C (Maintenance)</option>
                      </select>
                    </div>

                    {/* Department Select */}
                    <div className="col-span-2">
                      <label className="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Department</label>
                      <select
                        value={filterDepartment}
                        onChange={e => setFilterDepartment(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="all">All Departments</option>
                        {DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    {/* Ticket ID Filter */}
                    <div>
                      <label className="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Ticket ID</label>
                      <input
                        type="text"
                        placeholder="TKT-2026-..."
                        value={searchTicketId}
                        onChange={e => setSearchTicketId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    {/* Employee ID Filter */}
                    <div>
                      <label className="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Employee ID</label>
                      <input
                        type="text"
                        placeholder="EMP-9021"
                        value={searchEmployeeId}
                        onChange={e => setSearchEmployeeId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    {/* Reporter Name Filter */}
                    <div className="col-span-2">
                      <label className="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Reporter Name</label>
                      <input
                        type="text"
                        placeholder="Search reporter name..."
                        value={searchReporterName}
                        onChange={e => setSearchReporterName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Custom Range Date inputs */}
                    {dateRangePreset === 'custom' && (
                      <>
                        <div>
                          <label className="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Start Date</label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={e => setCustomStartDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">End Date</label>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={e => setCustomEndDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {filteredReports.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No tickets match the filtered criteria.
                </div>
              ) : (
                filteredReports.map((report) => {
                  const isOverdue = !isResolved(report.status) && 
                    (Date.now() - new Date(report.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000);
                  const summary = getHazardSummary(report);
                  const rep = getReporterDetails(report);
                  
                  return (
                    <div
                      key={report.id}
                      onClick={() => handleSelectReport(report)}
                      className={`p-4 rounded-xl border transition cursor-pointer text-left relative ${
                        selectedReport?.id === report.id
                          ? 'bg-slate-850 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/30'
                      }`}
                    >
                      {isOverdue && (
                        <span className="absolute top-2.5 right-2.5 flex h-2 w-2" title="Overdue (>3 days)">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                      )}

                      {/* Header Row: Ticket ID & Priority Badge & Category & Actions */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-bold text-emerald-400">{report.ticketId || report.id}</span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold uppercase tracking-wider">
                            {getHazardCategoryBadge(report)}{rep.department ? ` • ${rep.department}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {report.priority && (
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                              report.priority === 'High' || report.priority === 'Critical'
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                : report.priority === 'Medium'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}>
                              {report.priority} PRIORITY
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditModal(report, e)}
                            className="p-1 rounded text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition cursor-pointer"
                            title={`Edit ${report.ticketId || report.id}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportToDelete(report);
                              setDeleteError(null);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                            title={`Delete ${report.ticketId || report.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Headline: Incident / Hazard Summary */}
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100 mt-2.5 line-clamp-2 leading-snug">
                        {summary}
                      </h4>
                      
                      {/* Metadata Grid: Dept, Reporter, Status, Logged */}
                      <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 mt-3 pt-2.5 text-[11px] text-slate-400 font-mono border-t border-slate-900/80">
                        <div>
                          <span className="text-slate-500">Dept:</span> <span className="text-slate-300 font-semibold">{rep.department}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-slate-500">Reporter:</span> <span className="text-slate-300 font-semibold">{rep.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Status:</span> <span className="text-emerald-400 font-semibold">{mapStatusToLabel(report.status)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Logged:</span> <span className="text-slate-300">{report.createdAt ? formatWIBDate(report.createdAt) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Ticket Control Panel */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {selectedReport ? (() => {
                const summary = getHazardSummary(selectedReport);
                const parsed = parseHazardIncidentDetails(selectedReport);
                const rep = getReporterDetails(selectedReport);
                const evalRes = evaluateRiskIK01(selectedReport.severity || editedSeverity, selectedReport.likelihood || editedLikelihood);

                return (
                  <motion.div
                    key={selectedReport.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left space-y-6"
                  >
                    {/* SECTION 1: HEADER / COVER */}
                    <div className="flex items-start justify-between border-b border-slate-800 pb-5 flex-wrap gap-4">
                      <div className="space-y-2 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded">
                            {selectedReport.ticketId}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-bold uppercase tracking-wider">
                            {getHazardCategoryBadge(selectedReport)}{rep.department ? ` • ${rep.department}` : ''}
                          </span>
                          {selectedReport.priority && (
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                              selectedReport.priority === 'High' || selectedReport.priority === 'Critical'
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                : selectedReport.priority === 'Medium'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}>
                              {selectedReport.priority} Priority
                            </span>
                          )}
                        </div>
                        {/* Prominent Incident / Hazard Summary as Headline */}
                        <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                          {summary}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditModal(selectedReport, e)}
                          className="bg-slate-950 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/50 text-emerald-400 font-mono text-[10px] uppercase font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow"
                          title="Edit Hazard Report Details"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Edit Report</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportTicketPDF(selectedReport)}
                          className="bg-slate-950 hover:bg-slate-850 border border-slate-700 hover:border-emerald-500/50 text-emerald-400 font-mono text-[10px] uppercase font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Export Ticket PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReportToDelete(selectedReport);
                            setDeleteError(null);
                          }}
                          className="bg-slate-950 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 text-rose-400 hover:text-rose-300 font-mono text-[10px] uppercase font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow"
                          title="Delete Hazard Report"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Delete Report</span>
                        </button>
                      </div>
                    </div>

                    {/* SECTION 2: INCIDENT DESCRIPTION (Structured) */}
                    <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-5 space-y-4 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Incident Description & Field Details</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">Form IK-01 Data Mapping</span>
                      </div>

                      {/* Detail Temuan / Main Hazard Description */}
                      {hasValue(parsed.hazardDescription) && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                            Detail Temuan / Hazard Description
                          </span>
                          <p className="leading-relaxed text-slate-200 font-sans whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                            {parsed.hazardDescription}
                          </p>
                        </div>
                      )}

                      {/* Structured Incident Attributes Grid - Renders ONLY fields that have actual data */}
                      {(hasValue(parsed.currentCondition) ||
                        hasValue(parsed.injuryStatus) ||
                        hasValue(parsed.potentialImpact) ||
                        hasValue(parsed.immediateAction) ||
                        hasValue(parsed.informedToLeader) ||
                        hasValue(parsed.improvementSuggestion) ||
                        hasValue(parsed.area) ||
                        hasValue(parsed.locationDetail)) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                          {hasValue(parsed.currentCondition) && (
                            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                              <span className="text-[9px] font-mono uppercase text-slate-500 block">Kondisi Saat Dilaporkan</span>
                              <span className="font-semibold text-slate-200 block text-[11px]">{parsed.currentCondition}</span>
                            </div>
                          )}
                          {hasValue(parsed.injuryStatus) && (
                            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                              <span className="text-[9px] font-mono uppercase text-slate-500 block">Status Korban</span>
                              <span className="font-semibold text-slate-200 block text-[11px]">{parsed.injuryStatus}</span>
                            </div>
                          )}
                          {hasValue(parsed.potentialImpact) && (
                            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                              <span className="text-[9px] font-mono uppercase text-slate-500 block">Potensi Dampak</span>
                              <span className="font-semibold text-amber-300 block text-[11px]">{parsed.potentialImpact}</span>
                            </div>
                          )}
                          {hasValue(parsed.immediateAction) && (
                            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                              <span className="text-[9px] font-mono uppercase text-slate-500 block">Tindakan Sementara</span>
                              <span className="font-semibold text-slate-200 block text-[11px]">{parsed.immediateAction}</span>
                            </div>
                          )}
                          {hasValue(parsed.informedToLeader) && (
                            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                              <span className="text-[9px] font-mono uppercase text-slate-500 block">Disampaikan ke Atasan/Leader</span>
                              <span className="font-semibold text-slate-200 block text-[11px]">{parsed.informedToLeader}</span>
                            </div>
                          )}
                          {hasValue(parsed.improvementSuggestion) && (
                            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                              <span className="text-[9px] font-mono uppercase text-slate-500 block">Saran Perbaikan</span>
                              <span className="font-semibold text-slate-200 block text-[11px]">{parsed.improvementSuggestion}</span>
                            </div>
                          )}
                          {hasValue(parsed.area) && (
                            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                              <span className="text-[9px] font-mono uppercase text-slate-500 block">Area</span>
                              <span className="font-semibold text-slate-200 block text-[11px]">{parsed.area}</span>
                            </div>
                          )}
                          {hasValue(parsed.locationDetail) && (
                            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5 sm:col-span-2">
                              <span className="text-[9px] font-mono uppercase text-slate-500 block">Detail Lokasi</span>
                              <span className="font-semibold text-slate-200 block text-[11px]">{parsed.locationDetail}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Photo Evidence if available */}
                      {selectedReport.photoEvidenceUrl && (
                        <div className="border-t border-slate-900 pt-3 space-y-1.5">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">Photo Evidence</span>
                          <a href={selectedReport.photoEvidenceUrl} target="_blank" rel="noreferrer" className="inline-block hover:opacity-90 transition">
                            <img 
                              src={selectedReport.photoEvidenceUrl} 
                              alt="Evidence" 
                              referrerPolicy="no-referrer"
                              className="max-h-48 rounded-lg border border-slate-800 object-cover shadow"
                            />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: REPORTER INFORMATION */}
                    <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 text-xs">
                      <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2 mb-3">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold">Reporter Information</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
                        {hasValue(rep.name) && (
                          <div>
                            <span className="text-[9px] uppercase text-slate-500 block">Reporter Name</span>
                            <p className="mt-0.5 font-bold text-slate-200 text-[11px]">{rep.name}</p>
                          </div>
                        )}
                        {hasValue(rep.employeeId) && (
                          <div>
                            <span className="text-[9px] uppercase text-slate-500 block">Employee ID</span>
                            <p className="mt-0.5 font-bold text-slate-200 text-[11px]">{rep.employeeId}</p>
                          </div>
                        )}
                        {hasValue(rep.email) && (
                          <div>
                            <span className="text-[9px] uppercase text-slate-500 block">Reporter Email</span>
                            <p className="mt-0.5 text-slate-400 text-[11px] truncate" title={rep.email}>{rep.email}</p>
                          </div>
                        )}
                        {hasValue(rep.department) && (
                          <div>
                            <span className="text-[9px] uppercase text-slate-500 block">Department</span>
                            <p className="mt-0.5 font-bold text-slate-200 text-[11px]">{rep.department}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION 4: WORKFLOW & TIMESTAMPS */}
                    <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 text-xs">
                      <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2 mb-3">
                        <History className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold">Workflow & Audit State</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
                        <div>
                          <span className="text-[9px] uppercase text-slate-500 block">DFA Workflow Status</span>
                          <p className="mt-0.5 font-bold text-purple-400 text-[11px]">{mapStatusToLabel(selectedReport.dfaStatus || selectedReport.status)}</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-slate-500 block">Ticket Status</span>
                          <p className="mt-0.5 font-bold text-emerald-400 text-[11px]">{mapStatusToLabel(selectedReport.status)}</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-slate-500 block">Assigned Officer / PIC</span>
                          <p className="mt-0.5 font-bold text-slate-200 text-[11px]">{selectedReport.picName || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-slate-500 block">Officer Review Status</span>
                          <p className="mt-0.5 text-slate-300 text-[11px]">
                            {selectedReport.officerReviewed ? 'Reviewed' : 'Review Pending'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-slate-500 block">Officer Review Date</span>
                          <p className="mt-0.5 text-slate-300 text-[11px]">
                            {selectedReport.officerReviewDate ? formatWIBDate(selectedReport.officerReviewDate) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-slate-500 block">Ticket Reference ID</span>
                          <p className="mt-0.5 text-emerald-400 font-bold text-[11px] truncate">{selectedReport.ticketId}</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-slate-500 block">Logged At</span>
                          <p className="mt-0.5 text-slate-300 text-[11px]">{selectedReport.createdAt ? formatWIBDateTime(selectedReport.createdAt) : 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-slate-500 block">Last Updated At</span>
                          <p className="mt-0.5 text-slate-300 text-[11px]">{selectedReport.updatedAt ? formatWIBDateTime(selectedReport.updatedAt) : 'N/A'}</p>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-1">
                          <span className="text-[9px] uppercase text-slate-500 block">Officer Comments</span>
                          <p className="mt-0.5 text-slate-300 text-[11px] truncate" title={selectedReport.officerComments || 'None'}>
                            {selectedReport.officerComments || 'None'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 5: RISK EVALUATION (PEP-HSE-P-01-IK-01) */}
                    <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-900 pb-2">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">
                            Risk Assessment (IK Pedoman PEP-HSE-P-01-IK-01)
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded font-bold border uppercase text-[10px] ${evalRes.badgeClass}`}>
                          {evalRes.label} Risk Level
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                          <span className="text-[9px] text-slate-500 uppercase block">Keparahan (Severity)</span>
                          <span className="font-bold text-slate-200 block mt-0.5">Sev {evalRes.severity}: {SEVERITY_DEFINITIONS[evalRes.severity]?.title}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{SEVERITY_DEFINITIONS[evalRes.severity]?.shortText}</span>
                        </div>

                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                          <span className="text-[9px] text-slate-500 uppercase block">Probabilitas (Likelihood)</span>
                          <span className="font-bold text-slate-200 block mt-0.5">Like {evalRes.likelihood}: {LIKELIHOOD_DEFINITIONS[evalRes.likelihood]?.title}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{LIKELIHOOD_DEFINITIONS[evalRes.likelihood]?.annualGuide}</span>
                        </div>

                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">Nilai Titik Temu Matriks</span>
                            <span className="font-extrabold text-emerald-400 text-sm block mt-0.5">{evalRes.score} ({evalRes.level})</span>
                          </div>
                          {evalRes.isOtpRequired && (
                            <span className="mt-1 text-[9px] text-rose-400 font-bold uppercase tracking-wider block">Wajib Program OTP</span>
                          )}
                        </div>
                      </div>
                    </div>

                  {/* Controller Action 1: PIC Allocator and DFA Dropdowns (Editable form) */}
                  <form onSubmit={handleSaveTicket} className="bg-slate-950 p-5 border border-slate-800 rounded-lg space-y-4">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <span>Editable Corporate Hazard Controls</span>
                    </h4>

                    {/* Form Success / Error Banners */}
                    {saveSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{saveSuccess}</span>
                      </div>
                    )}
                    {saveError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{saveError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Control 1: Assigned To (PIC Allocation) */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                          Assigned Officer (PIC)
                        </label>
                        <select
                          value={editedPicId === 'usr_hrga_admin' ? 'usr_hrga_admin' : editedPicId === 'usr_asep_permana' ? 'usr_asep_permana' : 'usr_hse_team'}
                          onChange={e => setEditedPicId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="usr_hrga_admin">HRGA Admin</option>
                          <option value="usr_asep_permana">Asep Permana</option>
                          <option value="usr_hse_team">HSE Team</option>
                        </select>
                      </div>

                      {/* Control 2: Status Dropdown with DFA rules */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                          Ticket Status (DFA Enforced)
                        </label>
                        <select
                          value={editedStatus}
                          onChange={e => setEditedStatus(e.target.value as HazardStatus)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                        >
                          {Object.values(HazardStatus).map((state) => (
                            <option key={state} value={state}>
                              {mapStatusToLabel(state)}
                            </option>
                          ))}
                        </select>
                        <p className="text-[9px] text-slate-500 font-mono mt-1">
                          Allowed subsequent states: {DFAValidationEngine.getNextAllowedStates(selectedReport.status).map(s => mapStatusToLabel(s)).join(', ') || 'None'}
                        </p>
                      </div>
                    </div>

                    {/* Risk Assessment Matrix Controls (IK Pedoman PEP-HSE-P-01-IK-01) */}
                    {(() => {
                      const evalRes = evaluateRiskIK01(editedSeverity, editedLikelihood);
                      return (
                        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 flex-wrap gap-2">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              Evaluasi Risiko Standar Internal (PEP-HSE-P-01-IK-01)
                            </span>
                            <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded border ${evalRes.badgeClass}`}>
                              Nilai Risiko: {evalRes.score} ({evalRes.level})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Severity Selection */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                                Keparahan / Severity (1 - 5)
                              </label>
                              <select
                                value={editedSeverity}
                                onChange={e => setEditedSeverity(Number(e.target.value))}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                              >
                                {Object.values(SEVERITY_DEFINITIONS).map((sev: SeverityDefinition) => (
                                  <option key={sev.level} value={sev.level}>
                                    Severity {sev.level} - {sev.title} ({sev.shortText})
                                  </option>
                                ))}
                              </select>
                              <p className="text-[10px] text-slate-400 leading-snug">
                                {SEVERITY_DEFINITIONS[editedSeverity]?.description}
                              </p>
                            </div>

                            {/* Likelihood Selection */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                                Kemungkinan / Likelihood (1 - 5)
                              </label>
                              <select
                                value={editedLikelihood}
                                onChange={e => setEditedLikelihood(Number(e.target.value))}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                              >
                                {Object.values(LIKELIHOOD_DEFINITIONS).map((lik: LikelihoodDefinition) => (
                                  <option key={lik.level} value={lik.level}>
                                    Likelihood {lik.level} - {lik.shortText} ({lik.annualGuide})
                                  </option>
                                ))}
                              </select>
                              <p className="text-[10px] text-slate-400 leading-snug">
                                {LIKELIHOOD_DEFINITIONS[editedLikelihood]?.title}
                              </p>
                            </div>
                          </div>

                          {/* Rule Requirements & Additional Inputs */}
                          <div className="space-y-3 border-t border-slate-800/80 pt-3 text-xs">
                            {/* Control Hierarchy Requirement (Score >= 5) */}
                            {evalRes.isAdditionalControlRequired && (
                              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded space-y-2">
                                <p className="font-semibold text-[11px] flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>Pengendalian Tambahan Wajib Ditentukan (Nilai &ge; 5)</span>
                                </p>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono uppercase text-slate-400 block">
                                    Hirarki Pengendalian Tambahan
                                  </label>
                                  <select
                                    value={editedAdditionalControl}
                                    onChange={e => setEditedAdditionalControl(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                                  >
                                    {HIERARCHY_OF_CONTROLS.map(hc => (
                                      <option key={hc.id} value={hc.title}>
                                        {hc.title} - {hc.desc}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}

                            {/* OTP Requirement (Score > 9) */}
                            {evalRes.isOtpRequired && (
                              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded space-y-2">
                                <p className="font-semibold text-[11px] flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                  <span>WAJIB Membuat Sasaran Program K3 (OTP) (Nilai &gt; 9)</span>
                                </p>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                                    Nama Program OTP (Objective Target Program)
                                  </label>
                                  <input
                                    type="text"
                                    value={editedOtpProgramName}
                                    onChange={e => setEditedOtpProgramName(e.target.value)}
                                    placeholder="Contoh: OTP-2026-HSE-001 (Perbaikan Sistem Kelistrikan Area 3)"
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Control 3: Officer Comments */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                        Primary Officer Comments (officer_comments column)
                      </label>
                      <textarea
                        value={editedOfficerComments}
                        onChange={e => setEditedOfficerComments(e.target.value)}
                        placeholder="Type standard mitigation comments, corporate safety findings, or escalation notes directly on the hazard ticket row..."
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-bold px-6 py-2 rounded text-xs transition flex items-center gap-2 cursor-pointer"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Ticket Settings</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Controller Action 3: Response Comment discussions */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <span>Comment Activity Ledger (Public / Private Comments)</span>
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto bg-slate-950 p-3 rounded border border-slate-800/60">
                      {comments.length === 0 ? (
                        <p className="text-slate-600 text-center py-6 text-xs font-mono">No notes or status commentaries yet.</p>
                      ) : (
                        comments.map(c => {
                          const isInternal = c.comment_text?.startsWith('[INTERNAL]');
                          const displayCommentText = isInternal ? c.comment_text.replace('[INTERNAL]', '').trim() : c.comment_text;

                          return (
                            <div key={c.id} className={`p-2.5 border-b border-slate-900/60 text-xs ${isInternal ? 'bg-slate-900/40 border-l-2 border-amber-500' : ''}`}>
                              <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                                <span className="font-bold text-slate-400 flex items-center gap-1.5">
                                  <span>{c.user_name} ({c.user_role || 'staff'})</span>
                                  {isInternal && (
                                    <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded uppercase font-mono font-bold">
                                      🔒 Internal Use Only
                                    </span>
                                  )}
                                </span>
                                <span>{formatWIBDateTime(c.created_at)}</span>
                              </div>
                              <p className="text-slate-300 font-sans leading-relaxed">{displayCommentText}</p>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form onSubmit={handlePostComment} className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Log mitigation notes, instructions, or progress updates..."
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          className="flex-grow bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="submit"
                          disabled={isPostingComment}
                          className="bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 border border-slate-700 text-slate-200 px-4 py-2 text-xs font-semibold rounded transition shrink-0 cursor-pointer"
                        >
                          {isPostingComment ? 'Logging...' : 'Post'}
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isCommentInternal}
                            onChange={e => setIsCommentInternal(e.target.checked)}
                            className="bg-slate-950 border-slate-800 rounded text-emerald-500 focus:ring-0 w-3 h-3 cursor-pointer"
                          />
                          <span>🔒 Mark as internal comment (not visible to public tracking)</span>
                        </label>
                      </div>
                    </form>
                  </div>

                </motion.div>
              );
            })() : (
                <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-12 text-center text-slate-500 h-96 flex flex-col items-center justify-center">
                  <Eye className="w-8 h-8 text-slate-600 mb-3 animate-pulse" />
                  <h3 className="text-sm font-semibold text-slate-400">No Ticket Selected</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs leading-normal">
                    Select any hazard report from the list on the left to allocate PICs, process DFA transitions, or write commentaries.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}

      {/* ---------------------------------------------------------
          SUBTAB: EMAIL NOTIFICATION CONFIGURATION
          --------------------------------------------------------- */}
      {activeSubtab === 'recipients' && isHseAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
          
          {/* Recipient Editor / Configuration Form */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>{selectedRecId ? 'Edit Konfigurasi Penerima' : 'Tambah Penerima Notifikasi'}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Atur daftar email, mode routing, dan jenis notifikasi otomatis.
                </p>
              </div>
              {selectedRecId && (
                <button
                  type="button"
                  onClick={handleClearRecForm}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline"
                >
                  Form Baru
                </button>
              )}
            </div>

            <form onSubmit={handleSaveRecipient} className="space-y-4">
              {/* Nama & Jabatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block font-semibold mb-1">
                    Nama Lengkap <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={recName}
                    onChange={e => setRecName(e.target.value)}
                    placeholder="Contoh: Purwanto"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block font-semibold mb-1">
                    Jabatan / Posisi <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={recPosition}
                    onChange={e => setRecPosition(e.target.value)}
                    placeholder="Contoh: HSE Supervisor"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Email & Authority Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block font-semibold mb-1">
                    Alamat Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={recEmail}
                    onChange={e => setRecEmail(e.target.value)}
                    placeholder="Contoh: hse_supervisor@mindaauto.co.id"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block font-semibold mb-1">
                    Role System Authorization
                  </label>
                  <select
                    value={recRole}
                    onChange={e => setRecRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="hse_admin">HSE Admin</option>
                    <option value="hse_officer">HSE Officer</option>
                    <option value="hrga_admin">HRGA Admin</option>
                    <option value="env_officer">Environmental Officer</option>
                    <option value="management">Management / Executive</option>
                  </select>
                </div>
              </div>

              {/* Status & Mandatory Checkboxes */}
              <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recActive}
                    onChange={e => setRecActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-200 font-medium">Status Aktif</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recIsMandatory}
                    onChange={e => setRecIsMandatory(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs text-amber-300 font-medium">Penerima Wajib (Mandatory)</span>
                </label>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block font-semibold mb-2">
                  Mode Routing Notifikasi
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecMode('all')}
                    className={`p-2.5 sm:p-3 rounded-lg border text-left transition cursor-pointer ${
                      recMode === 'all'
                        ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                      <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="hidden sm:inline">Mode A: Kirim Semua Notifikasi</span>
                      <span className="sm:hidden">Mode A: Semua Notifikasi</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Menerima seluruh email notifikasi tanpa memfilter keyword.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecMode('keyword')}
                    className={`p-2.5 sm:p-3 rounded-lg border text-left transition cursor-pointer ${
                      recMode === 'keyword'
                        ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                      <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="hidden sm:inline">Mode B: Keyword Based</span>
                      <span className="sm:hidden">Mode B: Keyword</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Hanya dikirim jika laporan cocok dengan keyword pilihan.
                    </p>
                  </button>
                </div>
              </div>

              {/* Jenis Notifikasi Disetujui */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                  Jenis Event Notifikasi Disetujui
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 border border-slate-800 rounded-lg text-xs">
                  {[
                    { key: 'reportCreated', label: 'Report Created' },
                    { key: 'statusUpdated', label: 'Status Updated' },
                    { key: 'reportCompleted', label: 'Report Completed' },
                    { key: 'reminderDay3', label: 'Reminder Day 3' },
                    { key: 'reminderDay7', label: 'Reminder Day 7' },
                    { key: 'reminderDay14', label: 'Reminder Day 14' },
                    { key: 'reminderDay30', label: 'Reminder Day 30' },
                    { key: 'weeklyReport', label: 'Weekly Report' }
                  ].map(item => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer select-none py-0.5">
                      <input
                        type="checkbox"
                        checked={Boolean(recNotificationEvents[item.key as keyof RecipientNotificationEvents])}
                        onChange={e => setRecNotificationEvents((prev: RecipientNotificationEvents) => ({
                          ...prev,
                          [item.key]: e.target.checked
                        }))}
                        className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-slate-300 font-mono text-[11px]">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Keyword Section (Only for Mode B) */}
              {recMode === 'keyword' && (
                <div className="space-y-3 p-3.5 bg-slate-950/80 border border-slate-800/90 rounded-lg">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span>Custom Keyword Filtering</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {recKeywords.length} keyword aktif
                    </span>
                  </div>

                  {/* Active keywords tags */}
                  <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-slate-900 border border-slate-800 rounded">
                    {recKeywords.length === 0 ? (
                      <span className="text-[11px] text-slate-500 italic">Belum ada keyword dipilih. Pilih preset di bawah atau tambah custom.</span>
                    ) : (
                      recKeywords.map(kw => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(kw)}
                            className="text-emerald-400 hover:text-rose-400 cursor-pointer ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Add Custom Keyword Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={recCustomKwInput}
                      onChange={e => setRecCustomKwInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddCustomKeyword(e); }}
                      placeholder="Ketik keyword baru..."
                      className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded px-2.5 sm:px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomKeyword}
                      className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tambah Keyword</span>
                      <span className="sm:hidden">Tambah</span>
                    </button>
                  </div>

                  {/* Quick Select Presets */}
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block mb-1.5">Pilih Cepat Keyword Populer:</span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                      {PRESET_KEYWORDS.map(kw => {
                        const isSelected = recKeywords.some(k => k.toLowerCase() === kw.toLowerCase());
                        return (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => handleToggleKeyword(kw)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            {isSelected ? `✓ ${kw}` : `+ ${kw}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingRec}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSavingRec ? 'Menyimpan...' : selectedRecId ? 'Update Konfigurasi Email' : 'Simpan Penerima Email'}</span>
                </button>
                {selectedRecId && (
                  <button
                    type="button"
                    onClick={handleClearRecForm}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded text-xs transition cursor-pointer"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Configured Recipients Table */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Daftar Penerima Notifikasi Email Configured</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Total {recipients.length} penerima terdaftar. Klik baris untuk mengedit konfigurasi.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial min-w-[130px]">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={recSearch}
                    onChange={e => setRecSearch(e.target.value)}
                    placeholder="Cari penerima..."
                    className="bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 w-full sm:w-44"
                  />
                </div>

                <select
                  value={recCategoryFilter}
                  onChange={e => setRecCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 sm:px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 max-w-[140px] sm:max-w-none text-[11px] sm:text-xs shrink-0"
                >
                  <option value="all">Semua Mode</option>
                  <option value="all_notifications">Mode A (Semua)</option>
                  <option value="keyword_based">Mode B (Keyword)</option>
                  <option value="mandatory">Penerima Wajib</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300 font-mono">
                <thead className="bg-slate-950 text-[10px] text-slate-400 uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2.5">Penerima / Jabatan</th>
                    <th className="px-3 py-2.5">Email Dispatch</th>
                    <th className="px-3 py-2.5">Mode & Routing</th>
                    <th className="px-3 py-2.5">Keyword Match</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-xs">
                        Tidak ada penerima notifikasi yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRecipients.map((rec) => {
                      const isSelected = selectedRecId === rec.id;
                      const isActive = rec.active !== false;
                      const isModeA = rec.mode === 'all';
                      const enabledEventsCount = rec.notificationEvents 
                        ? Object.values(rec.notificationEvents).filter(Boolean).length 
                        : 8;

                      return (
                        <tr
                          key={rec.id}
                          onClick={() => handleSelectRecipient(rec)}
                          className={`border-b border-slate-800/60 cursor-pointer transition ${
                            isSelected ? 'bg-emerald-950/40 border-emerald-500/40' : 'hover:bg-slate-850/50'
                          }`}
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-sans font-bold text-slate-100 text-xs flex items-center gap-1.5">
                              <span>{rec.name}</span>
                              {rec.isMandatory && (
                                <span className="px-1.5 py-0.2 bg-amber-950 text-amber-400 border border-amber-800/60 rounded text-[9px] font-mono">
                                  Wajib
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {rec.position || rec.role}
                            </div>
                          </td>

                          <td className="px-3 py-2.5 text-slate-300 font-mono text-[11px]">
                            {rec.email}
                          </td>

                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                              isModeA 
                                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800' 
                                : 'bg-blue-950/90 text-blue-300 border-blue-800'
                            }`}>
                              <span className="hidden sm:inline">{isModeA ? 'Mode A: Semua' : 'Mode B: Keyword'}</span>
                              <span className="sm:hidden">{isModeA ? 'Mode A' : 'Mode B'}</span>
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {enabledEventsCount}/8 Events Active
                            </div>
                          </td>

                          <td className="px-3 py-2.5">
                            {isModeA ? (
                              <span className="text-[10px] text-slate-500 italic">No Filter (All)</span>
                            ) : rec.keywords && rec.keywords.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[160px]">
                                {rec.keywords.slice(0, 3).map(kw => (
                                  <span key={kw} className="px-1.5 py-0.2 bg-slate-950 text-slate-300 border border-slate-800 rounded text-[9px]">
                                    {kw}
                                  </span>
                                ))}
                                {rec.keywords.length > 3 && (
                                  <span className="text-[10px] text-emerald-400 font-bold">
                                    +{rec.keywords.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">None</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5">
                            <span
                              onClick={(e) => handleToggleActiveRecipient(rec, e)}
                              title="Klik untuk mengubah status aktif"
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer border ${
                                isActive
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              {isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleSelectRecipient(rec)}
                                className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition font-semibold"
                              >
                                Edit
                              </button>
                              {confirmDeleteRecId === rec.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteRecipient(rec.id, e)}
                                    className="px-2 py-1 text-[10px] bg-rose-600 hover:bg-rose-500 text-white font-bold rounded transition shadow"
                                  >
                                    Ya, Hapus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteRecId(null); }}
                                    className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteRecId(rec.id); }}
                                  className="px-2 py-1 text-[10px] bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded border border-rose-800/50 transition font-semibold"
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ---------------------------------------------------------
          SUBTAB: WEEKLY PDF PERFORMANCE COMPILATION
          --------------------------------------------------------- */}
      {activeSubtab === 'weekly' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Action trigger compiler */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mb-3">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Performance Reporter Daemon</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              The scheduler triggers an automated weekly HSE audit compile on <b>Friday at 17:00 WIB</b>. Use this interface to compile an off-schedule on-demand metric summary.
            </p>

            <button
              onClick={handleCompileWeekly}
              disabled={compilingReport}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${compilingReport ? 'animate-spin' : ''}`} />
              <span>{compilingReport ? 'Compiling PDF & Metrics...' : 'Compile On-Demand Weekly Report'}</span>
            </button>

            <AnimatePresence>
              {compilationSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-4 bg-emerald-950/40 border border-emerald-500/20 rounded-lg text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-slate-200">Compile Successfully Finished!</h4>
                      <p className="text-slate-400 mt-1">Compiled Reference: <span className="font-mono text-emerald-400 font-semibold">{compilationSuccess.id}</span></p>
                      <ul className="list-disc pl-4 mt-2 space-y-1 text-slate-400 font-mono text-[11px]">
                        <li>Reported: {compilationSuccess.totalReported} hazards</li>
                        <li>Resolved: {compilationSuccess.totalResolved} issues</li>
                        <li>Critical Class: {compilationSuccess.criticalCount} cases</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History Lists */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left">
            <h3 className="text-sm font-bold text-slate-100 mb-4">Weekly Compiled History</h3>

            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {weeklyReports.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-12">No weekly performance audit logs compiled yet.</p>
              ) : (
                weeklyReports.map((item) => (
                  <div key={item.id} className="bg-slate-950 p-4 border border-slate-800/80 rounded-lg flex items-center justify-between gap-4 text-xs font-mono">
                    <div>
                      <span className="font-bold text-emerald-400">{item.id}</span>
                      <p className="text-slate-500 mt-1 text-[11px]">Period: {item.weekStartDate} &middot; {item.weekEndDate}</p>
                      <p className="text-slate-400 mt-1 text-[10px] font-sans">
                        Reported: <b>{item.totalReported}</b> &middot; Resolved: <b>{item.totalResolved}</b> &middot; Criticals: <b>{item.criticalCount}</b>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownloadPDF(item.pdfBase64 || '', `PT_MINDA_Weekly_HSE_Report_${item.id}.pdf`)}
                        className="bg-slate-900 border border-slate-800 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 font-bold px-3 py-1.5 rounded text-[10px] transition cursor-pointer"
                      >
                        Download PDF
                      </button>
                      {isHseAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteWeekly(item.id)}
                          className="bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900 font-bold px-2.5 py-1.5 rounded text-[10px] transition cursor-pointer"
                          title="Delete report"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ---------------------------------------------------------
          SUBTAB: SLA DAEMON TRIGGER (SCHEDULER MANAGE)
          --------------------------------------------------------- */}
      {activeSubtab === 'sla' && isHseAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Action block */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mb-3">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>SLA Escalation Scheduler Daemon</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              PT Minda enforces stringent SLA response rates (Warning: unresolved 3 days; Critical warning: unresolved 5 days; Management Escalation: unresolved 10 days). Use this manual scheduler command to trigger SLA compliance checks on active tickets instantly.
            </p>

            <button
              onClick={handleTriggerSLAChecks}
              disabled={runningSLA}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{runningSLA ? 'Processing SLA Daemon...' : 'Trigger SLA Escalation Engine'}</span>
            </button>

            <AnimatePresence>
              {slaResultCount !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-4 bg-emerald-950/40 border border-emerald-500/20 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-slate-200">SLA Daemon Execution Done</h4>
                      <p className="text-slate-400 mt-1">
                        Checked all pending tickets. Triggered dispatches/escalations count: <span className="font-mono font-bold text-emerald-400">{slaResultCount} dispatches</span>.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SLA breaches dashboard tracker */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left">
            <h3 className="text-sm font-bold text-slate-100 mb-4">Breaching Hazards Queue</h3>

            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {reports.filter(r => !isResolved(r.status)).map(r => {
                const elapsedDays = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                const slaBreached = elapsedDays >= 3;

                return (
                  <div key={r.id} className={`p-4 rounded-lg border flex items-center justify-between gap-4 text-xs font-mono ${slaBreached ? 'bg-rose-950/20 border-rose-500/25' : 'bg-slate-950/60 border-slate-800'}`}>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-200">{r.ticketId}</span>
                        {slaBreached && <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold uppercase animate-pulse">SLA Breached</span>}
                      </div>
                      <p className="text-[11px] font-sans font-semibold text-slate-300 mt-1 line-clamp-1">{r.title}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Reporter: {r.reporterName || 'Anonymous'} &middot; Age: <b>{elapsedDays} days</b></p>
                    </div>

                    <div className="text-right text-[10px] font-bold text-slate-400 shrink-0">
                      Category Class {r.category}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ---------------------------------------------------------
          SUBTAB: SYSTEM AUDIT LOGS
          --------------------------------------------------------- */}
      {activeSubtab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-400" />
                <span>System Security Audit Trail Logs</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                Immutable chronological registry monitoring all DFA transitions, PIC allocations, and weekly compilers.
              </p>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto overflow-x-auto pr-1">
            <table className="w-full text-xs text-left text-slate-300 font-mono">
              <thead className="bg-slate-950 text-[10px] text-slate-500 uppercase border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Previous Value</th>
                  <th className="px-4 py-3">New Value</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-600">No system operations logged yet.</td>
                  </tr>
                ) : (
                  [...auditLogs]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((log) => {
                      let prevValue = '-';
                      let newValue = '-';
                      try {
                        const parsed = JSON.parse(log.details);
                        prevValue = parsed.prev || '-';
                        newValue = parsed.new || '-';
                      } catch (e) {
                        newValue = log.details;
                      }
                      
                      const rawId = log.hazardId || (log as any).hazard_id || '-';
                      const matchedReport = reports.find(r => r.id === rawId || r.ticketId === rawId);
                      const ticketId = matchedReport ? matchedReport.ticketId : (rawId.startsWith('TKT-') || rawId.startsWith('HZ-') ? rawId : (rawId.length > 20 ? 'TKT-RECORD' : rawId));
                      
                      return (
                        <tr key={log.id} className="border-b border-slate-850 hover:bg-slate-850/10">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatWIBDateTime(log.createdAt)}</td>
                          <td className="px-4 py-3 text-emerald-400 font-semibold whitespace-nowrap">{ticketId}</td>
                          <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{log.userEmail}</td>
                          <td className="px-4 py-3 text-emerald-400 font-bold whitespace-nowrap">{log.action}</td>
                          <td className="px-4 py-3 text-slate-400 truncate max-w-[150px]" title={prevValue}>{prevValue}</td>
                          <td className="px-4 py-3 text-slate-200 truncate max-w-[200px]" title={newValue}>{newValue}</td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          SUBTAB: NOTIFICATION TEMPLATES MANAGEMENT
          --------------------------------------------------------- */}
      {activeSubtab === 'templates' && isHseAdmin && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 mb-6 gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>Customizable Notification Templates</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                Configure subjects and bodies of notifications dispatched on critical portal events.
              </p>
            </div>
            <button
              onClick={handleResetTemplates}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-mono text-[10px] uppercase font-bold px-3 py-1.5 rounded transition cursor-pointer"
            >
              Reset to Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Template Selection */}
            <div className="lg:col-span-4 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">Select Event Template</span>
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    setSelectedTemplateId(tpl.id);
                    setSubjectInput(tpl.subject);
                    setBodyInput(tpl.body);
                    setSuccessMsg(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-lg border transition font-mono block cursor-pointer ${
                    selectedTemplateId === tpl.id
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                  }`}
                >
                  <p className="text-xs font-bold font-sans text-slate-200">{tpl.name}</p>
                  <p className="text-[9px] text-slate-500 mt-1 uppercase">Event ID: {tpl.id}</p>
                </button>
              ))}
            </div>

            {/* Right Column: Template Editor */}
            {selectedTemplate && (
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-slate-300">Editing Template: <span className="text-emerald-400 font-mono">{selectedTemplate.name}</span></span>
                    <span className="text-[10px] text-slate-500 font-mono">Available Placeholders:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.placeholders.map((ph) => (
                      <code
                        key={ph}
                        onClick={() => handleInsertPlaceholder(ph)}
                        className="text-[10px] bg-slate-950 border border-slate-850 rounded px-2 py-1 text-slate-400 hover:bg-slate-900 hover:text-emerald-400 cursor-pointer transition font-mono"
                        title="Click to insert placeholder at cursor"
                      >
                        {`{${ph}}`}
                      </code>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-600 mt-2.5 italic leading-normal font-sans">
                    * Click any placeholder badge above to insert it at the cursor position inside the body field.
                  </p>
                </div>

                <div className="space-y-4 font-sans">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Subject Template (Email Subject Header)</label>
                    <input
                      type="text"
                      ref={subjectInputRef}
                      value={subjectInput}
                      onFocus={() => setActiveFocusField('subject')}
                      onChange={(e) => setSubjectInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded px-3 py-2 text-xs text-slate-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Body Template (Email & In-App Text)</label>
                    <textarea
                      value={bodyInput}
                      rows={8}
                      ref={textareaRef}
                      onFocus={() => setActiveFocusField('body')}
                      onChange={(e) => setBodyInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded px-3 py-2 text-xs text-slate-200 font-mono leading-relaxed"
                    />
                  </div>

                  {successMsg && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded text-emerald-400 text-xs font-mono">
                      {successMsg}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveTemplate}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded text-xs transition cursor-pointer font-sans uppercase tracking-wider"
                    >
                      Save Template Changes
                    </button>
                  </div>
                </div>

                {/* Test Render Preview */}
                <div className="border-t border-slate-800/80 pt-4 mt-6">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-2">Live Dynamic Preview Render (Mock Data)</span>
                  <div className="bg-slate-950 border border-slate-850 rounded-lg p-4 font-mono text-xs text-slate-400 space-y-3">
                    <div className="border-b border-slate-900 pb-2.5 flex items-start gap-2">
                      <span className="text-[10px] text-slate-500 uppercase w-16 shrink-0 mt-0.5">Subject:</span>
                      <span className="text-slate-200 font-sans font-semibold leading-snug">{testRendered.subject}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-slate-500 uppercase w-16 shrink-0 mt-0.5">Body:</span>
                      <div className="text-slate-300 font-sans whitespace-pre-wrap leading-relaxed flex-1">
                        {testRendered.body}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: RISK MATRIX CELL DETAILED TICKETS LIST */}
      <AnimatePresence>
        {selectedRiskMatrixCell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-left space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-emerald-400" />
                  <div>
                    {(() => {
                      const evalRes = evaluateRiskIK01(selectedRiskMatrixCell.severity, selectedRiskMatrixCell.likelihood);
                      return (
                        <>
                          <h3 className="text-sm font-bold text-slate-100">
                            Risk Matrix Cell: Sev {selectedRiskMatrixCell.severity} ({SEVERITY_DEFINITIONS[selectedRiskMatrixCell.severity]?.title}) × Like {selectedRiskMatrixCell.likelihood} ({LIKELIHOOD_DEFINITIONS[selectedRiskMatrixCell.likelihood]?.shortText})
                          </h3>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Risk Score: <span className="font-bold text-emerald-400">{evalRes.score} ({evalRes.level})</span> &middot; Total Hazards Logged: <span className="font-bold text-slate-200">{selectedRiskMatrixCell.reports.length}</span>
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRiskMatrixCell(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Cell Risk Badge & Mandatory Pedoman Indicators */}
              {(() => {
                const evalRes = evaluateRiskIK01(selectedRiskMatrixCell.severity, selectedRiskMatrixCell.likelihood);
                return (
                  <div className="space-y-2 shrink-0 font-mono text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400">Classification Level:</span>
                      <span className={`px-2.5 py-0.5 rounded font-bold border uppercase ${evalRes.badgeClass}`}>
                        {evalRes.label} Risk Level
                      </span>
                    </div>

                    {evalRes.isOtpRequired && (
                      <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-mono flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span><strong>Wajib OTP (Objective Target Program)</strong> — Kolom 26 Pedoman (Score &gt; 9). Program perbaikan khusus harus didaftarkan.</span>
                      </div>
                    )}

                    {evalRes.isAdditionalControlRequired && !evalRes.isOtpRequired && (
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-mono flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                        <span><strong>Wajib Pengendalian Tambahan</strong> — Hirarki Pengendalian (Eliminasi, Substitusi, Rekayasa, Administrasi, APD).</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Reports List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {selectedRiskMatrixCell.reports.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-mono text-xs bg-slate-950/50 rounded-xl border border-slate-850">
                    No active hazard reports registered in this matrix cell.
                  </div>
                ) : (
                  selectedRiskMatrixCell.reports.map((report) => {
                    const cellSummary = getHazardSummary(report);
                    const cellRep = getReporterDetails(report);
                    return (
                      <div
                        key={report.id}
                        className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 font-mono">
                          <span className="font-bold text-emerald-400 text-sm">{report.ticketId}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                            Status: {mapStatusToLabel(report.status)}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-100 text-xs line-clamp-2 leading-snug">{cellSummary}</h4>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                          <div>Department: <span className="text-slate-200 font-semibold">{cellRep.department}</span></div>
                          <div>Area: <span className="text-slate-200 font-semibold">{report.area || 'N/A'}</span></div>
                          <div>Reporter: <span className="text-slate-200 font-semibold">{cellRep.name}</span></div>
                          <div>Assigned PIC: <span className="text-slate-200 font-semibold">{report.picName || 'Unassigned'}</span></div>
                          <div>Created: <span className="text-slate-300">{formatWIBDateTime(report.createdAt)}</span></div>
                          <div>Priority: <span className="text-amber-400 font-semibold">{report.priority || 'Normal'}</span></div>
                        </div>

                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReport(report);
                              setActiveSubtab('tickets');
                              setSelectedRiskMatrixCell(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open Ticket Control Panel</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedRiskMatrixCell(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Close Modal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: RISK CLASSIFICATION & CALCULATION HELP GUIDE */}
      <AnimatePresence>
        {showRiskHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-left space-y-5 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Pedoman Evaluasi Risiko K3 (IK Pedoman PEP-HSE-P-01-IK-01)</h3>
                    <p className="text-[11px] text-slate-400 font-mono">PT MINDA AUTOMOTIVE INDONESIA — Corporate HSE Standard</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRiskHelpModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Principle Card */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 text-center space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block font-bold">Metode Penentuan Risk Level</span>
                <div className="text-sm font-mono font-bold text-slate-100">
                  Titik Temu Matriks: Severity (1 - 5) vs Probability / Likelihood (1 - 5)
                </div>
                <p className="text-[11px] text-slate-300">
                  Nilai risiko diperoleh dengan menarik titik temu pada matriks sesuai pedoman internal perusahaan (IK Pedoman PEP-HSE-P-01-IK-01).
                </p>
              </div>

              {/* 5x5 Matrix Lookup Visual Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wide">1. Matriks Evaluasi Risiko (IK Pedoman PEP-HSE-P-01-IK-01)</h4>
                <div className="overflow-x-auto bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[10px]">
                  <div className="min-w-[480px]">
                    <div className="grid grid-cols-6 gap-1 mb-1 text-center font-bold text-slate-400">
                      <div className="text-left text-slate-500">Sev \ Like</div>
                      <div>1 (Unlikely)</div>
                      <div>2 (Rarely)</div>
                      <div>3 (Possible)</div>
                      <div>4 (Probable)</div>
                      <div>5 (Certain)</div>
                    </div>
                    {[5, 4, 3, 2, 1].map(s => (
                      <div key={s} className="grid grid-cols-6 gap-1 mb-1 items-center">
                        <div className="font-bold text-slate-300 truncate pr-1">
                          {SEVERITY_DEFINITIONS[s]?.title}
                        </div>
                        {[1, 2, 3, 4, 5].map(l => {
                          const evalCell = evaluateRiskIK01(s, l);
                          return (
                            <div
                              key={l}
                              className={`p-1.5 rounded text-center border font-bold ${evalCell.badgeClass}`}
                            >
                              <span>{evalCell.score}</span>
                              <span className="block text-[8px] uppercase">{evalCell.level}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Severity Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wide">2. Skala Keparahan (Severity) — IK Pedoman</h4>
                <div className="grid grid-cols-1 gap-1.5 text-xs font-mono">
                  {Object.values(SEVERITY_DEFINITIONS).map(sev => (
                    <div key={sev.level} className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 flex items-start gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold text-xs shrink-0">
                        Sev {sev.level}
                      </span>
                      <div>
                        <div className="text-slate-100 font-bold">{sev.title}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{sev.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Likelihood Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wide">3. Skala Probabilitas (Likelihood / Probability) — IK Pedoman</h4>
                <div className="grid grid-cols-1 gap-1.5 text-xs font-mono">
                  {Object.values(LIKELIHOOD_DEFINITIONS).map(lik => (
                    <div key={lik.level} className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 flex items-start gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold text-xs shrink-0">
                        Like {lik.level}
                      </span>
                      <div className="flex-1">
                        <div className="text-slate-100 font-bold flex items-center justify-between gap-2 flex-wrap">
                          <span>{lik.title}</span>
                          <span className="text-[10px] text-emerald-400/80 font-mono">{lik.annualGuide}</span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">Frekuensi: {lik.frequencyGuide}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Classification & Rules */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wide">4. Ketentuan Wajib & Hirarki Pengendalian</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                    <div className="font-bold text-emerald-400 mb-1">Low Risk (Nilai 1 - 4)</div>
                    Pengawasan rutin dan prosedur kerja standar (SOP).
                  </div>
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300">
                    <div className="font-bold text-amber-400 mb-1">Moderate Risk (Nilai 5 - 9)</div>
                    Wajib Pengendalian Tambahan sesuai Hirarki Pengendalian.
                  </div>
                  <div className="p-3 rounded-lg bg-orange-950/40 border border-orange-500/30 text-orange-300">
                    <div className="font-bold text-orange-400 mb-1">High Risk (Nilai 10 - 16)</div>
                    Wajib Pengendalian Tambahan & <strong>Wajib OTP (Objective Target Program)</strong>.
                  </div>
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300">
                    <div className="font-bold text-rose-400 mb-1">Extreme Risk (Nilai 20 - 25)</div>
                    Stop pekerjaan segera, tindak lanjut darurat, & <strong>Wajib OTP</strong>.
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-2 mt-2">
                  <span className="text-emerald-400 font-bold block uppercase tracking-wider text-[10px]">Hirarki Pengendalian (Hierarchy of Controls)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 text-[10px]">
                    {HIERARCHY_OF_CONTROLS.map(hoc => (
                      <div key={hoc.id} className="p-2 rounded bg-slate-900 border border-slate-800">
                        <div className="text-slate-200 font-bold">{hoc.title}</div>
                        <div className="text-slate-400 text-[9px] mt-0.5">{hoc.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowRiskHelpModal(false)}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Got It, Close Guide
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: DELETE HAZARD REPORT CONFIRMATION DIALOG */}
      <AnimatePresence>
        {reportToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl text-left space-y-4"
            >
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Delete Hazard Report?</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Permanent Cloud Deletion</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <p className="leading-relaxed">
                  Ticket <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/25">{reportToDelete.ticketId || reportToDelete.id}</span> will be permanently removed from the system.
                </p>
                <p className="text-slate-400 font-medium">
                  This action cannot be undone.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="leading-snug">{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setReportToDelete(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-rose-900/30"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: EDIT HAZARD REPORT DIALOG */}
      <AnimatePresence>
        {reportToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-left space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Edit Hazard Report</h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Ticket ID: <span className="text-emerald-400 font-bold">{reportToEdit.ticketId || reportToEdit.id}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReportToEdit(null);
                    setEditReportError(null);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditReport} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Reporter Name */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Reporter Name
                    </label>
                    <input
                      type="text"
                      value={editReporterName}
                      onChange={e => setEditReporterName(e.target.value)}
                      placeholder="e.g. Ahmad Fauzi"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  {/* Employee ID */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={editEmployeeId}
                      onChange={e => setEditEmployeeId(e.target.value)}
                      placeholder="e.g. EMP-1024"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={editDepartment}
                      onChange={e => setEditDepartment(e.target.value)}
                      placeholder="e.g. Production, Maintenance"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  {/* Area */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Area / Location
                    </label>
                    <input
                      type="text"
                      value={editArea}
                      onChange={e => setEditArea(e.target.value)}
                      placeholder="e.g. Stamping Line 2"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  {/* Hazard Category */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Hazard Category
                    </label>
                    <select
                      value={editHazardCategory}
                      onChange={e => setEditHazardCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                    >
                      <option value="A">Category A - Safety / APD / Physical / Electrical / Fire / Machine</option>
                      <option value="B">Category B - Environment / Health / Noise (Kebisingan) / Chemical / 5S</option>
                      <option value="C">Category C - Facilities / Infrastructure / Maintenance</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={editPriority}
                      onChange={e => setEditPriority(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                    >
                      <option value="Low">Low Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="High">High Priority</option>
                      <option value="Critical">Critical Priority</option>
                    </select>
                  </div>
                </div>

                {/* Hazard Description */}
                <div className="text-xs">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Hazard Description <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={editHazardDescription}
                    onChange={e => setEditHazardDescription(e.target.value)}
                    placeholder="Describe the hazard conditions and details..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                    required
                  />
                </div>

                {/* Status & Officer Comments */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Workflow Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as HazardStatus)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                    >
                      {Object.values(HazardStatus).map(st => (
                        <option key={st} value={st}>
                          {mapStatusToLabel(st)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Officer Comments / Notes
                    </label>
                    <input
                      type="text"
                      value={editOfficerComments}
                      onChange={e => setEditOfficerComments(e.target.value)}
                      placeholder="Optional notes or instructions..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>

                {editReportError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="leading-snug">{editReportError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={isEditingReport}
                    onClick={() => {
                      setReportToEdit(null);
                      setEditReportError(null);
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditingReport}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-900/30"
                  >
                    {isEditingReport ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
