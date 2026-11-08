import React from 'react';
import { Shield, Sparkles } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

export default function HSEFooter() {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-500 py-6 px-4 mt-auto w-full max-w-full">
      <div className="max-w-7xl w-full max-w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-4 min-w-0">
        
        {/* Left column */}
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs tracking-wide">
            &copy; {new Date().getFullYear()} PT Minda Automotive Indonesia. {t('footer.rights')}
          </p>
        </div>

        {/* Right column */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 flex-wrap justify-center md:justify-end">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>{t('footer.slaText')}</span>
          <span>&middot;</span>
          <span className="text-emerald-400 font-semibold">{t('footer.k3Text')}</span>
        </div>

      </div>
    </footer>
  );
}
