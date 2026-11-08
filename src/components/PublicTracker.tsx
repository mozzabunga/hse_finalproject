import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, Search, FileText, Calendar, User, 
  MapPin, MessageSquare, ArrowRight, CheckCircle2, Clock, 
  CornerDownRight, Check, AlertCircle, HelpCircle, ArrowLeft, Info, ShieldAlert,
  Send, Loader2
} from 'lucide-react';
import { HazardReport, HazardStatus, User as AppUser } from '../types';
import { getHazardComments, addHazardComment, mapStatusToLabel } from '../supabase';
import { formatWIBDate, formatWIBDateTime } from '../lib/dateUtils';
import { evaluateRiskIK01, SEVERITY_DEFINITIONS, LIKELIHOOD_DEFINITIONS } from '../lib/riskMatrixIK01';
import { 
  getHazardSummary, 
  parseHazardIncidentDetails, 
  sanitizeDisplayValue, 
  getReporterDetails,
  getHazardCategoryBadge,
  getHazardCategoryDisplay,
  hasValue 
} from '../lib/hazardPresentation';
import { motion, AnimatePresence } from 'motion/react';
import SubmissionProcessingScreen from './SubmissionProcessingScreen';
import { useLanguage } from '../lib/i18n';
import SparkMindaLogo from './SparkMindaLogo';

const highlightText = (text: string, search: string) => {
  if (!search) return <span>{text}</span>;
  const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-emerald-500 text-slate-950 font-semibold rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

interface PublicTrackerProps {
  reports: HazardReport[];
  currentUser?: AppUser | null;
  onOfficerLogin?: () => void;
  onNavigateToReport?: () => void;
  initialSelectedReport?: HazardReport | null;
  onClearInitialReport?: () => void;
}

export default function PublicTracker({ 
  reports, 
  currentUser,
  onOfficerLogin, 
  onNavigateToReport,
  initialSelectedReport,
  onClearInitialReport
}: PublicTrackerProps) {
  const { t, language } = useLanguage();
  // Option Selection: 'none' | 'track' | 'make' | 'processing'
  const [selectedOption, setSelectedOption] = useState<'none' | 'track' | 'make' | 'processing'>('none');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<HazardReport | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Directly navigate to native hazard reporting form
  useEffect(() => {
    if (selectedOption === 'make' && onNavigateToReport) {
      onNavigateToReport();
      setSelectedOption('none');
    }
  }, [selectedOption, onNavigateToReport]);

  // Handle incoming initialSelectedReport (e.g. from success screen "Lacak Status Tiket Ini")
  useEffect(() => {
    if (initialSelectedReport) {
      setSelectedOption('track');
      const ticketCode = initialSelectedReport.ticketId || initialSelectedReport.id;
      setSearchQuery(ticketCode);
      setActiveSearch(ticketCode);
      setSelectedReport(initialSelectedReport);
    }
  }, [initialSelectedReport]);

  const loadComments = async (reportId: string) => {
    setLoadingComments(true);
    try {
      const list = await getHazardComments(reportId);
      const publicComments = list.filter(c => !c.comment_text?.startsWith('[INTERNAL]'));
      setComments(publicComments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  // Load comments when a report is selected
  useEffect(() => {
    if (selectedReport) {
      loadComments(selectedReport.id);
    } else {
      setComments([]);
    }
  }, [selectedReport]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedReport) return;

    setIsSubmittingComment(true);
    try {
      const authorUser = currentUser || {
        id: (selectedReport.employeeId || 'EMPLOYEE').replace(/[^a-zA-Z0-9]/g, '_'),
        email: selectedReport.reporterEmail || 'employee@mindaauto.co.id',
        name: selectedReport.reporterName || 'Pelapor Hazard',
        role: 'employee' as const
      };
      await addHazardComment(selectedReport.id, newComment.trim(), authorUser);
      setNewComment('');
      await loadComments(selectedReport.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Filter reports based on search query
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery.trim());
    setSelectedReport(null);
  };

  const getFilteredReports = () => {
    if (!activeSearch || !activeSearch.trim()) return [];
    const term = activeSearch.trim().toLowerCase();
    return reports.filter(r => {
      const ticketIdMatch = Boolean(
        (r.ticketId && r.ticketId.toLowerCase().includes(term)) ||
        (r.id && r.id.toLowerCase().includes(term))
      );
      const reporterMatch = Boolean(r.reporterName && r.reporterName.toLowerCase().includes(term));
      const employeeIdMatch = Boolean(r.employeeId && r.employeeId.toLowerCase().includes(term));
      const emailMatch = Boolean(r.reporterEmail && r.reporterEmail.toLowerCase().includes(term));
      return ticketIdMatch || reporterMatch || employeeIdMatch || emailMatch;
    });
  };

  const filteredReports = getFilteredReports();

  const getStatusColor = (status: HazardStatus) => {
    switch (status) {
      case HazardStatus.NewReport:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case HazardStatus.PendingValidation:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case HazardStatus.UnderInvestigation:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case HazardStatus.ActionRequired:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case HazardStatus.WaitingProcurement:
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case HazardStatus.Implementation:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case HazardStatus.Completed:
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case HazardStatus.Resolved:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  // Timeline Stepper Setup
  const timelineStages = [
    { status: HazardStatus.NewReport, label: t('stage.NewReport'), desc: 'Registered from MS Forms' },
    { status: HazardStatus.PendingValidation, label: t('stage.PendingValidation'), desc: 'Assigned HSE Officer for site check' },
    { status: HazardStatus.UnderInvestigation, label: t('stage.UnderInvestigation'), desc: 'Assessing corrective action SLA' },
    { status: HazardStatus.ActionRequired, label: t('stage.ActionRequired'), desc: 'Maintenance/Procurement active' },
    { status: HazardStatus.WaitingProcurement, label: t('stage.WaitingProcurement'), desc: 'Purchasing PO/Vendor/Materials' },
    { status: HazardStatus.Implementation, label: t('stage.Implementation'), desc: 'Repair/Installation in progress' },
    { status: HazardStatus.Completed, label: t('stage.Completed'), desc: 'Remediation work completed' },
    { status: HazardStatus.Resolved, label: t('stage.Resolved'), desc: 'HSE Coordinator audited & closed' }
  ];

  const getCurrentStageIndex = (currentStatus: HazardStatus) => {
    return timelineStages.findIndex(s => s.status === currentStatus);
  };

  return (
    <div className="w-full max-w-5xl max-w-full mx-auto space-y-8 font-sans relative min-w-0">
      
      {/* Top action header for employees (Officer Login button) */}
      {selectedOption === 'none' && onOfficerLogin && (
        <div className="flex justify-end z-10 w-full mb-2">
          <button
            onClick={onOfficerLogin}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-500/50 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition shadow-md cursor-pointer min-h-[40px]"
            id="btn-officer-login-home"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('header.officerLogin')}</span>
          </button>
        </div>
      )}
      
      {/* Title block with Minda branding */}
      <div className="text-center space-y-3 pb-2 sm:pb-4 px-2">
        <div className="flex justify-center mb-1">
          <SparkMindaLogo size="lg" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full uppercase max-w-full">
          <Shield className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span className="truncate">{t('company.name')}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight">
          {t('landing.title')}
        </h1>
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          {t('landing.subtitle')}
        </p>
      </div>

      {/* Main Two Options Landing Screen */}
      {selectedOption === 'none' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl max-w-full mx-auto w-full px-1">
          {/* Option 2: Make New Report */}
          <button
            onClick={() => {
              if (onNavigateToReport) {
                onNavigateToReport();
              } else {
                setSelectedOption('make');
              }
            }}
            className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 p-5 sm:p-8 rounded-2xl text-left shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px] sm:min-h-[180px] w-full cursor-pointer"
            id="btn-make-report"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.05),transparent_40%)]" />
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 sm:p-3.5 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300 w-fit shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="mt-4 sm:mt-6">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-emerald-400 transition-colors flex items-center justify-between sm:justify-start gap-1.5">
                <span>{t('landing.makeReport')}</span>
                <ArrowRight className="w-4 h-4 opacity-70 sm:opacity-0 group-hover:opacity-100 transition translate-x-1 text-emerald-400" />
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 sm:mt-2 leading-relaxed">
                {t('landing.makeReportDesc')}
              </p>
            </div>
          </button>

          {/* Option 1: Track Your Report */}
          <button
            onClick={() => setSelectedOption('track')}
            className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 p-5 sm:p-8 rounded-2xl text-left shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px] sm:min-h-[180px] w-full cursor-pointer"
            id="btn-track-report"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.05),transparent_40%)]" />
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 sm:p-3.5 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300 w-fit shrink-0">
              <Search className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="mt-4 sm:mt-6">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-emerald-400 transition-colors flex items-center justify-between sm:justify-start gap-1.5">
                <span>{t('landing.trackReport')}</span>
                <ArrowRight className="w-4 h-4 opacity-70 sm:opacity-0 group-hover:opacity-100 transition translate-x-1 text-emerald-400" />
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 sm:mt-2 leading-relaxed">
                {t('landing.trackReportDesc')}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Option: Submission Processing Screen */}
      {selectedOption === 'processing' && (
        <SubmissionProcessingScreen
          onTrackReport={() => setSelectedOption('track')}
          onGoHome={() => setSelectedOption('none')}
        />
      )}

      {/* Native Portal Modal for Option 2: Make New Report */}
      {selectedOption === 'make' && (
        <div className="max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-full text-emerald-400 w-fit mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-100">{t('redirect.title')}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('redirect.desc')}
            </p>
          </div>
          
          {/* Information Notice Box */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 text-left space-y-2 text-xs leading-relaxed text-slate-300">
            <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-emerald-500/20 pb-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{t('redirect.infoTitle')}</span>
            </div>
            <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px] pl-1">
              <li>{t('redirect.infoStep1')}</li>
              <li>{t('redirect.infoStep2')}</li>
              <li>{t('redirect.infoStep3')}</li>
              <li>{t('redirect.infoStep4')}</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setSelectedOption('none')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-lg transition cursor-pointer"
            >
              {t('redirect.goBack')}
            </button>
            <button
              onClick={() => {
                if (onNavigateToReport) {
                  onNavigateToReport();
                }
              }}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition shadow shadow-emerald-500/20 cursor-pointer"
            >
              <span>{t('redirect.openForm')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Option 1 Tracker Layout */}
      {selectedOption === 'track' && (
        <div className="space-y-6">
          <button
            onClick={() => {
              setSelectedOption('none');
              setActiveSearch('');
              setSearchQuery('');
              setSelectedReport(null);
              if (onClearInitialReport) {
                onClearInitialReport();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{language === 'id' ? 'Kembali ke menu utama' : 'Back to main menu'}</span>
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-8 shadow-2xl text-left space-y-5 sm:space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t('track.searchTitle')}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {t('track.searchDesc')}
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                required
                placeholder={t('track.placeholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-sans min-h-[44px]"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow shadow-emerald-500/10 cursor-pointer shrink-0 min-h-[44px]"
              >
                <span>{t('track.searchBtn')}</span>
              </button>
            </form>

            {/* Search Instructions Panel */}
            {!activeSearch && (
              <div className="bg-slate-950 p-4 border border-slate-850/60 rounded-xl space-y-3">
                <h4 className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">
                  {t('track.guidelinesTitle')}
                </h4>
                <ul className="space-y-2 text-xs text-slate-400 leading-relaxed list-none">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-mono mt-0.5">•</span>
                    <span>{t('track.guidelineTicket')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-mono mt-0.5">•</span>
                    <span>{t('track.guidelineKeyword')}</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Matching Reports results list */}
            {activeSearch && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    {t('track.results')} ({filteredReports.length})
                  </h3>
                  <span className="text-[10px] text-slate-500">Query: "{activeSearch}"</span>
                </div>

                {filteredReports.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-850/60">
                    <AlertCircle className="w-8 h-8 text-rose-500/60 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-300">{t('track.noResults')}</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      {t('track.noResultsDesc')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {filteredReports.map(report => {
                      const summary = getHazardSummary(report);
                      const rep = getReporterDetails(report);

                      return (
                        <div
                          key={report.id}
                          onClick={() => setSelectedReport(report)}
                          className={`p-4 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            selectedReport?.id === report.id
                              ? 'bg-slate-800/80 border-emerald-500/40 ring-1 ring-emerald-500/20'
                              : 'bg-slate-950/40 border-slate-850 hover:border-slate-700 hover:bg-slate-900/10'
                          }`}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-emerald-400">{highlightText(report.ticketId, activeSearch)}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-bold uppercase">
                                {getHazardCategoryBadge(report)}{rep.department ? ` • ${rep.department}` : ''}
                              </span>
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">{highlightText(summary, activeSearch)}</h4>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono pt-0.5">
                              <span>Dept: <strong className="text-slate-400">{rep.department}</strong></span>
                              <span>&middot;</span>
                              <span>{language === 'id' ? 'Pelapor' : 'Reporter'}: <strong className="text-slate-400">{highlightText(rep.name, activeSearch)}</strong></span>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            <span className={`text-[10px] font-semibold font-mono border px-2.5 py-1 rounded-full ${getStatusColor(report.status)}`}>
                              {t(`status.${report.status}`) || mapStatusToLabel(report.status)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expanded Selected Report Progress tracking */}
          <AnimatePresence>
            {selectedReport && (() => {
              const summary = getHazardSummary(selectedReport);
              const parsed = parseHazardIncidentDetails(selectedReport);
              const rep = getReporterDetails(selectedReport);

              return (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-left space-y-6 w-full max-w-full min-w-0"
                  id="report-timeline-tracker"
                >
                  {/* Header info */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded">
                          {selectedReport.ticketId}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-bold uppercase tracking-wider">
                          {getHazardCategoryBadge(selectedReport)}{rep.department ? ` • ${rep.department}` : ''}
                        </span>
                        {selectedReport.area && (
                          <span className="text-xs text-slate-400 font-mono">
                            &middot; {selectedReport.area}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-100 mt-1 leading-snug">
                        {summary}
                      </h3>
                    </div>

                    <span className={`text-[10px] font-semibold font-mono border px-3 py-1 rounded-full ${getStatusColor(selectedReport.status)}`}>
                      {t(`status.${selectedReport.status}`) || mapStatusToLabel(selectedReport.status)}
                    </span>
                  </div>

                  {/* Submitted Details Structured Grid */}
                  <div className="bg-slate-950 p-5 border border-slate-850/80 rounded-xl text-xs space-y-4">
                    {hasValue(parsed.hazardDescription) && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold block">
                          {language === 'id' ? 'Detail Temuan / Deskripsi Bahaya' : 'Finding Details / Description'}
                        </span>
                        <p className="text-slate-200 leading-relaxed font-sans whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                          {parsed.hazardDescription}
                        </p>
                      </div>
                    )}

                    {/* Structured metadata - Renders ONLY fields with values */}
                    {(hasValue(parsed.currentCondition) ||
                      hasValue(parsed.injuryStatus) ||
                      hasValue(parsed.potentialImpact) ||
                      hasValue(parsed.immediateAction) ||
                      hasValue(parsed.improvementSuggestion) ||
                      hasValue(parsed.area) ||
                      hasValue(parsed.locationDetail) ||
                      hasValue(selectedReport.createdAt) ||
                      hasValue(selectedReport.picName)) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-[11px] font-mono">
                        {hasValue(parsed.currentCondition) && (
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                            <span className="text-[9px] text-slate-500 uppercase block">{language === 'id' ? 'Kondisi Lapor' : 'Reported Condition'}</span>
                            <span className="text-slate-200 font-semibold block">{parsed.currentCondition}</span>
                          </div>
                        )}
                        {hasValue(parsed.injuryStatus) && (
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                            <span className="text-[9px] text-slate-500 uppercase block">{language === 'id' ? 'Status Korban' : 'Injury Status'}</span>
                            <span className="text-slate-200 font-semibold block">{parsed.injuryStatus}</span>
                          </div>
                        )}
                        {hasValue(parsed.potentialImpact) && (
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                            <span className="text-[9px] text-slate-500 uppercase block">{language === 'id' ? 'Potensi Dampak' : 'Potential Impact'}</span>
                            <span className="text-amber-300 font-semibold block">{parsed.potentialImpact}</span>
                          </div>
                        )}
                        {hasValue(parsed.immediateAction) && (
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                            <span className="text-[9px] text-slate-500 uppercase block">{language === 'id' ? 'Tindakan Sementara' : 'Immediate Action'}</span>
                            <span className="text-slate-200 font-semibold block">{parsed.immediateAction}</span>
                          </div>
                        )}
                        {hasValue(parsed.improvementSuggestion) && (
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                            <span className="text-[9px] text-slate-500 uppercase block">{language === 'id' ? 'Saran Perbaikan' : 'Suggestion'}</span>
                            <span className="text-slate-200 font-semibold block">{parsed.improvementSuggestion}</span>
                          </div>
                        )}
                        {hasValue(parsed.area) && (
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                            <span className="text-[9px] text-slate-500 uppercase block">{language === 'id' ? 'Area' : 'Area'}</span>
                            <span className="text-slate-200 font-semibold block">{parsed.area}</span>
                          </div>
                        )}
                        {hasValue(parsed.locationDetail) && (
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5 sm:col-span-2">
                            <span className="text-[9px] text-slate-500 uppercase block">{language === 'id' ? 'Detail Lokasi' : 'Location Detail'}</span>
                            <span className="text-slate-200 font-semibold block">{parsed.locationDetail}</span>
                          </div>
                        )}
                        {hasValue(selectedReport.createdAt) && (
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                            <span className="text-[9px] text-slate-500 uppercase block">{language === 'id' ? 'Tanggal Lapor' : 'Date Submitted'}</span>
                            <span className="text-slate-200 font-semibold block">{formatWIBDate(selectedReport.createdAt)}</span>
                          </div>
                        )}
                        {hasValue(selectedReport.picName) && (
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                            <span className="text-[9px] text-slate-500 uppercase block">{language === 'id' ? 'Petugas PIC' : 'Assigned Officer'}</span>
                            <span className="text-slate-200 font-semibold block">{selectedReport.picName}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                {/* Risk Evaluation Card per IK Pedoman PEP-HSE-P-01-IK-01 */}
                {(() => {
                  const evalRes = evaluateRiskIK01(selectedReport.severity, selectedReport.likelihood);
                  return (
                    <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-emerald-400" />
                          <span className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">Evaluasi Risiko K3 (IK Pedoman PEP-HSE-P-01-IK-01)</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded font-bold border uppercase ${evalRes.badgeClass}`}>
                          {evalRes.label} Risk Level
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-500 uppercase block">Keparahan (Severity)</span>
                          <span className="font-bold text-slate-200 block mt-0.5">Sev {evalRes.severity}: {SEVERITY_DEFINITIONS[evalRes.severity]?.title}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{SEVERITY_DEFINITIONS[evalRes.severity]?.shortText}</span>
                        </div>

                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-500 uppercase block">Probabilitas (Likelihood)</span>
                          <span className="font-bold text-slate-200 block mt-0.5">Like {evalRes.likelihood}: {LIKELIHOOD_DEFINITIONS[evalRes.likelihood]?.title}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{LIKELIHOOD_DEFINITIONS[evalRes.likelihood]?.annualGuide}</span>
                        </div>

                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block">Hasil Titik Temu Matriks</span>
                            <span className="font-extrabold text-emerald-400 text-sm block mt-0.5">{evalRes.score} ({evalRes.level})</span>
                          </div>
                          {evalRes.isOtpRequired && (
                            <span className="mt-1 text-[9px] text-rose-400 font-bold uppercase tracking-wider block">Wajib Objective Target Program (OTP)</span>
                          )}
                        </div>
                      </div>

                      {selectedReport.additionalControl && (
                        <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-slate-300 space-y-0.5">
                          <span className="text-[10px] text-emerald-400 font-bold uppercase block">Rencana Pengendalian Tambahan:</span>
                          <p className="font-sans leading-relaxed">{selectedReport.additionalControl}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* VISUAL TIMELINE STEPPER (Option 1: Timeline) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-400">
                    {t('track.timelineTitle')}
                  </h4>

                  <div className="relative pt-2 pl-4 sm:pl-0">
                    {/* Stepper bar background */}
                    <div className="absolute left-[23px] sm:left-1/2 top-4 bottom-4 w-0.5 bg-slate-800 -translate-x-1/2" />
                    
                    {/* Stepper active bar foreground */}
                    <div 
                      className="absolute left-[23px] sm:left-1/2 top-4 w-0.5 bg-emerald-500 -translate-x-1/2 transition-all duration-500" 
                      style={{
                        height: `${Math.max(0, (getCurrentStageIndex(selectedReport.status) / (timelineStages.length - 1)) * 90)}%`
                      }}
                    />

                    <div className="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-1 gap-6 relative">
                      {timelineStages.map((stage, idx) => {
                        const currentStageIdx = getCurrentStageIndex(selectedReport.status);
                        const isCompleted = idx <= currentStageIdx;
                        const isActive = idx === currentStageIdx;

                        return (
                          <div 
                            key={stage.status} 
                            className={`flex flex-row sm:items-center gap-4 sm:gap-6 relative z-10 ${
                              isActive ? 'opacity-100' : isCompleted ? 'opacity-80' : 'opacity-40'
                            }`}
                          >
                            {/* Marker circle */}
                            <div className="sm:w-1/2 sm:text-right hidden sm:block">
                              <span className="text-[10px] font-mono text-slate-500 uppercase">{stage.desc}</span>
                            </div>

                            <div className="flex justify-center items-center shrink-0">
                              <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                isActive 
                                  ? 'bg-emerald-500/10 border-emerald-500 ring-4 ring-emerald-500/20' 
                                  : isCompleted 
                                    ? 'bg-emerald-500 border-emerald-500' 
                                    : 'bg-slate-950 border-slate-800'
                              }`}>
                                {isCompleted && !isActive ? (
                                  <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3px]" />
                                ) : isActive ? (
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                ) : null}
                              </div>
                            </div>

                            <div className="sm:w-1/2 text-left">
                              <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                <span>{stage.label}</span>
                                {isActive && (
                                  <span className="text-[8px] font-mono font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                    {t('track.currentStage')}
                                  </span>
                                )}
                              </h5>
                              <p className="text-[10px] text-slate-500 sm:hidden mt-0.5">{stage.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* OFFICER COMMENTS (If available, and not marked internal) */}
                <div className="space-y-4 border-t border-slate-800/60 pt-6">
                  <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>{t('track.updatesTitle')} ({comments.length})</span>
                  </h4>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {loadingComments ? (
                      <div className="flex items-center gap-2 justify-center py-6 text-xs text-slate-500 font-mono">
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>{language === 'id' ? 'Memuat komentar...' : 'Fetching comments...'}</span>
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4 text-center bg-slate-950/20 border border-slate-850/40 rounded-xl">
                        {t('track.noComments')}
                      </p>
                    ) : (
                      comments.map(c => (
                        <div key={c.id} className="bg-slate-950 p-3 border border-slate-850 rounded-xl space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                            <span className="font-bold text-slate-300">{c.user_name}</span>
                            <span>{formatWIBDateTime(c.created_at)}</span>
                          </div>
                          <p className="text-slate-300 text-xs font-sans leading-relaxed">
                            {c.comment_text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment & Discussion Response Form */}
                  <form onSubmit={handleAddComment} className="pt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder={language === 'id' ? 'Tulis tanggapan atau pertanyaan terkait tiket...' : 'Write an update or question regarding this ticket...'}
                        className="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !newComment.trim()}
                        className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                      >
                        {isSubmittingComment ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{language === 'id' ? 'Kirim' : 'Send'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                <div className="bg-slate-950/50 border border-slate-850/60 p-4 rounded-xl text-[10px] text-slate-500 leading-relaxed font-mono">
                  🔒 <b>{t('track.k3Advisory')}</b>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
        </div>
      )}
    </div>
  );
}
