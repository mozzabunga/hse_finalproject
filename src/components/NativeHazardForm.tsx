import React, { useState, useRef } from 'react';
import { 
  AlertTriangle, Send, CheckCircle2, User, Calendar, 
  MapPin, ShieldAlert, Image as ImageIcon, Upload, 
  Trash2, AlertCircle, Sparkles, Loader2, FileText, 
  Check, Info, ChevronRight, CornerDownRight 
} from 'lucide-react';
import { HazardReport } from '../types';
import { createHazardReport } from '../supabase';
import SparkMindaLogo from './SparkMindaLogo';
import { motion, AnimatePresence } from 'motion/react';

export const DEPARTMENTS = [
  'HRGA',
  'Finance & Accounting',
  'Marketing',
  'Maintenance',
  'Purchasing / Procurement',
  'PPIC',
  'QA & QC',
  'Boonded',
  'Main Store',
  'Tool Room',
  'PP Key',
  'PP DC',
  'Assembly',
  'Design & Development',
  'Security',
  'OB',
  'PE',
  'IT',
  'Others'
];

export const POSITIONS = [
  'Operator',
  'Staff',
  'Leader',
  'Supervisor',
  'Admin',
  'Magang',
  'Teknisi',
  'Driver',
  'Security',
  'Others'
];

export const AREAS = [
  'Area Office',
  'Area Boonded Dalam',
  'Area Boonded Luar',
  'Lab Quality',
  'Tool Room',
  'PP Key',
  'PP DC',
  'Maintenance',
  'Main Store Dalam',
  'Main Store Luar',
  'Assembly',
  'Lapangan Rumput',
  'Meeting Room',
  'Gurukul',
  'Conference Room',
  'Lobby',
  'Toilet',
  'Garden',
  'Security',
  'Tempat Parkir Motor',
  'Tempat Parkir Mobil',
  'Mushola',
  'Kantin',
  'Loker',
  'Ruang Arsip',
  'Others'
];

export const HAZARD_CATEGORIES = [
  'Unsafe Action',
  'Unsafe Condition',
  'Near Miss',
  'Kerusakan APD',
  'Kebocoran',
  'Tumpahan Cairan',
  'Bahaya Listrik',
  'Bahaya Kebakaran',
  'Forklift',
  'Housekeeping',
  'Ergonomi',
  'Jalur Evakuasi',
  'Material Berserakan',
  'Chemical Hazard',
  'Noise Hazard',
  'Working at Height',
  'Lifting Activity',
  'Alat Rusak',
  'Others'
];

export const POTENTIAL_IMPACTS = [
  'Tidak Berbahaya',
  'Cedera Ringan',
  'Cedera Berat',
  'Cacat Permanen',
  'Potensi Korban Jiwa',
  'Potensi Kebakaran',
  'Potensi Kerusakan Alat / Mesin',
  'Potensi Pencemaran Lingkungan',
  'Others'
];

export const INJURY_STATUSES = [
  'Tidak Ada',
  'Ada Cedera Ringan',
  'Ada Cedera Berat',
  'Others'
];

export const CURRENT_CONDITIONS = [
  'Masih Ada',
  'Sudah Diperbaiki Sementara',
  'Sudah Tidak Ada',
  'Others'
];

export const REPORTED_TO_LEADER_OPTIONS = [
  'Ya',
  'Belum'
];

/**
 * Compresses an image file on the client side before base64 upload
 * to ensure fast uploads, prevent payload bloat, and fit inside storage limits.
 */
async function compressImageFile(
  file: File, 
  maxDimension = 1600, 
  quality = 0.82
): Promise<{ base64: string; type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ base64: e.target?.result as string, type: file.type });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(mimeType, quality);
        resolve({ base64: compressedBase64, type: mimeType });
      };
      img.onerror = () => resolve({ base64: e.target?.result as string, type: file.type });
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface NativeHazardFormProps {
  onReportCreated?: (report: HazardReport) => void;
  onViewTracker?: (report?: HazardReport) => void;
}

export default function NativeHazardForm({ onReportCreated, onViewTracker }: NativeHazardFormProps) {
  // Bagian 1: Identitas Pelapor
  const [reporterName, setReporterName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [otherDepartment, setOtherDepartment] = useState('');
  const [position, setPosition] = useState(POSITIONS[0]);
  const [otherPosition, setOtherPosition] = useState('');

  // Bagian 2: Waktu & Lokasi Temuan
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [area, setArea] = useState(AREAS[0]);
  const [otherArea, setOtherArea] = useState('');
  const [detailLocation, setDetailLocation] = useState('');

  // Bagian 3: Klasifikasi & Evaluasi Bahaya
  const [hazardCategory, setHazardCategory] = useState(HAZARD_CATEGORIES[0]);
  const [otherHazardCategory, setOtherHazardCategory] = useState('');
  const [potentialImpact, setPotentialImpact] = useState(POTENTIAL_IMPACTS[0]);
  const [otherPotentialImpact, setOtherPotentialImpact] = useState('');
  const [injuryStatus, setInjuryStatus] = useState(INJURY_STATUSES[0]);
  const [otherInjuryStatus, setOtherInjuryStatus] = useState('');

  // Bagian 4: Kondisi & Tindakan Terkait
  const [temporaryAction, setTemporaryAction] = useState('');
  const [currentCondition, setCurrentCondition] = useState(CURRENT_CONDITIONS[0]);
  const [otherCurrentCondition, setOtherCurrentCondition] = useState('');
  const [reportedToLeader, setReportedToLeader] = useState('Belum');
  const [suggestion, setSuggestion] = useState('');

  // Bagian 5: Lampiran Bukti
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successTicket, setSuccessTicket] = useState<HazardReport | null>(null);

  const handlePhotoSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setValidationErrors(['Hanya file gambar (JPG, PNG, WebP) yang diperbolehkan untuk bukti foto.']);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setValidationErrors(['Ukuran file bukti foto melebihi batas maksimal 5MB.']);
      return;
    }
    setValidationErrors([]);
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || photoUploading) return;

    // Resolve 'Others' values
    const finalDept = department === 'Others' ? otherDepartment.trim() : department;
    const finalPosition = position === 'Others' ? otherPosition.trim() : position;
    const finalArea = area === 'Others' ? otherArea.trim() : area;
    const finalCategory = hazardCategory === 'Others' ? otherHazardCategory.trim() : hazardCategory;
    const finalImpact = potentialImpact === 'Others' ? otherPotentialImpact.trim() : potentialImpact;
    const finalInjury = injuryStatus === 'Others' ? otherInjuryStatus.trim() : injuryStatus;
    const finalCondition = currentCondition === 'Others' ? otherCurrentCondition.trim() : currentCondition;

    // Comprehensive field validation
    const errors: string[] = [];
    if (!reporterName.trim()) errors.push('1. Nama Anda');
    if (!employeeId.trim()) errors.push('2. NIK / ID Karyawan Anda');
    if (!reporterEmail.trim() || !reporterEmail.includes('@')) {
      errors.push('3. Nama akun email Anda yang masih aktif (harus alamat email yang valid)');
    }
    if (!finalDept) errors.push('4. Departement Tempat Anda Bekerja');
    if (!finalPosition) errors.push('5. Jabatan');
    if (!incidentDate) errors.push('6. Tanggal Temuan');
    if (!finalArea) errors.push('7. Lokasi Area');
    if (!detailLocation.trim()) errors.push('8. Detail Lokasi (Contoh: "Dekat Mesin Stamping")');
    if (!finalCategory) errors.push('9. Jenis Temuan (Hazard Category)');
    if (!finalImpact) errors.push('10. Potensi Dampak');
    if (!finalInjury) errors.push('11. Apakah Ada Korban?');
    if (!temporaryAction.trim()) errors.push('12. Tindakan Sementara yang Dilakukan saat ini');
    if (!finalCondition) errors.push('13. Apakah kondisi masih ada saat dilaporkan?');
    if (!reportedToLeader) errors.push('14. Apakah Temuan Ini Sudah Disampaikan ke Atasan / Leader?');
    if (!suggestion.trim()) errors.push('15. Saran Perbaikan yang ingin Anda berikan');

    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationErrors([]);
    setIsSubmitting(true);
    setSuccessTicket(null);

    try {
      let uploadedPhotoUrl = '';

      // Upload photo evidence if attached
      if (photoFile) {
        setPhotoUploading(true);
        try {
          const { base64, type } = await compressImageFile(photoFile);
          const uploadRes = await fetch('/api/v1/upload-evidence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: base64,
              fileName: photoFile.name,
              fileType: type
            })
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.success && uploadData.publicUrl) {
              uploadedPhotoUrl = uploadData.publicUrl;
            }
          } else {
            console.warn('Upload endpoint returned status:', uploadRes.status);
          }
        } catch (uploadErr) {
          console.warn('Gagal upload foto bukti, melanjutkan pembuatan laporan:', uploadErr);
        } finally {
          setPhotoUploading(false);
        }
      }

      // Title & Full description mapping
      const reportTitle = `${finalCategory} - ${finalArea}`;
      const reportDesc = `[Jenis Temuan: ${finalCategory}]\n\nDetail Lokasi: ${detailLocation.trim()}\nPotensi Dampak: ${finalImpact}\nKondisi Korban: ${finalInjury}\nTindakan Sementara: ${temporaryAction.trim()}\nKondisi Saat Dilaporkan: ${finalCondition}\nDisampaikan ke Atasan: ${reportedToLeader}\nSaran Perbaikan: ${suggestion.trim()}`;

      const newTicket = await createHazardReport({
        title: reportTitle,
        description: reportDesc,
        department: finalDept,
        area: finalArea,
        reporterName: reporterName.trim(),
        reporterEmail: reporterEmail.trim(),
        employeeId: employeeId.trim(),
        position: finalPosition,
        incidentDate: incidentDate,
        detailLocation: detailLocation.trim(),
        hazardCategory: finalCategory,
        potentialImpact: finalImpact,
        injuryStatus: finalInjury,
        temporaryAction: temporaryAction.trim(),
        currentCondition: finalCondition,
        reportedToLeader: reportedToLeader,
        suggestion: suggestion.trim(),
        photoEvidenceUrl: uploadedPhotoUrl || undefined
      });

      setSuccessTicket(newTicket);
      if (onReportCreated) {
        onReportCreated(newTicket);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Gagal membuat laporan hazard:', err);
      setValidationErrors([err.message || 'Terjadi kesalahan saat menyimpan laporan. Silakan coba lagi.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSuccessTicket(null);
    setValidationErrors([]);
    // Retain reporter identity for convenience (Nama, NIK, Email, Dept, Jabatan)
    setDetailLocation('');
    setTemporaryAction('');
    setSuggestion('');
    setPhotoFile(null);
    setPhotoPreview('');
    setOtherDepartment('');
    setOtherPosition('');
    setOtherArea('');
    setOtherHazardCategory('');
    setOtherPotentialImpact('');
    setOtherInjuryStatus('');
    setOtherCurrentCondition('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // -------------------------------------------------------------
  // SUCCESS SCREEN
  // -------------------------------------------------------------
  if (successTicket) {
    return (
      <div className="w-full max-w-3xl mx-auto bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 sm:p-10 shadow-2xl text-center space-y-6 min-w-0">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-black text-slate-100 tracking-tight">
            Hazard Report Submitted
          </h3>
          <p className="text-xs font-mono text-slate-400">
            Nomor Tiket:{' '}
            <span className="text-lg font-bold text-emerald-400 font-mono tracking-wider">
              {successTicket.ticketId || successTicket.id}
            </span>
          </p>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed pt-1">
            Report Anda telah berhasil dikirim dan akan diproses oleh HSE Officer.
          </p>
        </div>

        {/* Structured Ticket Summary */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono tracking-wider">Jenis Temuan</span>
            <span className="font-semibold text-slate-100">{successTicket.hazardCategory || successTicket.title}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono tracking-wider">Klasifikasi K3 (DFA)</span>
            <span className="font-semibold text-emerald-400">
              Kategori {successTicket.category} ({successTicket.category === 'A' ? 'Safety/APD' : successTicket.category === 'B' ? 'Lingkungan' : 'Fasilitas & Mesin'})
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono tracking-wider">Lokasi & Area</span>
            <span className="text-slate-200">{successTicket.area} — {successTicket.detailLocation || 'General Floor'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono tracking-wider">PIC Ditugaskan Otomatis</span>
            <span className="font-semibold text-slate-200">{successTicket.picName || 'HSE Officer'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono tracking-wider">Pelapor</span>
            <span className="text-slate-300">{successTicket.reporterName} ({successTicket.employeeId})</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono tracking-wider">Waktu Submit</span>
            <span className="text-slate-300 font-mono">{new Date(successTicket.createdAt).toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 flex flex-col sm:flex-row gap-3 justify-center">
          {onViewTracker && (
            <button
              onClick={() => onViewTracker(successTicket)}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Lacak Status Tiket Ini</span>
            </button>
          )}
          <button
            onClick={handleResetForm}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-6 py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
          >
            <Send className="w-4 h-4" />
            <span>Buat Laporan Baru</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN NATIVE FORM VIEW
  // -------------------------------------------------------------
  return (
    <div className="w-full max-w-4xl max-w-full mx-auto space-y-6 min-w-0">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">Formulir Laporan Bahaya & Hampir Celaka K3</h2>
                <span className="shrink-0 inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/25">
                  <CheckCircle2 className="w-3 h-3" />
                  Portal HSE Langsung
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                PT Minda Automotive Indonesia — Budaya K3 Zero Accident
              </p>
            </div>
          </div>
          <SparkMindaLogo size="sm" />
        </div>

        <p className="text-xs text-slate-400 mt-4 leading-relaxed">
          Setiap karyawan wajib dan berhak melaporkan potensi bahaya, tindakan tidak aman, atau kondisi berbahaya di tempat kerja. Seluruh laporan langsung tersimpan ke sistem database HSE dengan penugasan otomatis kepada Person in Charge (PIC) terkait.
        </p>

        {/* Validation Errors Notice */}
        {validationErrors.length > 0 && (
          <div className="mt-4 p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-2 text-xs text-rose-300">
            <div className="flex items-center gap-2 font-bold text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Harap lengkapi pertanyaan wajib berikut sebelum mengirimkan laporan:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-200 pl-1">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* =========================================================
            BAGIAN 1: IDENTITAS PELAPOR
        ========================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <User className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Bagian 1: Identitas Pelapor
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Nama Anda */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                1. Nama Anda <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Budi Santoso"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 min-h-[44px]"
              />
            </div>

            {/* 2. NIK / ID Karyawan Anda */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                2. NIK / ID Karyawan Anda <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. EMP-1042"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono min-h-[44px]"
              />
            </div>
          </div>

          {/* 3. Nama akun email Anda yang masih aktif */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              3. Nama akun email Anda yang masih aktif <span className="text-rose-400">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. budi.santoso@mindaauto.co.id"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 min-h-[44px]"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Email aktif digunakan untuk pengiriman nomor tiket dan notifikasi pembaruan status penanganan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* 4. Departement Tempat Anda Bekerja */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                4. Departement Tempat Anda Bekerja <span className="text-rose-400">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 min-h-[44px]"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {department === 'Others' && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    placeholder="Sebutkan departement Anda..."
                    value={otherDepartment}
                    onChange={(e) => setOtherDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* 5. Jabatan */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                5. Jabatan <span className="text-rose-400">*</span>
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 min-h-[44px]"
              >
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {position === 'Others' && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    placeholder="Sebutkan jabatan Anda..."
                    value={otherPosition}
                    onChange={(e) => setOtherPosition(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================
            BAGIAN 2: WAKTU & LOKASI TEMUAN
        ========================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Bagian 2: Waktu & Lokasi Temuan
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 6. Tanggal Temuan */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                6. Tanggal Temuan <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 min-h-[44px]"
              />
            </div>

            {/* 7. Lokasi Area */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                7. Lokasi Area <span className="text-rose-400">*</span>
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 min-h-[44px]"
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              {area === 'Others' && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    placeholder="Sebutkan lokasi area..."
                    value={otherArea}
                    onChange={(e) => setOtherArea(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 8. Detail Lokasi */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              8. Detail Lokasi <span className="text-rose-400">*</span>
              <span className="text-slate-500 font-normal ml-1">
                (Contoh: "Dekat Mesin Stamping Line 2")
              </span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Dekat Mesin Stamping Line 2"
              value={detailLocation}
              onChange={(e) => setDetailLocation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 min-h-[44px]"
            />
          </div>
        </div>

        {/* =========================================================
            BAGIAN 3: KLASIFIKASI & EVALUASI BAHAYA
        ========================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Bagian 3: Klasifikasi & Evaluasi Bahaya
            </h3>
          </div>

          {/* 9. Jenis Temuan */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold text-slate-300">
                9. Jenis Temuan <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">
                Primary Hazard Category
              </span>
            </div>
            <select
              value={hazardCategory}
              onChange={(e) => setHazardCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold min-h-[44px]"
            >
              {HAZARD_CATEGORIES.map((hc) => (
                <option key={hc} value={hc}>
                  {hc}
                </option>
              ))}
            </select>
            {hazardCategory === 'Others' && (
              <div className="mt-2">
                <input
                  type="text"
                  required
                  placeholder="Sebutkan jenis temuan..."
                  value={otherHazardCategory}
                  onChange={(e) => setOtherHazardCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
            <p className="text-[10px] text-slate-500 mt-1">
              Nilai pertanyaan ini disimpan langsung ke kolom <code>hazard_category</code> dan menentukan routing penugasan PIC otomatis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* 10. Potensi Dampak */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                10. Potensi Dampak <span className="text-rose-400">*</span>
              </label>
              <select
                value={potentialImpact}
                onChange={(e) => setPotentialImpact(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 min-h-[44px]"
              >
                {POTENTIAL_IMPACTS.map((pi) => (
                  <option key={pi} value={pi}>
                    {pi}
                  </option>
                ))}
              </select>
              {potentialImpact === 'Others' && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    placeholder="Sebutkan potensi dampak..."
                    value={otherPotentialImpact}
                    onChange={(e) => setOtherPotentialImpact(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* 11. Apakah Ada Korban? */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                11. Apakah Ada Korban? <span className="text-rose-400">*</span>
              </label>
              <select
                value={injuryStatus}
                onChange={(e) => setInjuryStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 min-h-[44px]"
              >
                {INJURY_STATUSES.map((is) => (
                  <option key={is} value={is}>
                    {is}
                  </option>
                ))}
              </select>
              {injuryStatus === 'Others' && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    placeholder="Sebutkan kondisi korban..."
                    value={otherInjuryStatus}
                    onChange={(e) => setOtherInjuryStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================
            BAGIAN 4: KONDISI & TINDAKAN TERKAIT
        ========================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <AlertTriangle className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Bagian 4: Kondisi & Tindakan Terkait
            </h3>
          </div>

          {/* 12. Tindakan Sementara yang Dilakukan saat ini: */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              12. Tindakan Sementara yang Dilakukan saat ini: <span className="text-rose-400">*</span>
              <span className="text-slate-500 font-normal ml-1">
                (Contoh: "Area diberi tanda warning cone.")
              </span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Area diberi tanda warning cone dan dipasang garis pengaman."
              value={temporaryAction}
              onChange={(e) => setTemporaryAction(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 13. Apakah kondisi masih ada saat dilaporkan? */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                13. Apakah kondisi masih ada saat dilaporkan? <span className="text-rose-400">*</span>
              </label>
              <select
                value={currentCondition}
                onChange={(e) => setCurrentCondition(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 min-h-[44px]"
              >
                {CURRENT_CONDITIONS.map((cc) => (
                  <option key={cc} value={cc}>
                    {cc}
                  </option>
                ))}
              </select>
              {currentCondition === 'Others' && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    placeholder="Jelaskan kondisi saat ini..."
                    value={otherCurrentCondition}
                    onChange={(e) => setOtherCurrentCondition(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* 14. Apakah Temuan Ini Sudah Disampaikan ke Atasan / Leader? */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                14. Apakah Temuan Ini Sudah Disampaikan ke Atasan / Leader? <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 pt-0.5">
                {REPORTED_TO_LEADER_OPTIONS.map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                      reportedToLeader === opt
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportedToLeader"
                      value={opt}
                      checked={reportedToLeader === opt}
                      onChange={() => setReportedToLeader(opt)}
                      className="sr-only"
                    />
                    <span>{opt}</span>
                    {reportedToLeader === opt && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 15. Saran Perbaikan yang ingin Anda berikan: */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              15. Saran Perbaikan yang ingin Anda berikan: <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Tuliskan saran perbaikan permanen yang direkomendasikan agar bahaya serupa tidak terulang..."
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
          </div>
        </div>

        {/* =========================================================
            BAGIAN 5: LAMPIRAN BUKTI
        ========================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Bagian 5: Lampiran Bukti
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Opsional
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              16. Foto Bukti Hazard (Opsional)
            </label>

            {photoPreview ? (
              <div className="relative border border-slate-800 bg-slate-950 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-36 h-36 shrink-0 bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                  <img
                    src={photoPreview}
                    alt="Pratinjau Bukti Hazard"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {photoFile?.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    File terpilih ({(photoFile ? (photoFile.size / 1024).toFixed(1) : 0)} KB). Foto akan diunggah otomatis saat laporan dikirimkan.
                  </p>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium py-1 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Foto</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handlePhotoSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-xs font-bold text-slate-200">
                  Tarik & lepas foto bukti bahaya di sini, atau <span className="text-emerald-400 underline">pilih file</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Mendukung format JPG, PNG, WebP (Maksimal 5MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================
            SUBMIT ACTION & ANTI-DUPLICATE GUARD
        ========================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-400 pb-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Dengan menekan tombol kirim, laporan Anda akan langsung disimpan di database HSE dan diteruskan secara otomatis ke Person In Charge (PIC) terkait sesuai klasifikasi K3.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || photoUploading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800/50 text-slate-950 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 min-h-[48px]"
          >
            {isSubmitting || photoUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{photoUploading ? 'Mengunggah Foto Bukti...' : 'Mengirim Laporan Bahaya...'}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Laporan Bahaya (Submit)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
