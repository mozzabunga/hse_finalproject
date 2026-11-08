<div class="w-full max-w-5xl mx-auto space-y-8 font-sans relative min-w-0 px-3 sm:px-6 py-6 sm:py-8">
  
  <!-- Top action header for employees (Officer Login button) -->
  <div class="flex justify-end z-10 w-full mb-1">
    <?php if (!empty($currentUser)): ?>
      <a href="<?= url('/admin') ?>" class="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 hover:border-emerald-500/50 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition shadow-md no-underline min-h-[40px]">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span><?= e(__('nav.officer')) ?> (<?= e($currentUser['name']) ?>)</span>
      </a>
    <?php else: ?>
      <a href="<?= url('/login') ?>" class="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-500/50 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition shadow-md no-underline min-h-[40px]" id="btn-officer-login-home">
        <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span><?= e(__('header.officerLogin')) ?></span>
      </a>
    <?php endif; ?>
  </div>
  
  <!-- Title block with Minda branding -->
  <div class="text-center space-y-3 pb-2 sm:pb-4 px-2">
    <div class="flex justify-center mb-1">
      <div class="inline-flex items-center justify-center shrink-0 bg-white rounded-lg shadow-sm border border-slate-200/80 px-2.5 py-2">
        <img src="<?= asset('spark_minda_logo.svg') ?>" alt="SPARK MINDA" class="h-9 sm:h-11 w-[165px] sm:w-[195px] object-contain block" onerror="this.onerror=null; this.src='<?= asset('spark_minda_logo.png') ?>';" />
      </div>
    </div>
    
    <div class="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full uppercase max-w-full">
      <svg class="w-3.5 h-3.5 animate-pulse shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span class="truncate"><?= e(__('company.name')) ?></span>
    </div>

    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight m-0">
      <?= e(__('landing.title')) ?>
    </h1>
    <p class="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed m-0">
      <?= e(__('landing.subtitle')) ?>
    </p>
  </div>

  <!-- Main Two Options Landing Screen (Exact 1:1 Parity with Screenshot and PublicTracker.tsx) -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto w-full px-1">
    
    <!-- Option 1: Make New Report -->
    <a href="<?= url('/report') ?>" class="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 p-5 sm:p-8 rounded-2xl text-left shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px] sm:min-h-[180px] w-full cursor-pointer no-underline" id="btn-make-report">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.05),transparent_40%)]"></div>
      <div class="bg-emerald-500/10 border border-emerald-500/20 p-3 sm:p-3.5 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300 w-fit shrink-0">
        <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div class="mt-4 sm:mt-6">
        <h3 class="text-sm sm:text-base font-bold text-slate-100 group-hover:text-emerald-400 transition-colors flex items-center justify-between sm:justify-start gap-1.5 m-0">
          <span><?= e(__('landing.makeReport')) ?></span>
          <svg class="w-4 h-4 opacity-70 sm:opacity-0 group-hover:opacity-100 transition translate-x-1 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </h3>
        <p class="text-xs text-slate-400 mt-1.5 sm:mt-2 leading-relaxed m-0">
          <?= e(__('landing.makeReportDesc')) ?>
        </p>
      </div>
    </a>

    <!-- Option 2: Track Your Report -->
    <a href="<?= url('/tracker') ?>" class="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 p-5 sm:p-8 rounded-2xl text-left shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px] sm:min-h-[180px] w-full cursor-pointer no-underline" id="btn-track-report">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.05),transparent_40%)]"></div>
      <div class="bg-emerald-500/10 border border-emerald-500/20 p-3 sm:p-3.5 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300 w-fit shrink-0">
        <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <div class="mt-4 sm:mt-6">
        <h3 class="text-sm sm:text-base font-bold text-slate-100 group-hover:text-emerald-400 transition-colors flex items-center justify-between sm:justify-start gap-1.5 m-0">
          <span><?= e(__('landing.trackReport')) ?></span>
          <svg class="w-4 h-4 opacity-70 sm:opacity-0 group-hover:opacity-100 transition translate-x-1 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </h3>
        <p class="text-xs text-slate-400 mt-1.5 sm:mt-2 leading-relaxed m-0">
          <?= e(__('landing.trackReportDesc')) ?>
        </p>
      </div>
    </a>

  </div>

</div>
