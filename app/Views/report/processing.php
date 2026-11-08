<?php
$ticketId = $ticketId ?? 'HZ-2026-XXXX';
?>

<div class="w-full max-w-2xl mx-auto space-y-6 font-sans relative min-w-0 px-3 sm:px-6 py-10 sm:py-16 text-center">
  
  <!-- Logo & Shield Animation -->
  <div class="relative w-16 h-16 mx-auto mb-4">
    <div class="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
    <div class="relative w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
      <svg class="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    </div>
  </div>

  <!-- Title & Subtitle -->
  <div class="space-y-2">
    <h1 class="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight m-0">
      <?= e(__('proc.title')) ?>
    </h1>
    <p class="text-xs text-slate-400 max-w-md mx-auto leading-relaxed m-0">
      <?= e(__('proc.desc1')) ?>
    </p>
  </div>

  <!-- Progress Bar Container -->
  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 text-left">
    <div class="flex items-center justify-between text-xs font-mono">
      <span class="text-slate-400 uppercase tracking-wider font-bold"><?= e(__('proc.progressTitle')) ?></span>
      <span class="text-emerald-400 font-bold" id="progress-percent">0%</span>
    </div>

    <!-- Progress Track -->
    <div class="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
      <div id="progress-bar" class="bg-emerald-500 h-full w-0 transition-all duration-300 rounded-full"></div>
    </div>

    <!-- Processing Checklist -->
    <div class="space-y-3 pt-2">
      <h4 class="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-400 border-b border-slate-800 pb-2 m-0">
        <?= e(__('proc.checklistTitle')) ?>
      </h4>

      <ul class="space-y-2.5 text-xs text-slate-300 list-none p-0 m-0 font-mono">
        <li class="flex items-center gap-2.5" id="step-1">
          <span class="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 step-icon">1</span>
          <span>Validasi Keaslian Identitas &amp; NIK Karyawan</span>
        </li>
        <li class="flex items-center gap-2.5" id="step-2">
          <span class="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 step-icon">2</span>
          <span>Analisis Kategori Bahaya K3 &amp; Penilaian Risiko Awal</span>
        </li>
        <li class="flex items-center gap-2.5" id="step-3">
          <span class="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 step-icon">3</span>
          <span>Penugasan Otomatis Petugas PIC &amp; Alokasi SLA</span>
        </li>
        <li class="flex items-center gap-2.5" id="step-4">
          <span class="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 step-icon">4</span>
          <span>Pengiriman Notifikasi Instan &amp; Pembuatan Rekam Audit</span>
        </li>
      </ul>
    </div>
  </div>

  <!-- Actions -->
  <div class="pt-2">
    <a href="/submitted?ticket=<?= urlencode($ticketId) ?>" id="btn-continue" class="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 no-underline">
      <span>Lihat Konfirmasi Tiket Sekarang &rarr;</span>
    </a>
  </div>

</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const bar = document.getElementById('progress-bar');
  const percentText = document.getElementById('progress-percent');
  const ticketId = "<?= e($ticketId) ?>";

  const markStepDone = (stepNum) => {
    const el = document.getElementById('step-' + stepNum);
    if (!el) return;
    const icon = el.querySelector('.step-icon');
    icon.className = 'w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px]';
    icon.textContent = '✓';
    el.classList.add('text-emerald-400');
  };

  let progress = 0;
  const timer = setInterval(() => {
    progress += 25;
    if (progress > 100) progress = 100;

    bar.style.width = progress + '%';
    percentText.textContent = progress + '%';

    if (progress === 25) markStepDone(1);
    if (progress === 50) markStepDone(2);
    if (progress === 75) markStepDone(3);
    if (progress >= 100) {
      markStepDone(4);
      clearInterval(timer);
      setTimeout(() => {
        window.location.href = '/submitted?ticket=' + encodeURIComponent(ticketId);
      }, 800);
    }
  }, 450);
});
</script>
