import React, { useState, useEffect } from 'react';
import { Shield, Search, ArrowLeft, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../lib/i18n';

interface SubmissionProcessingScreenProps {
  onTrackReport?: () => void;
  onGoHome?: () => void;
}

export default function SubmissionProcessingScreen({
  onTrackReport,
  onGoHome
}: SubmissionProcessingScreenProps) {
  const { t } = useLanguage();
  // Step completion states for sequential checklist animation
  const [completedSteps, setCompletedSteps] = useState<number>(0);

  const checklistItems = [
    t('proc.checklistTitle') === 'System Processing Checklist' ? 'Report Received' : 'Laporan Diterima',
    t('proc.checklistTitle') === 'System Processing Checklist' ? 'Data Validation' : 'Validasi Data',
    t('proc.checklistTitle') === 'System Processing Checklist' ? 'Safety Ticket Generation' : 'Pembuatan Tiket K3',
    t('proc.checklistTitle') === 'System Processing Checklist' ? 'PIC Assignment' : 'Penetapan Officer PIC',
    t('proc.checklistTitle') === 'System Processing Checklist' ? 'Dashboard Synchronization' : 'Sinkronisasi Dashboard',
    t('proc.checklistTitle') === 'System Processing Checklist' ? 'Audit Trail Recording' : 'Pencatatan Audit Trail',
    t('proc.checklistTitle') === 'System Processing Checklist' ? 'Notification Preparation' : 'Penyiapan Notifikasi'
  ];

  useEffect(() => {
    // Animate checklist completion sequentially without fake spinner
    const interval = setInterval(() => {
      setCompletedSteps(prev => {
        if (prev < checklistItems.length) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [checklistItems.length]);

  const progressPercent = Math.min(100, Math.round((completedSteps / checklistItems.length) * 100));

  return (
    <div className="w-full max-w-2xl max-w-full mx-auto space-y-6 font-sans text-left my-4 min-w-0">
      
      {/* Container Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Top Decorative Subtle Glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Company Badge Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase block">
              {t('company.name')}
            </span>
            <span className="text-xs font-semibold text-slate-300">
              {t('portal.title')}
            </span>
          </div>

          <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Processing Active</span>
          </span>
        </div>

        {/* Main Title & Body */}
        <div className="space-y-3">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
            {t('proc.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold">
            {t('proc.desc1')}
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('proc.desc2')}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-850">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('proc.progressTitle')}</span>
            </span>
            <span className="text-emerald-400 font-bold">{progressPercent}%</span>
          </div>

          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800/80">
            <motion.div 
              className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Processing Checklist */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3">
            {t('proc.checklistTitle')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {checklistItems.map((item, idx) => {
              const isDone = idx < completedSteps;
              return (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2.5 transition-all duration-300 ${
                    isDone 
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                      : 'bg-slate-950/60 border-slate-850 text-slate-500'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    isDone ? 'bg-emerald-500 text-slate-950' : 'border border-slate-700 text-slate-600'
                  }`}>
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <span className="truncate">{item}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Info Notice */}
        <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl space-y-1.5 text-xs text-slate-400 leading-relaxed font-sans">
          <p className="font-semibold text-slate-300">
            {t('proc.notice1')}
          </p>
          <p className="text-[11px] text-slate-400">
            {t('proc.notice2')}
          </p>
          <p className="text-[11px] text-slate-400">
            {t('proc.notice3')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('proc.btnHome')}</span>
            </button>
          )}

          {onTrackReport && (
            <button
              onClick={onTrackReport}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition shadow shadow-emerald-500/20 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{t('proc.btnTrack')}</span>
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
