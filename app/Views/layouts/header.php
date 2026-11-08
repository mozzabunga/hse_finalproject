<?php
$currentPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$activeTab = 'home';
if (str_contains($currentPath, '/tracker') || str_contains($currentPath, '/report')) {
    $activeTab = 'report';
} elseif (str_contains($currentPath, '/admin') || str_contains($currentPath, '/officer')) {
    $activeTab = 'officer';
} elseif (str_contains($currentPath, '/workflow')) {
    $activeTab = 'workflow';
}

$currentUser = $currentUser ?? null;
$unreadCount = $unreadCount ?? 0;
?>

<header class="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-3 sm:px-6 w-full max-w-full min-w-0">
  <div class="max-w-7xl w-full max-w-full mx-auto flex items-center justify-between gap-2 sm:gap-4 min-w-0 py-2.5">
    
    <!-- Brand (Logo + Company Name) -->
    <a href="<?= url('/') ?>" class="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0 min-w-0 no-underline">
      <!-- Company logo image (Hidden on mobile < 640px) -->
      <div class="hidden sm:inline-flex items-center justify-center shrink-0 bg-white rounded-lg shadow-sm border border-slate-200/80 px-2 py-1.5">
        <img src="<?= asset('spark_minda_logo.svg') ?>" alt="SPARK MINDA" class="h-6 sm:h-7 w-[105px] sm:w-[125px] object-contain block" onerror="this.onerror=null; this.src='<?= asset('spark_minda_logo.png') ?>';" />
      </div>

      <!-- Desktop view (>= 1024px) -->
      <div class="min-w-0 hidden lg:flex flex-col justify-center pr-1">
        <h1 class="text-xs font-bold tracking-tight uppercase text-slate-100 truncate max-w-[130px] xl:max-w-[200px] 2xl:max-w-none leading-tight m-0">
          <?= e(__('company.name')) ?>
        </h1>
        <p class="text-[10px] text-emerald-400 font-mono tracking-wider uppercase truncate max-w-[130px] xl:max-w-[200px] 2xl:max-w-none leading-tight m-0 mt-0.5">
          <?= e(__('portal.title')) ?>
        </p>
      </div>

      <!-- Tablet view (640px - 1023px) -->
      <div class="min-w-0 hidden sm:flex lg:hidden flex-col justify-center">
        <h1 class="text-xs font-bold tracking-tight uppercase text-slate-100 truncate max-w-[180px] leading-tight m-0">
          <?= e(__('company.name')) ?>
        </h1>
        <p class="text-[9px] text-emerald-400 font-mono tracking-wider uppercase truncate max-w-[180px] leading-tight m-0 mt-0.5">
          <?= e(__('portal.title')) ?>
        </p>
      </div>

      <!-- Mobile view (< 640px) -->
      <div class="min-w-0 flex sm:hidden flex-col justify-center">
        <h1 class="text-[10px] min-[380px]:text-[11px] font-extrabold tracking-tight uppercase text-slate-100 leading-tight m-0">
          PT MINDA AUTOMOTIVE INDONESIA
        </h1>
        <p class="text-[8.5px] min-[380px]:text-[9.5px] text-emerald-400 font-mono tracking-wide uppercase leading-tight mt-0.5 m-0">
          Portal K3 &amp; Sistem SLA
        </p>
      </div>
    </a>

    <!-- Live Clock & Navigation Items (Desktop >= 1024px) -->
    <div class="hidden lg:flex items-center gap-1.5 xl:gap-3 shrink-0 min-w-0">
      <div class="hidden 2xl:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 border border-slate-800 px-2.5 py-1 rounded bg-slate-900/50 shrink-0 whitespace-nowrap">
        <svg class="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2" />
        </svg>
        <span id="live-wib-clock">--:--:-- WIB</span>
      </div>

      <nav class="flex items-center gap-0.5 xl:gap-1 shrink-0">
        <a href="<?= url('/') ?>" class="px-2 xl:px-2.5 py-1.5 rounded-md text-[11px] xl:text-xs font-medium transition-all no-underline whitespace-nowrap <?= $activeTab === 'home' ? 'bg-slate-800 text-slate-100 shadow border border-slate-700' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40' ?>">
          <?= e(__('nav.home')) ?>
        </a>
        <a href="<?= url('/tracker') ?>" class="px-2 xl:px-2.5 py-1.5 rounded-md text-[11px] xl:text-xs font-medium transition-all no-underline whitespace-nowrap <?= $activeTab === 'report' ? 'bg-slate-800 text-slate-100 shadow border border-slate-700' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40' ?>">
          <?= e(__('nav.report')) ?>
        </a>
        <a href="<?= url('/admin') ?>" class="px-2 xl:px-2.5 py-1.5 rounded-md text-[11px] xl:text-xs font-medium transition-all no-underline whitespace-nowrap <?= $activeTab === 'officer' ? 'bg-slate-800 text-slate-100 shadow border border-slate-700' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40' ?>">
          <?= e(__('nav.officer')) ?>
        </a>
        <a href="<?= url('/workflow') ?>" class="px-2 xl:px-2.5 py-1.5 rounded-md text-[11px] xl:text-xs font-medium transition-all no-underline whitespace-nowrap <?= $activeTab === 'workflow' ? 'bg-slate-800 text-slate-100 shadow border border-slate-700' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40' ?>">
          <?= e(__('nav.workflow')) ?>
        </a>
      </nav>
    </div>

    <!-- Right Controls: Language, Notifications, Auth, Mobile Menu Toggle -->
    <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
      
      <!-- Language Switcher Button (ID / EN) -->
      <div class="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 sm:p-1 shrink-0 shadow-md">
        <a href="?lang=id" class="px-1.5 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-bold transition flex items-center gap-1 no-underline <?= \App\Core\I18n::isIndonesian() ? 'bg-emerald-500 text-slate-950 shadow border border-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60' ?>" title="Bahasa Indonesia">
          <span class="text-xs sm:text-base leading-none select-none">🇮🇩</span>
          <span class="font-mono text-[10px] sm:text-[11px] tracking-wide">ID</span>
        </a>
        <a href="?lang=en" class="px-1.5 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-bold transition flex items-center gap-1 no-underline <?= \App\Core\I18n::isEnglish() ? 'bg-emerald-500 text-slate-950 shadow border border-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60' ?>" title="Corporate Automotive English">
          <span class="text-xs sm:text-base leading-none select-none">🇬🇧</span>
          <span class="font-mono text-[10px] sm:text-[11px] tracking-wide">EN</span>
        </a>
      </div>

      <!-- Notification Bell Dropdown -->
      <div class="relative shrink-0">
        <button id="btn-notification" type="button" class="p-1.5 sm:p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-lg transition relative border border-slate-800 cursor-pointer">
          <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span id="notif-badge" class="hidden absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        </button>

        <!-- Dropdown Menu -->
        <div id="notif-dropdown" class="hidden absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden font-sans">
          <div class="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono"><?= e(__('header.recentNotifs')) ?></span>
            <button id="btn-mark-all-read" class="text-[11px] text-emerald-400 hover:underline cursor-pointer bg-transparent border-0 p-0"><?= e(__('header.markAllRead')) ?></button>
          </div>
          <div id="notif-list" class="max-h-72 overflow-y-auto divide-y divide-slate-800/60 text-xs">
            <div class="p-4 text-center text-slate-500"><?= e(__('header.noNotifs')) ?></div>
          </div>
        </div>
      </div>

      <!-- Officer Profile / Login Button -->
      <?php if ($currentUser): ?>
        <div class="flex items-center gap-2 border-l border-slate-800 pl-2 sm:pl-3">
          <div class="hidden sm:flex flex-col text-right">
            <span class="text-xs font-bold text-slate-200 truncate max-w-[120px]"><?= e($currentUser['name']) ?></span>
            <span class="text-[9px] font-mono text-emerald-400 uppercase"><?= e($currentUser['role']) ?></span>
          </div>
          <a href="<?= url('/logout') ?>" class="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition border border-slate-800 cursor-pointer" title="<?= e(__('header.logout')) ?>">
            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </a>
        </div>
      <?php else: ?>
        <a href="<?= url('/login') ?>" class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-2.5 sm:px-3 py-1.5 rounded-lg text-xs transition shadow border border-emerald-400 no-underline whitespace-nowrap">
          <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          <span><?= e(__('header.officerLogin')) ?></span>
        </a>
      <?php endif; ?>

      <!-- Mobile Menu Toggle Button (< 1024px) -->
      <button id="btn-mobile-menu" type="button" class="lg:hidden p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-lg border border-slate-800 cursor-pointer">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>

    </div>
  </div>

  <!-- Mobile Drawer Menu (< 1024px) -->
  <div id="mobile-drawer" class="hidden lg:hidden border-t border-slate-800/80 bg-slate-950/95 py-3 px-2 flex flex-col gap-1.5 font-sans">
    <a href="<?= url('/') ?>" class="px-3 py-2 rounded-lg text-xs font-semibold no-underline <?= $activeTab === 'home' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-300 hover:bg-slate-900' ?>">
      <?= e(__('nav.home')) ?>
    </a>
    <a href="<?= url('/tracker') ?>" class="px-3 py-2 rounded-lg text-xs font-semibold no-underline <?= $activeTab === 'report' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-300 hover:bg-slate-900' ?>">
      <?= e(__('nav.report')) ?>
    </a>
    <a href="<?= url('/admin') ?>" class="px-3 py-2 rounded-lg text-xs font-semibold no-underline <?= $activeTab === 'officer' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-300 hover:bg-slate-900' ?>">
      <?= e(__('nav.officer')) ?>
    </a>
    <a href="<?= url('/workflow') ?>" class="px-3 py-2 rounded-lg text-xs font-semibold no-underline <?= $activeTab === 'workflow' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-300 hover:bg-slate-900' ?>">
      <?= e(__('nav.workflow')) ?>
    </a>
  </div>
</header>
