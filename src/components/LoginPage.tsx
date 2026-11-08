import React, { useState, useEffect } from 'react';
import { Shield, Lock, ArrowRight, ArrowLeft, User as UserIcon } from 'lucide-react';
import { signInWithSupabase } from '../supabase';
import { User as AppUser } from '../types';
import { motion } from 'motion/react';
import { useLanguage } from '../lib/i18n';
import SparkMindaLogo from './SparkMindaLogo';

interface LoginPageProps {
  onLoginSuccess: (user: AppUser) => void;
  onBackToEmployeePortal: () => void;
}

export default function LoginPage({ onLoginSuccess, onBackToEmployeePortal }: LoginPageProps) {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Load remembered username on mount
  useEffect(() => {
    try {
      const savedUsername = localStorage.getItem('minda_hse_remembered_username');
      if (savedUsername) {
        setUsername(savedUsername);
        setRememberMe(true);
      }
    } catch (err) {
      console.error('Error reading from localStorage:', err);
    }
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoggingIn(true);

    try {
      const emailLower = username.trim().toLowerCase();
      
      // Perform Supabase Auth
      const userProfile = await signInWithSupabase(emailLower, password);
      
      // Handle Remember Me persistence
      if (rememberMe) {
        localStorage.setItem('minda_hse_remembered_username', username.trim());
      } else {
        localStorage.removeItem('minda_hse_remembered_username');
      }

      onLoginSuccess(userProfile);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Access Denied\n\nYour account is not registered as an authorized HSE Officer.\nPlease contact the HSE System Administrator.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="w-full max-w-md max-w-full mx-auto my-6 sm:my-12 px-3 sm:px-0 min-w-0" id="login-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-left space-y-6"
      >
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <SparkMindaLogo />
          </div>
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">{t('login.title')}</h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            {t('login.desc')}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4 font-sans">
          <div>
            <label htmlFor="username" className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
              {t('login.username')}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-500">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                id="username"
                type="text"
                required
                placeholder="username@mindaauto.co.id"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-200 transition min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
              {t('login.password')}
            </label>
            <input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg px-3 py-2.5 text-xs text-slate-200 transition min-h-[44px]"
            />
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 focus:ring-2"
            />
            <label htmlFor="remember-me" className="ml-2 text-xs text-slate-400 select-none cursor-pointer hover:text-slate-300">
              {t('login.remember')}
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/20 rounded text-rose-400 text-xs font-mono whitespace-pre-line leading-relaxed">
              {errorMsg}
            </div>
          )}

          {/* System Access Notice */}
          <div className="bg-slate-950 p-4 border border-slate-800/80 rounded-xl space-y-3">
            <div className="border-b border-slate-800/60 pb-2.5">
              <span className="text-xs font-bold text-slate-100 block tracking-tight">PT MINDA AUTOMOTIVE INDONESIA</span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase block">HSE Security Standard</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              {t('login.notice')}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            id="btn-sign-in"
          >
            <span>{isLoggingIn ? t('login.verifying') : t('login.submit')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Back to Employee Portal Button */}
        <div className="border-t border-slate-800/60 pt-4 text-center">
          <button
            onClick={onBackToEmployeePortal}
            className="text-slate-400 hover:text-slate-200 text-xs inline-flex items-center justify-center gap-1.5 transition"
            id="btn-back-to-portal"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('login.back')}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
