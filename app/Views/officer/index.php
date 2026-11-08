<?php
$isHseAdmin = ($currentUser['role'] ?? '') === 'hse_admin';
$roleLabels = [
    'hse_admin'             => 'HSE Administrator Lead',
    'hse_officer'           => 'Safety Officer Inspector',
    'ppe_officer'           => 'PPE & Safety Equipment Officer',
    'hrga_admin'            => 'HRGA & Facilities Admin',
    'env_officer'           => 'Environmental & 5S Officer',
    'management_supervisor' => 'Supervisor HSE (Management)',
    'management_director'   => 'President Director (Executive Read-Only)',
    'employee'              => 'Employee'
];
$displayRole = $roleLabels[$currentUser['role'] ?? ''] ?? ($currentUser['role'] ?? 'Petugas');
?>

<div class="space-y-6 text-left w-full max-w-full min-w-0" id="officer-portal-root">

  <!-- Officer Session Top Banner -->
  <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
    <div class="flex items-center gap-3 min-w-0">
      <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h2 class="text-sm font-bold text-slate-100 truncate"><?= htmlspecialchars($currentUser['name'] ?? 'Petugas HSE') ?></h2>
          <span class="text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded uppercase tracking-wider">
            <?= htmlspecialchars($displayRole) ?>
          </span>
          <?php if (($currentUser['role'] ?? '') === 'management_director'): ?>
            <span class="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
              Read-Only
            </span>
          <?php endif; ?>
        </div>
        <p class="text-xs text-slate-400 truncate mt-0.5">
          <?= htmlspecialchars($currentUser['email'] ?? '') ?> &middot; Dept: <span class="text-slate-300 font-medium"><?= htmlspecialchars($currentUser['department_id'] ?? 'HSE') ?></span>
        </p>
      </div>
    </div>

    <!-- Right Controls: Logout & Portal Switcher -->
    <div class="flex items-center gap-2 shrink-0">
      <a
        href="<?= url('/') ?>"
        class="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Portal Karyawan</span>
      </a>
      <a
        href="<?= url('/logout') ?>"
        class="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        onclick="return confirm('Apakah Anda yakin ingin keluar dari Portal Petugas?');"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>Keluar</span>
      </a>
    </div>
  </div>

  <!-- Subtabs Navigation Bar -->
  <div class="bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow overflow-x-auto">
    <div class="flex items-center gap-1.5 min-w-max">
      
      <!-- Tab 1: Dashboard -->
      <a
        href="<?= url('/admin') ?>"
        class="px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition <?= $activeSubtab === 'dashboard' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' ?>"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span><?= htmlspecialchars(__('officer.tabDashboard')) ?></span>
      </a>

      <!-- Tab 2: Tickets -->
      <a
        href="<?= url('/admin/tickets') ?>"
        class="px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition <?= $activeSubtab === 'tickets' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' ?>"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <span><?= htmlspecialchars(__('officer.tabTickets')) ?></span>
      </a>

      <!-- Tab 3: Recipients (Restricted to hse_admin) -->
      <?php if ($isHseAdmin): ?>
        <a
          href="<?= url('/admin/recipients') ?>"
          class="px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition <?= $activeSubtab === 'recipients' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' ?>"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span><?= htmlspecialchars(__('officer.tabRecipients')) ?></span>
        </a>
      <?php else: ?>
        <span class="px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 text-slate-600 cursor-not-allowed" title="Akses khusus Administrator HSE">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <span><?= htmlspecialchars(__('officer.tabRecipients')) ?></span>
        </span>
      <?php endif; ?>

      <!-- Tab 4: Templates (Restricted to hse_admin) -->
      <?php if ($isHseAdmin): ?>
        <a
          href="<?= url('/admin/templates') ?>"
          class="px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition <?= $activeSubtab === 'templates' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' ?>"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span><?= htmlspecialchars(__('officer.tabTemplates')) ?></span>
        </a>
      <?php else: ?>
        <span class="px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 text-slate-600 cursor-not-allowed" title="Akses khusus Administrator HSE">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <span><?= htmlspecialchars(__('officer.tabTemplates')) ?></span>
        </span>
      <?php endif; ?>

      <!-- Tab 5: Weekly Reports -->
      <a
        href="<?= url('/admin/weekly') ?>"
        class="px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition <?= $activeSubtab === 'weekly' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' ?>"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span><?= htmlspecialchars(__('officer.tabWeekly')) ?></span>
      </a>

      <!-- Tab 6: SLA Escalation (Restricted to hse_admin) -->
      <?php if ($isHseAdmin): ?>
        <a
          href="<?= url('/admin/sla') ?>"
          class="px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition <?= $activeSubtab === 'sla' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' ?>"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span><?= htmlspecialchars(__('officer.tabSla')) ?></span>
        </a>
      <?php endif; ?>

      <!-- Tab 7: Logs -->
      <a
        href="<?= url('/admin/logs') ?>"
        class="px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition <?= $activeSubtab === 'logs' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' ?>"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span><?= htmlspecialchars(__('officer.tabLogs')) ?></span>
      </a>

    </div>
  </div>

  <!-- Subtab Content Injection -->
  <?php
    if ($activeSubtab === 'dashboard') {
        require __DIR__ . '/subtabs/dashboard.php';
    } elseif ($activeSubtab === 'tickets') {
        require __DIR__ . '/subtabs/tickets.php';
    } else {
        echo '<div class="p-8 text-center text-slate-400 font-mono text-xs bg-slate-900 border border-slate-800 rounded-xl">Subtab dalam proses pemuatan...</div>';
    }
  ?>

</div>
