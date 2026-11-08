import React from 'react';
import { 
  Shield, CheckCircle, ChevronRight, AlertOctagon, HelpCircle, 
  Settings, Clock, BellRing, Sparkles 
} from 'lucide-react';
import { HazardStatus } from '../types';
import { mapStatusToLabel } from '../supabase';
import { useLanguage } from '../lib/i18n';

export default function WorkflowSection() {
  const { t, language } = useLanguage();

  const steps = [
    {
      stage: '1',
      title: language === 'id' ? 'Identifikasi & Pelaporan' : 'Identification & Reporting',
      description: language === 'id' 
        ? 'Setiap karyawan atau warden mengidentifikasi potensi bahaya, Near Miss, peralatan rusak, atau pelanggaran K3. Laporan dicatat langsung melalui portal pelaporan.'
        : 'Any employee or warden identifies a near-miss, broken equipment, or safety violation. They instantly log the issue via the employee reporting terminal.',
      icon: AlertOctagon,
      color: 'border-blue-500/20 text-blue-400'
    },
    {
      stage: '2',
      title: language === 'id' ? 'Alokasi Penanggung Jawab' : 'Automated Routing',
      description: language === 'id'
        ? 'Sistem mengelompokkan laporan ke Kategori A (APD/K3), B (Lingkungan), atau C (Mekanikal/Fasilitas) dan meneruskan ke Petugas K3 terkait secara otomatis.'
        : 'Our rule-based engine categorizes the issue: Category A (PPE), Category B (Environmental), or Category C (Maintenance), and allocates the dedicated safety officer.',
      icon: Settings,
      color: 'border-purple-500/20 text-purple-400'
    },
    {
      stage: '3',
      title: language === 'id' ? 'Pemantauan SLA & Pengingat' : 'SLA Tracking & Reminders',
      description: language === 'id'
        ? 'Penghitungan waktu SLA dimulai. Laporan yang belum selesai setelah 3 hari memicu peringatan tindak lanjut kepada penanggung jawab.'
        : 'The SLA countdown begins. Tickets unresolved after 3 days dispatch compliance alerts to PICs. Severe unresolved breaches trigger escalations.',
      icon: Clock,
      color: 'border-amber-500/20 text-amber-400'
    },
    {
      stage: '4',
      title: language === 'id' ? 'Validasi K3 & Penutupan' : 'Validation & Closure',
      description: language === 'id'
        ? 'Petugas K3 melakukan perbaikan fisik di area kerja dan memperbarui status hingga inspeksi akhir selesai dan laporan resmi ditutup.'
        : 'Officers transition states strictly following safety compliance rules. Resolution requires validation before final ticket closure.',
      icon: CheckCircle,
      color: 'border-emerald-500/20 text-emerald-400'
    }
  ];

  return (
    <div className="space-y-8 text-left w-full max-w-full min-w-0">
      
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl relative overflow-hidden w-full max-w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-100">
            {language === 'id' ? 'Prosedur Operasional Standar (SOP) K3' : 'HSE Standard Operating Procedure (SOP)'}
          </h2>
        </div>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          {language === 'id'
            ? 'PT Minda Automotive Indonesia menerapkan komitmen Nihil Kecelakaan Kerja (Zero Accident) sesuai standar K3 manufaktur Indonesia. Portal ini mengelola seluruh alur tindak lanjut bahaya secara terintegrasi dan transparan.'
            : 'PT Minda Automotive Indonesia enforces a zero-accident workspace environment under K3 industrial protocols. This portal automates the entire hazard reporting lifespans with strict SLA and state verification.'
          }
        </p>
      </div>

      {/* Step workflow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-4 gap-4 sm:gap-5 w-full max-w-full min-w-0">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className={`bg-slate-900 border rounded-xl p-4 sm:p-5 shadow flex flex-col justify-between min-w-0 max-w-full w-full overflow-hidden ${step.color}`}>
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800/50 shrink-0 whitespace-nowrap">
                    {language === 'id' ? 'TAHAP' : 'STAGE'} 0{step.stage}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-200 break-words">{step.title}</h3>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed break-words">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* State Transitions DFA Chart explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-1 2xl:grid-cols-2 gap-6 w-full max-w-full min-w-0">
        
        {/* DFA Allowed Transitions map */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl min-w-0 max-w-full">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{language === 'id' ? 'Matriks Alur Status Laporan K3' : 'Deterministic Finite Automaton (DFA) Mappings'}</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            {language === 'id'
              ? 'Status laporan K3 berubah secara berurutan sesuai aturan verifikasi keselamatan kerja untuk memastikan seluruh riwayat tindak lanjut dapat diaudit.'
              : 'Safety tickets cannot undergo random state shifts. Our state verification core enforces high-integrity ticket paths to maintain valid audit trails.'
            }
          </p>

          <div className="space-y-2.5 text-xs font-mono">
            {[
              { current: HazardStatus.NewReport, next: t(`status.${HazardStatus.PendingValidation}`) || mapStatusToLabel(HazardStatus.PendingValidation) },
              { current: HazardStatus.PendingValidation, next: t(`status.${HazardStatus.UnderInvestigation}`) || mapStatusToLabel(HazardStatus.UnderInvestigation) },
              { current: HazardStatus.UnderInvestigation, next: [HazardStatus.ActionRequired, HazardStatus.WaitingProcurement, HazardStatus.Implementation, HazardStatus.Completed].map(s => t(`status.${s}`) || mapStatusToLabel(s)).join(', ') },
              { current: HazardStatus.ActionRequired, next: [HazardStatus.WaitingProcurement, HazardStatus.Implementation, HazardStatus.Completed].map(s => t(`status.${s}`) || mapStatusToLabel(s)).join(', ') },
              { current: HazardStatus.WaitingProcurement, next: [HazardStatus.Implementation, HazardStatus.Completed].map(s => t(`status.${s}`) || mapStatusToLabel(s)).join(', ') },
              { current: HazardStatus.Implementation, next: [HazardStatus.Completed, HazardStatus.UnderInvestigation].map(s => t(`status.${s}`) || mapStatusToLabel(s)).join(', ') },
              { current: HazardStatus.Completed, next: t(`status.${HazardStatus.Resolved}`) || mapStatusToLabel(HazardStatus.Resolved) },
              { current: HazardStatus.Resolved, next: language === 'id' ? 'Selesai (Final State)' : 'Resolved (Final State)' }
            ].map((rule, idx) => (
              <div key={idx} className="bg-slate-950 px-3 py-2.5 border border-slate-800 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 min-w-0 max-w-full">
                <span className="text-slate-300 font-bold shrink-0 text-xs">{t(`status.${rule.current}`) || mapStatusToLabel(rule.current)}</span>
                <div className="flex items-center gap-1.5 sm:justify-end min-w-0 flex-1 max-w-full">
                  <ChevronRight className="w-3 h-3 text-slate-600 shrink-0 hidden sm:block" />
                  <span className="text-emerald-400/90 text-[11px] font-semibold sm:text-right break-words min-w-0">{rule.next}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hazard Classifications */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl flex flex-col justify-between min-w-0 max-w-full">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{language === 'id' ? 'Klasifikasi Bahaya K3 Manufaktur' : 'Safety Hazard Classifications'}</span>
            </h3>

            <div className="space-y-4">
              {[
                { 
                  class: 'A', 
                  name: language === 'id' ? 'K3 / Alat Pelindung Diri (APD)' : 'Safety / APD / PPE', 
                  desc: language === 'id' ? 'Pelanggaran penggunaan APD (helm, sepatu safety, kacamata), potensi bahaya terpeleset, atau keselamatan kerja langsung. Ditugaskan ke HRGA Admin.' : 'Critical life safety protections. Missing helmets, safety boots, safety harness bypasses, or floor sliding hazards. Assigned immediately to HRGA Admin.', 
                  color: 'text-rose-400 border-rose-500/20 bg-rose-500/5' 
                },
                { 
                  class: 'B', 
                  name: language === 'id' ? 'Lingkungan Kerja & Bahan Berbahaya' : 'Environmental Compliance', 
                  desc: language === 'id' ? 'Kebocoran bahan kimia, limbah B3, emisi asap mesin, atau genangan oli di lantai produksi. Ditugaskan ke Asep Permana.' : 'Resource leakages, chemical drum spillage, smoke emissions, toxic materials handling issues, or hydraulic leaks. Assigned immediately to Asep Permana.', 
                  color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' 
                },
                { 
                  class: 'C', 
                  name: language === 'id' ? 'Mekanikal, Kelistrikan & Fasilitas' : 'General Maintenance & Floor', 
                  desc: language === 'id' ? 'Kabel terkelupas, mesin rusak, penerangan kurang, kerusakan pagar pengaman, atau komponen fisik. Ditugaskan ke Purwanto.' : 'Broken locks, frayed machinery wires, ventilation faults, damaged facility panels, or cracked walls. Assigned immediately to Purwanto.', 
                  color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' 
                }
              ].map((c, idx) => (
                <div key={idx} className={`p-3.5 border rounded-lg flex items-start gap-3 text-xs min-w-0 max-w-full ${c.color}`}>
                  <span className="text-base font-black font-mono shrink-0 bg-slate-950 w-7 h-7 rounded border border-slate-800/80 flex items-center justify-center">{c.class}</span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold break-words">{c.name}</h4>
                    <p className="text-slate-400 mt-1 leading-relaxed text-[11px] break-words">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
