import React, { useState, useEffect } from 'react';
import { Shield, Bell, LogOut, Menu, X, User as UserIcon, Clock, Globe } from 'lucide-react';
import { User, Notification } from '../types';
import { getSupabase } from '../supabase';
import { formatWIBClock, formatWIBTime } from '../lib/dateUtils';
import { useLanguage } from '../lib/i18n';
import SparkMindaLogo from './SparkMindaLogo';

interface HSEHeaderProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  notifications: Notification[];
  onDismissNotification: (id: string) => void;
  onMarkAllRead: () => void;
  onOfficerLogin?: () => void;
}

export default function HSEHeader({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  notifications,
  onDismissNotification,
  onMarkAllRead,
  onOfficerLogin
}: HSEHeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [time, setTime] = useState(new Date());

  // Dynamic Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setShowMobileMenu(false);
  };

  const navItems = [
    { id: 'home', label: t('nav.home') },
    { id: 'report', label: t('nav.report') },
    { id: 'officer', label: t('nav.officer') },
    { id: 'workflow', label: t('nav.workflow') }
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-3 sm:px-6 w-full max-w-full min-w-0">
      <div className="max-w-7xl w-full max-w-full mx-auto flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        
        {/* Brand (Logo + Company Name) */}
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0 min-w-0" onClick={() => handleTabClick('home')}>
          {/* Company logo image - hidden on mobile (< 640px), displayed on tablet & desktop */}
          <div className="hidden sm:block shrink-0">
            <SparkMindaLogo size="sm" />
          </div>

          {/* Desktop view (>= 1024px) */}
          <div className="min-w-0 hidden lg:flex flex-col justify-center pr-1">
            <h1 className="text-xs font-bold tracking-tight uppercase text-slate-100 truncate max-w-[130px] xl:max-w-[200px] 2xl:max-w-none leading-tight">
              {t('company.name')}
            </h1>
            <p className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase truncate max-w-[130px] xl:max-w-[200px] 2xl:max-w-none leading-tight">
              {t('portal.title')}
            </p>
          </div>

          {/* Tablet view (640px - 1023px) */}
          <div className="min-w-0 hidden sm:flex lg:hidden flex-col justify-center">
            <h1 className="text-xs font-bold tracking-tight uppercase text-slate-100 truncate max-w-[180px] leading-tight">
              {t('company.name')}
            </h1>
            <p className="text-[9px] text-emerald-400 font-mono tracking-wider uppercase truncate max-w-[180px] leading-tight">
              {t('portal.title')}
            </p>
          </div>

          {/* Mobile view (< 640px) - No image logo, full 2-line compact branding */}
          <div className="min-w-0 flex sm:hidden flex-col justify-center">
            <h1 className="text-[10px] min-[380px]:text-[11px] font-extrabold tracking-tight uppercase text-slate-100 leading-tight">
              PT MINDA AUTOMOTIVE INDONESIA
            </h1>
            <p className="text-[8.5px] min-[380px]:text-[9.5px] text-emerald-400 font-mono tracking-wide uppercase leading-tight mt-0.5">
              Portal K3 &amp; Sistem SLA
            </p>
          </div>
        </div>

        {/* Live Clock & Navigation Items (Desktop >= 1024px) */}
        <div className="hidden lg:flex items-center gap-1.5 xl:gap-3 shrink-0 min-w-0">
          {/* Live clock displayed on ultra-wide / large monitors (>= 1536px) to avoid crowding standard laptops */}
          <div className="hidden 2xl:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 border border-slate-800 px-2.5 py-1 rounded bg-slate-900/50 shrink-0 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{formatWIBClock(time)}</span>
          </div>

          <nav className="flex items-center gap-0.5 xl:gap-1 shrink-0">
            {navItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-2 xl:px-2.5 py-1.5 rounded-md text-[11px] xl:text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-slate-800 text-slate-100 shadow border border-slate-700'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Action Controls & Profiling */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Language Switcher Button (ID / EN) */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 sm:p-1 shrink-0 shadow-md">
            <button
              type="button"
              onClick={() => setLanguage('id')}
              className={`px-1.5 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                language === 'id'
                  ? 'bg-emerald-500 text-slate-950 shadow border border-emerald-400 font-extrabold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
              title="Bahasa Indonesia"
            >
              <span className="text-xs sm:text-base leading-none drop-shadow-sm select-none">🇮🇩</span>
              <span className="font-mono text-[10px] sm:text-[11px] tracking-wide">ID</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-1.5 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                language === 'en'
                  ? 'bg-emerald-500 text-slate-950 shadow border border-emerald-400 font-extrabold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
              title="English"
            >
              <span className="text-xs sm:text-base leading-none drop-shadow-sm select-none">🇬🇧</span>
              <span className="font-mono text-[10px] sm:text-[11px] tracking-wide">EN</span>
            </button>
          </div>

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-1 sm:p-2 rounded-md border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 transition h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center cursor-pointer"
              title={t('header.notifications')}
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2.5 w-72 sm:w-80 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-2 z-50 max-w-[calc(100vw-2rem)]">
                <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-200">{t('header.recentNotifs')}</span>
                  {unreadCount > 0 && (
                    <button onClick={onMarkAllRead} className="text-[10px] text-emerald-400 hover:underline">
                      {t('header.markAllRead')}
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">{t('header.noNotifs')}</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-3 text-xs border-b border-slate-800/50 hover:bg-slate-800/30 transition ${!n.read ? 'bg-emerald-500/5' : ''}`}>
                        <div className="flex justify-between items-start gap-2">
                          <span className={`font-semibold ${!n.read ? 'text-emerald-400' : 'text-slate-300'}`}>{n.title}</span>
                          <button onClick={() => onDismissNotification(n.id)} className="text-[10px] text-slate-500 hover:text-slate-300">
                            {t('header.dismiss')}
                          </button>
                        </div>
                        <p className="text-slate-400 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                        <span className="text-[9px] text-slate-500 font-mono mt-1.5 block">
                          {formatWIBTime(n.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Session Indicators (Desktop >= 1024px) */}
          {currentUser ? (
            <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 pl-2 border-l border-slate-800 min-w-0">
              <div className="text-right min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate max-w-[95px] xl:max-w-[140px] 2xl:max-w-[180px]">{currentUser.name}</p>
                <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider truncate max-w-[95px] xl:max-w-[140px] 2xl:max-w-[180px]">
                  {currentUser.position || (currentUser.role === 'ppe_officer' || currentUser.role === 'hrga_admin' ? 'HRGA Admin' : currentUser.role.replace('_', ' '))}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-md border border-slate-800 text-rose-400 hover:bg-rose-500/10 transition cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center shrink-0"
                title={t('header.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOfficerLogin || (() => handleTabClick('officer'))}
              className="hidden lg:flex items-center gap-1.5 bg-slate-800 text-slate-200 border border-slate-700 px-2 xl:px-3 py-1.5 rounded-md text-[11px] xl:text-xs font-medium hover:bg-slate-700 transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('header.officerLogin')}</span>
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-1 sm:p-2 rounded-md border border-slate-800 text-slate-300 hover:bg-slate-900 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
          >
            {showMobileMenu ? <X className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Slide Drawer */}
      {showMobileMenu && (
        <div className="lg:hidden mt-2.5 pt-3 border-t border-slate-800 flex flex-col gap-2 pb-2 bg-slate-950/95 rounded-b-xl px-2">
          
          <div className="px-3 py-2 bg-slate-900/60 border border-slate-800/80 rounded-lg mb-1 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-100 uppercase tracking-tight">{t('company.name')}</p>
              <p className="text-[9.5px] font-mono text-emerald-400 uppercase tracking-wider">{t('portal.title')}</p>
            </div>
          </div>

          {currentUser ? (
            <div className="px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg mb-1 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-200">{currentUser.name}</p>
                <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider">{currentUser.position || (currentUser.role === 'ppe_officer' || currentUser.role === 'hrga_admin' ? 'HRGA Admin' : currentUser.role.replace('_', ' '))}</p>
              </div>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  onLogout();
                }}
                className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2.5 py-1.5 rounded text-xs font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('header.logout')}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowMobileMenu(false);
                if (onOfficerLogin) {
                  onOfficerLogin();
                } else {
                  handleTabClick('officer');
                }
              }}
              className="w-full text-left px-4 py-3 rounded-lg text-xs font-semibold text-emerald-400 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition min-h-[44px] flex items-center gap-2 mb-1 cursor-pointer"
            >
              <UserIcon className="w-4 h-4 text-emerald-400" />
              <span>{t('header.officerLogin')}</span>
            </button>
          )}

          {navItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-xs font-medium transition min-h-[44px] flex items-center justify-between cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'text-slate-300 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.id && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
            </button>
          ))}

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border border-slate-800 px-3 py-2 rounded-lg bg-slate-900/50 mt-1">
            <span className="text-slate-400 font-sans font-medium text-xs">Pilih Bahasa:</span>
            <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setLanguage('id')}
                className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  language === 'id'
                    ? 'bg-emerald-500 text-slate-950 font-extrabold'
                    : 'text-slate-400'
                }`}
              >
                <span>🇮🇩</span>
                <span>ID</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  language === 'en'
                    ? 'bg-emerald-500 text-slate-950 font-extrabold'
                    : 'text-slate-400'
                }`}
              >
                <span>🇬🇧</span>
                <span>EN</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border border-slate-800 px-3 py-2 rounded-lg bg-slate-900/50 mt-0.5">
            <span className="text-slate-500 text-[10px]">WIB Clock:</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-200 font-bold">{formatWIBClock(time)}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
