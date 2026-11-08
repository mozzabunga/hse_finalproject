<?php
$old = $old ?? [];
$errors = $errors ?? [];

$departments = [
    'HRGA', 'Finance & Accounting', 'Marketing', 'Maintenance',
    'Purchasing / Procurement', 'PPIC', 'QA & QC', 'Boonded',
    'Main Store', 'Tool Room', 'PP Key', 'PP DC', 'Assembly',
    'Design & Development', 'Security', 'OB', 'PE', 'IT', 'Others'
];

$positions = [
    'Operator', 'Staff', 'Leader', 'Supervisor', 'Admin',
    'Magang', 'Teknisi', 'Driver', 'Security', 'Others'
];

$areas = [
    'Area Office', 'Area Boonded Dalam', 'Area Boonded Luar', 'Lab Quality',
    'Tool Room', 'PP Key', 'PP DC', 'Maintenance', 'Main Store Dalam',
    'Main Store Luar', 'Assembly', 'Lapangan Rumput', 'Meeting Room',
    'Gurukul', 'Conference Room', 'Lobby', 'Toilet', 'Garden',
    'Security', 'Tempat Parkir Motor', 'Tempat Parkir Mobil',
    'Mushola', 'Kantin', 'Loker', 'Ruang Arsip', 'Others'
];

$hazardCategories = [
    'Unsafe Action', 'Unsafe Condition', 'Near Miss', 'Kerusakan APD',
    'Kebocoran', 'Tumpahan Cairan', 'Bahaya Listrik', 'Bahaya Kebakaran',
    'Forklift', 'Housekeeping', 'Ergonomi', 'Jalur Evakuasi',
    'Material Berserakan', 'Chemical Hazard', 'Noise Hazard',
    'Working at Height', 'Lifting Activity', 'Alat Rusak', 'Others'
];

$potentialImpacts = [
    'Tidak Berbahaya', 'Cedera Ringan', 'Cedera Berat', 'Cacat Permanen',
    'Potensi Korban Jiwa', 'Potensi Kebakaran', 'Potensi Kerusakan Alat / Mesin',
    'Potensi Pencemaran Lingkungan', 'Others'
];

$injuryStatuses = [
    'Tidak Ada', 'Ada Cedera Ringan', 'Ada Cedera Berat', 'Others'
];

$currentConditions = [
    'Masih Ada', 'Sudah Diperbaiki Sementara', 'Sudah Tidak Ada', 'Others'
];
?>

<div class="w-full max-w-4xl mx-auto space-y-6 font-sans relative min-w-0 px-3 sm:px-6 py-6 sm:py-8">

  <!-- Back Link -->
  <a href="/" class="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition no-underline">
    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
    <span><?= \App\Core\I18n::isIndonesian() ? 'Kembali ke Beranda' : 'Back to Home' ?></span>
  </a>

  <!-- Header Banner -->
  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-3 text-left">
    <div class="flex items-center gap-2">
      <div class="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-emerald-400">
        <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <h1 class="text-lg sm:text-xl font-extrabold text-slate-100 tracking-tight m-0">
          <?= e(__('form.title')) ?>
        </h1>
        <p class="text-[11px] font-mono text-emerald-400 uppercase tracking-wider m-0 mt-0.5">
          PT MINDA AUTOMOTIVE INDONESIA &middot; ISO 45001 &amp; ZERO ACCIDENT POLICY
        </p>
      </div>
    </div>
    <p class="text-xs text-slate-400 leading-relaxed m-0 pt-1">
      <?= e(__('form.desc')) ?>
    </p>
  </div>

  <!-- Validation Errors Alert -->
  <?php if (!empty($errors)): ?>
    <div class="bg-rose-950/60 border border-rose-500/40 rounded-xl p-4 text-xs text-rose-300 space-y-1.5">
      <div class="flex items-center gap-2 font-bold text-rose-400">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Harap perbaiki beberapa isian formulir:</span>
      </div>
      <ul class="list-disc list-inside space-y-0.5 pl-1">
        <?php foreach ($errors as $err): ?>
          <li><?= e($err) ?></li>
        <?php endforeach; ?>
      </ul>
    </div>
  <?php endif; ?>

  <!-- Report Submission Form -->
  <form action="/report" method="POST" enctype="multipart/form-data" id="hazard-form" class="space-y-6">
    <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>" />
    <input type="hidden" name="photo_base64" id="photo_base64" value="" />

    <!-- SECTION 1: Identitas Pelapor -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-4 text-left">
      <div class="border-b border-slate-800 pb-3 flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center">1</span>
        <h3 class="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono m-0">
          <?= \App\Core\I18n::isIndonesian() ? 'Identitas Pelapor' : 'Reporter Information' ?>
        </h3>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div class="space-y-1.5">
          <label class="text-slate-300 font-semibold block"><?= e(__('form.name')) ?></label>
          <input
            type="text"
            name="reporter_name"
            required
            value="<?= e($old['reporter_name'] ?? '') ?>"
            placeholder="Ahmad Fauzi"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-slate-300 font-semibold block"><?= e(__('form.empId')) ?></label>
          <input
            type="text"
            name="employee_id"
            required
            value="<?= e($old['employee_id'] ?? '') ?>"
            placeholder="EMP-9021"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-slate-300 font-semibold block"><?= e(__('form.email')) ?></label>
          <input
            type="email"
            name="reporter_email"
            required
            value="<?= e($old['reporter_email'] ?? '') ?>"
            placeholder="ahmad.fauzi@mindaauto.co.id"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-slate-300 font-semibold block"><?= \App\Core\I18n::isIndonesian() ? 'Jabatan / Posisi' : 'Position' ?></label>
          <select
            name="position"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <?php foreach ($positions as $pos): ?>
              <option value="<?= e($pos) ?>" <?= ($old['position'] ?? 'Operator') === $pos ? 'selected' : '' ?>><?= e($pos) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
      </div>
    </div>

    <!-- SECTION 2: Lokasi & Waktu Temuan -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-4 text-left">
      <div class="border-b border-slate-800 pb-3 flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center">2</span>
        <h3 class="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono m-0">
          <?= \App\Core\I18n::isIndonesian() ? 'Lokasi & Waktu Temuan' : 'Location & Incident Time' ?>
        </h3>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div class="space-y-1.5">
          <label class="text-slate-300 font-semibold block"><?= \App\Core\I18n::isIndonesian() ? 'Tanggal Kejadian *' : 'Incident Date *' ?></label>
          <input
            type="date"
            name="incident_date"
            required
            value="<?= e($old['incident_date'] ?? date('Y-m-d')) ?>"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-slate-300 font-semibold block"><?= e(__('form.department')) ?> *</label>
          <select
            name="department"
            id="department-select"
            required
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="">-- Pilih Departemen --</option>
            <?php foreach ($departments as $dept): ?>
              <option value="<?= e($dept) ?>" <?= ($old['department'] ?? '') === $dept ? 'selected' : '' ?>><?= e($dept) ?></option>
            <?php endforeach; ?>
          </select>
          <input
            type="text"
            name="department_other"
            id="department-other"
            placeholder="Ketik nama departemen spesifik..."
            value="<?= e($old['department_other'] ?? '') ?>"
            class="hidden w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 mt-2"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-slate-300 font-semibold block"><?= e(__('form.area')) ?> *</label>
          <select
            name="area"
            id="area-select"
            required
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="">-- Pilih Area Pabrik --</option>
            <?php foreach ($areas as $a): ?>
              <option value="<?= e($a) ?>" <?= ($old['area'] ?? '') === $a ? 'selected' : '' ?>><?= e($a) ?></option>
            <?php endforeach; ?>
          </select>
          <input
            type="text"
            name="area_other"
            id="area-other"
            placeholder="Ketik nama area spesifik..."
            value="<?= e($old['area_other'] ?? '') ?>"
            class="hidden w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 mt-2"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-slate-300 font-semibold block"><?= \App\Core\I18n::isIndonesian() ? 'Detail Lokasi Spesifik *' : 'Specific Location Detail *' ?></label>
          <input
            type="text"
            name="detail_location"
            required
            value="<?= e($old['detail_location'] ?? '') ?>"
            placeholder="Contoh: Dekat Mesin Injection Molding #3 Line B"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>
    </div>

    <!-- SECTION 3: Kategori Bahaya & Dampak -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-4 text-left">
      <div class="border-b border-slate-800 pb-3 flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center">3</span>
        <h3 class="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono m-0">
          <?= \App\Core\I18n::isIndonesian() ? 'Jenis Temuan & Potensi Dampak' : 'Hazard Category & Consequence' ?>
        </h3>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div class="space-y-1.5">
          <label class="text-slate-300 font-semibold block"><?= \App\Core\I18n::isIndonesian() ? 'Jenis Temuan / Bahaya K3 *' : 'Hazard Type *' ?></label>
          <select
            name="hazard_category"
            id="hazard-category-select"
            required
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="">-- Pilih Jenis Temuan --</option>
            <?php foreach ($hazardCategories as $cat): ?>
              <option value="<?= e($cat) ?>" <?= ($old['hazard_category'] ?? '') === $cat ? 'selected' : '' ?>><?= e($cat) ?></option>
            <?php endforeach; ?>
          </select>
          <input
            type="text"
            name="hazard_category_other"
            id="hazard-category-other"
            placeholder="Sebutkan jenis temuan..."
            value="<?= e($old['hazard_category_other'] ?? '') ?>"
            class="hidden w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 mt-2"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-slate-300 font-semibold block"><?= \App\Core\I18n::isIndonesian() ? 'Potensi Dampak *' : 'Potential Impact *' ?></label>
          <select
            name="potential_impact"
            id="potential-impact-select"
            required
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <?php foreach ($potentialImpacts as $imp): ?>
              <option value="<?= e($imp) ?>" <?= ($old['potential_impact'] ?? 'Tidak Berbahaya') === $imp ? 'selected' : '' ?>><?= e($imp) ?></option>
            <?php endforeach; ?>
          </select>
          <input
            type="text"
            name="potential_impact_other"
            id="potential-impact-other"
            placeholder="Sebutkan potensi dampak..."
            value="<?= e($old['potential_impact_other'] ?? '') ?>"
            class="hidden w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 mt-2"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-slate-300 font-semibold block"><?= \App\Core\I18n::isIndonesian() ? 'Kondisi Korban / Cedera *' : 'Injury Status *' ?></label>
          <select
            name="injury_status"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <?php foreach ($injuryStatuses as $inj): ?>
              <option value="<?= e($inj) ?>" <?= ($old['injury_status'] ?? 'Tidak Ada') === $inj ? 'selected' : '' ?>><?= e($inj) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
      </div>
    </div>

    <!-- SECTION 4: Tindakan Sementara & Saran -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-4 text-left">
      <div class="border-b border-slate-800 pb-3 flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center">4</span>
        <h3 class="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono m-0">
          <?= \App\Core\I18n::isIndonesian() ? 'Tindakan Sementara & Usulan Perbaikan' : 'Temporary Action & Suggestion' ?>
        </h3>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div class="space-y-1.5 sm:col-span-2">
          <label class="text-slate-300 font-semibold block"><?= \App\Core\I18n::isIndonesian() ? 'Tindakan Sementara yang Telah Dilakukan *' : 'Immediate / Temporary Containment Action *' ?></label>
          <textarea
            name="temporary_action"
            required
            rows="2"
            placeholder="Jelaskan tindakan darurat langsung yang telah diambil di lapangan..."
            class="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          ><?= e($old['temporary_action'] ?? '') ?></textarea>
        </div>

        <div class="space-y-1.5">
          <label class="text-slate-300 font-semibold block"><?= \App\Core\I18n::isIndonesian() ? 'Kondisi Saat Dilaporkan' : 'Condition When Reported' ?></label>
          <select
            name="current_condition"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <?php foreach ($currentConditions as $cond): ?>
              <option value="<?= e($cond) ?>" <?= ($old['current_condition'] ?? 'Masih Ada') === $cond ? 'selected' : '' ?>><?= e($cond) ?></option>
            <?php endforeach; ?>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="text-slate-300 font-semibold block"><?= \App\Core\I18n::isIndonesian() ? 'Sudah Disampaikan ke Atasan / Leader?' : 'Informed to Leader / Superior?' ?></label>
          <select
            name="reported_to_leader"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="Ya" <?= ($old['reported_to_leader'] ?? '') === 'Ya' ? 'selected' : '' ?>>Ya</option>
            <option value="Belum" <?= ($old['reported_to_leader'] ?? 'Belum') === 'Belum' ? 'selected' : '' ?>>Belum</option>
          </select>
        </div>

        <div class="space-y-1.5 sm:col-span-2">
          <label class="text-slate-300 font-semibold block"><?= \App\Core\I18n::isIndonesian() ? 'Saran Perbaikan / Mitigasi Permanen *' : 'Corrective Suggestion / Mitigation *' ?></label>
          <textarea
            name="suggestion"
            required
            rows="2"
            placeholder="Berikan masukan perbaikan teknis atau administratif agar bahaya tidak terulang..."
            class="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          ><?= e($old['suggestion'] ?? '') ?></textarea>
        </div>
      </div>
    </div>

    <!-- SECTION 5: Bukti Foto Temuan K3 -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-4 text-left">
      <div class="border-b border-slate-800 pb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center">5</span>
          <h3 class="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono m-0">
            <?= \App\Core\I18n::isIndonesian() ? 'Bukti Foto Temuan K3 (Opsional)' : 'Photographic Evidence (Optional)' ?>
          </h3>
        </div>
        <span class="text-[10px] text-slate-500 font-mono">JPG, PNG, WebP &middot; Max 5MB</span>
      </div>

      <div class="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 text-center space-y-3 cursor-pointer bg-slate-950/50 transition" id="drop-zone">
        <input type="file" id="photo_file" name="photo_file" accept="image/jpeg,image/png,image/webp" class="hidden" />
        <div class="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p class="text-xs font-bold text-slate-200 m-0">Klik untuk memilih foto atau seret ke sini</p>
          <p class="text-[11px] text-slate-500 m-0 mt-0.5">Otomatis dikompresi di browser sebelum diunggah</p>
        </div>
      </div>

      <!-- Preview Image Container -->
      <div id="photo-preview-wrap" class="hidden flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        <img id="photo-preview-img" src="" alt="Preview Foto" class="w-16 h-16 object-cover rounded-lg border border-slate-850" />
        <div class="flex-grow min-w-0">
          <p id="photo-preview-name" class="text-xs font-bold text-slate-200 truncate m-0"></p>
          <p id="photo-preview-size" class="text-[10px] text-emerald-400 font-mono m-0 mt-0.5"></p>
        </div>
        <button type="button" id="btn-remove-photo" class="text-xs text-rose-400 hover:text-rose-300 p-2 bg-transparent border-0 cursor-pointer">
          Hapus
        </button>
      </div>
    </div>

    <!-- Submit CTA Button -->
    <div class="pt-2 text-center">
      <button
        type="submit"
        id="btn-submit-report"
        class="w-full sm:w-auto min-w-[280px] bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-sm px-8 py-3.5 rounded-xl shadow-xl shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2 mx-auto border-0"
      >
        <svg class="w-4 h-4 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        <span><?= e(__('form.submitBtn')) ?></span>
      </button>
    </div>

  </form>

</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
  // Toggle "Others" input fields
  const setupOtherToggle = (selectId, otherInputId) => {
    const sel = document.getElementById(selectId);
    const other = document.getElementById(otherInputId);
    if (!sel || !other) return;

    const check = () => {
      if (sel.value === 'Others') {
        other.classList.remove('hidden');
        other.focus();
      } else {
        other.classList.add('hidden');
      }
    };
    sel.addEventListener('change', check);
    check();
  };

  setupOtherToggle('department-select', 'department-other');
  setupOtherToggle('area-select', 'area-other');
  setupOtherToggle('hazard-category-select', 'hazard-category-other');
  setupOtherToggle('potential-impact-select', 'potential-impact-other');

  // Client-Side Canvas Image Compression
  const fileInput = document.getElementById('photo_file');
  const dropZone = document.getElementById('drop-zone');
  const previewWrap = document.getElementById('photo-preview-wrap');
  const previewImg = document.getElementById('photo-preview-img');
  const previewName = document.getElementById('photo-preview-name');
  const previewSize = document.getElementById('photo-preview-size');
  const removeBtn = document.getElementById('btn-remove-photo');
  const base64Input = document.getElementById('photo_base64');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (re) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxDim = 1600;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedData = canvas.toDataURL('image/jpeg', 0.82);
          base64Input.value = compressedData;

          previewImg.src = compressedData;
          previewName.textContent = file.name;
          previewSize.textContent = `Terkonversi: ${(compressedData.length / 1024).toFixed(1)} KB (1600px)`;
          previewWrap.classList.remove('hidden');
          dropZone.classList.add('hidden');
        };
        img.src = re.target.result;
      };
      reader.readAsDataURL(file);
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        fileInput.value = '';
        base64Input.value = '';
        previewWrap.classList.add('hidden');
        dropZone.classList.remove('hidden');
      });
    }
  }
});
</script>
