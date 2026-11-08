import React, { useState, useEffect } from 'react';
import HSEHeader from './components/HSEHeader';
import HSEFooter from './components/HSEFooter';
import EmployeeSection from './components/EmployeeSection';
import OfficerPanel from './components/OfficerPanel';
import WorkflowSection from './components/WorkflowSection';
import PublicTracker from './components/PublicTracker';
import LoginPage from './components/LoginPage';
import SubmissionProcessingScreen from './components/SubmissionProcessingScreen';
import { 
  subscribeToHazards, 
  subscribeToNotifications, 
  onSupabaseAuthStateChanged, 
  signOutSupabase,
  getSupabase 
} from './supabase';
import { HazardReport, HazardStatus, User as AppUser, Notification } from './types';
import { 
  Shield, AlertTriangle, FileText, CheckCircle, Clock, 
  ArrowRight, ShieldCheck, HeartPulse, HelpCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [pathname, setPathname] = useState<string>(window.location.pathname);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [trackTicketTarget, setTrackTicketTarget] = useState<HazardReport | null>(null);

  // Client-side routing helper
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setPathname(path);
  };

  // Synchronize URL paths to activeTab
  useEffect(() => {
    const path = pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (path === '/admin') {
      setActiveTab('officer');
    } else if (path === '/login') {
      setActiveTab('login');
    } else if (path === '/workflow') {
      setActiveTab('workflow');
    } else if (path === '/report') {
      setActiveTab('report');
    } else if (
      path === '/processing' || 
      path === '/submitted' || 
      search.includes('submitted') || 
      search.includes('processing') || 
      hash.includes('processing') || 
      hash.includes('submitted')
    ) {
      setActiveTab('processing');
    } else {
      setActiveTab('home');
    }
  }, [pathname]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. Establish Real-time State Subscriptions
  useEffect(() => {
    // Auth State
    const unsubAuth = onSupabaseAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    // Real-time Hazard reports
    const unsubReports = subscribeToHazards((hzs) => {
      setReports(hzs);
    });

    // Real-time Notifications
    const unsubNotifications = subscribeToNotifications((notifs) => {
      setNotifications(notifs);
    });

    return () => {
      unsubAuth();
      unsubReports();
      unsubNotifications();
    };
  }, []);

  // 2. Notification Actions
  const handleDismissNotification = (id: string) => {
    try {
      const list = JSON.parse(localStorage.getItem('minda_hse_notifications') || '[]');
      const updated = list.filter((n: any) => n.id !== id);
      localStorage.setItem('minda_hse_notifications', JSON.stringify(updated));
      setNotifications(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = () => {
    try {
      const list = JSON.parse(localStorage.getItem('minda_hse_notifications') || '[]');
      const updated = list.map((n: any) => ({ ...n, read: true }));
      localStorage.setItem('minda_hse_notifications', JSON.stringify(updated));
      setNotifications(updated);
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Auth Actions
  const handleLogout = async () => {
    await signOutSupabase();
    setCurrentUser(null);
    navigate('/');
  };

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    navigate('/Admin');
  };

  // 4. Calculations for Home Panel
  const isResolved = (s: HazardStatus) => s === HazardStatus.Resolved || s === HazardStatus.Completed;
  const totalReported = reports.length;
  const totalResolved = reports.filter(r => isResolved(r.status)).length;
  const totalActive = reports.filter(r => !isResolved(r.status)).length;
  const overdueCount = reports.filter(r => {
    if (isResolved(r.status)) return false;
    const elapsed = Date.now() - new Date(r.createdAt).getTime();
    return elapsed > 3 * 24 * 60 * 60 * 1000; // Unresolved for more than 3 days
  }).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 w-full max-w-full min-w-0">
      
      {/* Shared Header Component */}
      <HSEHeader
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'home') navigate('/');
          else if (tab === 'officer') navigate('/Admin');
          else if (tab === 'workflow') navigate('/workflow');
          else if (tab === 'report') navigate('/report');
          else navigate('/');
        }}
        onLogout={handleLogout}
        notifications={notifications}
        onDismissNotification={handleDismissNotification}
        onMarkAllRead={handleMarkAllRead}
        onOfficerLogin={() => navigate('/login')}
      />

      {/* Main Container Stage */}
      <main className="flex-grow max-w-7xl w-full max-w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 md:py-12 min-w-0">
        <AnimatePresence mode="wait">
          
          {/* TAB: SECURE LOGIN PAGE */}
          {activeTab === 'login' && (
            <motion.div
              key="login-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <LoginPage 
                onLoginSuccess={handleLoginSuccess}
                onBackToEmployeePortal={() => navigate('/')}
              />
            </motion.div>
          )}

          {/* TAB: LANDING HOME VIEW */}
          {activeTab === 'home' && (
            <motion.div
              key="public-home-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <PublicTracker 
                reports={reports} 
                currentUser={currentUser}
                onOfficerLogin={() => navigate('/login')} 
                onNavigateToReport={() => navigate('/report')}
                initialSelectedReport={trackTicketTarget}
                onClearInitialReport={() => setTrackTicketTarget(null)}
              />
            </motion.div>
          )}

          {/* TAB: EMPLOYEE REPORT FORMS */}
          {activeTab === 'report' && (
            <motion.div
              key="report-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <EmployeeSection 
                reports={reports} 
                currentUser={currentUser}
                onReportCreated={() => {
                  // Trigger notification count reload implicitly
                }}
                onTrackReport={(ticket) => {
                  setTrackTicketTarget(ticket);
                  navigate('/');
                }}
              />
            </motion.div>
          )}

          {/* TAB: SECURE OFFICER PANEL COMMANDS */}
          {activeTab === 'officer' && (
            currentUser ? (
              <motion.div
                key="officer-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <OfficerPanel
                  currentUser={currentUser}
                  onLoginSuccess={handleLoginSuccess}
                  reports={reports}
                />
              </motion.div>
            ) : (
              <motion.div
                key="officer-login-redirect"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <LoginPage 
                  onLoginSuccess={handleLoginSuccess}
                  onBackToEmployeePortal={() => navigate('/')}
                />
              </motion.div>
            )
          )}

          {/* TAB: SAFETY SOP MANUALS */}
          {activeTab === 'workflow' && (
            <motion.div
              key="workflow-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <WorkflowSection />
            </motion.div>
          )}

          {/* TAB: SUBMISSION PROCESSING SCREEN */}
          {activeTab === 'processing' && (
            <motion.div
              key="processing-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <SubmissionProcessingScreen 
                onTrackReport={() => navigate('/')}
                onGoHome={() => navigate('/')}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Shared Footer Component */}
      <HSEFooter />

    </div>
  );
}
