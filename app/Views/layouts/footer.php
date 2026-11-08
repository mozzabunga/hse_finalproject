<footer class="bg-slate-950 border-t border-slate-900 text-slate-500 py-6 px-4 mt-auto w-full max-w-full">
  <div class="max-w-7xl w-full max-w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-4 min-w-0">
    
    <!-- Left column -->
    <div class="flex items-center gap-2">
      <svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <p class="text-xs tracking-wide m-0">
        &copy; <?= date('Y') ?> PT Minda Automotive Indonesia. <?= e(__('footer.rights')) ?>
      </p>
    </div>

    <!-- Right column -->
    <div class="flex items-center gap-2 text-[11px] font-mono text-slate-500 flex-wrap justify-center md:justify-end">
      <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
      <span><?= e(__('footer.slaText')) ?></span>
      <span>&middot;</span>
      <span class="text-emerald-400 font-semibold"><?= e(__('footer.k3Text')) ?></span>
    </div>

  </div>
</footer>
