<?php
$ticketId = $ticketId ?? 'HZ-2026-XXXX';
$report = $report ?? null;
?>

<div class="w-full max-w-xl mx-auto space-y-6 font-sans relative min-w-0 px-3 sm:px-6 py-10 sm:py-16 text-center">
  
  <!-- Success Badge Icon -->
  <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-2 shadow-xl shadow-emerald-500/10">
    <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  </div>

  <!-- Title & Description -->
  <div class="space-y-2">
    <h1 class="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight m-0">
      <?= e(__('form.successTitle')) ?>
    </h1>
    <p class="text-xs text-slate-400 max-w-md mx-auto leading-relaxed m-0">
      <?= e(__('form.successDesc')) ?>:
    </p>
  </div>

  <!-- Big Ticket ID Box -->
  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
    <div class="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
      <div class="text-left space-y-0.5">
        <span class="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">ID Referensi Tiket</span>
        <span class="text-lg sm:text-xl font-extrabold text-emerald-400 font-mono tracking-wider"><?= e($ticketId) ?></span>
      </div>
      <button
        type="button"
        id="btn-copy-ticket"
        class="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span id="copy-label">Salin</span>
      </button>
    </div>

    <!-- Quick Ticket Summary -->
    <?php if ($report): ?>
      <div class="grid grid-cols-2 gap-2 text-left text-[11px] font-mono bg-slate-950/50 p-3 rounded-lg border border-slate-850">
        <div>
          <span class="text-[9px] text-slate-500 block">Kategori Bahaya</span>
          <span class="text-slate-200 font-bold"><?= e($report['hazard_category'] ?: 'Kategori ' . $report['category']) ?></span>
        </div>
        <div>
          <span class="text-[9px] text-slate-500 block">Area Temuan</span>
          <span class="text-slate-200 font-bold"><?= e($report['area']) ?></span>
        </div>
        <div>
          <span class="text-[9px] text-slate-500 block">Status Awal</span>
          <span class="text-purple-400 font-bold"><?= e(__('status.' . $report['status'])) ?></span>
        </div>
        <div>
          <span class="text-[9px] text-slate-500 block">Petugas PIC</span>
          <span class="text-emerald-400 font-bold"><?= e($report['assigned_pic_name'] ?: 'HSE Team') ?></span>
        </div>
      </div>
    <?php endif; ?>

    <p class="text-[11px] text-slate-500 leading-relaxed m-0 text-left">
      Gunakan ID Tiket di atas untuk melacak kemajuan perbaikan dan verifikasi K3 oleh petugas melalui fitur <b>Lacak Laporan Anda</b>.
    </p>
  </div>

  <!-- Action CTA Buttons -->
  <div class="flex flex-col sm:flex-row gap-3 justify-center pt-2">
    <a
      href="/tracker/<?= urlencode($ticketId) ?>"
      class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 no-underline flex items-center justify-center gap-1.5"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <span><?= e(__('landing.trackReport')) ?></span>
    </a>
    <a
      href="/"
      class="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-semibold px-6 py-3 rounded-xl transition no-underline flex items-center justify-center"
    >
      <span>Kembali ke Beranda Utama</span>
    </a>
  </div>

</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const copyBtn = document.getElementById('btn-copy-ticket');
  const copyLabel = document.getElementById('copy-label');
  const ticketId = "<?= e($ticketId) ?>";

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(ticketId).then(() => {
        copyLabel.textContent = 'Tersalin!';
        setTimeout(() => {
          copyLabel.textContent = 'Salin';
        }, 2000);
      });
    });
  }
});
</script>
