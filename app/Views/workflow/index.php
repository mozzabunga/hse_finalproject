<div class="space-y-8 text-left w-full max-w-full min-w-0">
  
  <!-- Title Header -->
  <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl relative overflow-hidden w-full max-w-full">
    <div class="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
    <div class="flex items-center gap-2 mb-2">
      <svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <h2 class="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-100">
        <?= htmlspecialchars(__('sop.title')) ?>
      </h2>
    </div>
    <p class="text-xs text-slate-400 max-w-2xl leading-relaxed">
      <?= htmlspecialchars(__('sop.desc')) ?>
    </p>
  </div>

  <!-- Step Workflow 4 Stages -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-4 gap-4 sm:gap-5 w-full max-w-full min-w-0">
    
    <!-- Stage 1 -->
    <div class="bg-slate-900 border border-blue-500/20 text-blue-400 rounded-xl p-4 sm:p-5 shadow flex flex-col justify-between min-w-0 max-w-full w-full overflow-hidden">
      <div class="min-w-0">
        <div class="flex items-center justify-between mb-3 gap-2">
          <div class="bg-slate-950 p-2 rounded-lg border border-slate-800/80 shrink-0">
            <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span class="text-[10px] font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800/50 shrink-0 whitespace-nowrap text-slate-300">
            <?= (App\Core\I18n::getLocale() === 'id' ? 'TAHAP' : 'STAGE') ?> 01
          </span>
        </div>
        <h3 class="text-xs font-bold text-slate-200 break-words"><?= htmlspecialchars(__('sop.stage1Title')) ?></h3>
        <p class="text-[11px] text-slate-400 mt-2 leading-relaxed break-words"><?= htmlspecialchars(__('sop.stage1Desc')) ?></p>
      </div>
    </div>

    <!-- Stage 2 -->
    <div class="bg-slate-900 border border-purple-500/20 text-purple-400 rounded-xl p-4 sm:p-5 shadow flex flex-col justify-between min-w-0 max-w-full w-full overflow-hidden">
      <div class="min-w-0">
        <div class="flex items-center justify-between mb-3 gap-2">
          <div class="bg-slate-950 p-2 rounded-lg border border-slate-800/80 shrink-0">
            <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span class="text-[10px] font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800/50 shrink-0 whitespace-nowrap text-slate-300">
            <?= (App\Core\I18n::getLocale() === 'id' ? 'TAHAP' : 'STAGE') ?> 02
          </span>
        </div>
        <h3 class="text-xs font-bold text-slate-200 break-words"><?= htmlspecialchars(__('sop.stage2Title')) ?></h3>
        <p class="text-[11px] text-slate-400 mt-2 leading-relaxed break-words"><?= htmlspecialchars(__('sop.stage2Desc')) ?></p>
      </div>
    </div>

    <!-- Stage 3 -->
    <div class="bg-slate-900 border border-amber-500/20 text-amber-400 rounded-xl p-4 sm:p-5 shadow flex flex-col justify-between min-w-0 max-w-full w-full overflow-hidden">
      <div class="min-w-0">
        <div class="flex items-center justify-between mb-3 gap-2">
          <div class="bg-slate-950 p-2 rounded-lg border border-slate-800/80 shrink-0">
            <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-[10px] font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800/50 shrink-0 whitespace-nowrap text-slate-300">
            <?= (App\Core\I18n::getLocale() === 'id' ? 'TAHAP' : 'STAGE') ?> 03
          </span>
        </div>
        <h3 class="text-xs font-bold text-slate-200 break-words"><?= htmlspecialchars(__('sop.stage3Title')) ?></h3>
        <p class="text-[11px] text-slate-400 mt-2 leading-relaxed break-words"><?= htmlspecialchars(__('sop.stage3Desc')) ?></p>
      </div>
    </div>

    <!-- Stage 4 -->
    <div class="bg-slate-900 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 sm:p-5 shadow flex flex-col justify-between min-w-0 max-w-full w-full overflow-hidden">
      <div class="min-w-0">
        <div class="flex items-center justify-between mb-3 gap-2">
          <div class="bg-slate-950 p-2 rounded-lg border border-slate-800/80 shrink-0">
            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-[10px] font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800/50 shrink-0 whitespace-nowrap text-slate-300">
            <?= (App\Core\I18n::getLocale() === 'id' ? 'TAHAP' : 'STAGE') ?> 04
          </span>
        </div>
        <h3 class="text-xs font-bold text-slate-200 break-words"><?= htmlspecialchars(__('sop.stage4Title')) ?></h3>
        <p class="text-[11px] text-slate-400 mt-2 leading-relaxed break-words"><?= htmlspecialchars(__('sop.stage4Desc')) ?></p>
      </div>
    </div>

  </div>

  <!-- State Transitions DFA Chart explanation -->
  <div class="grid grid-cols-1 lg:grid-cols-1 2xl:grid-cols-2 gap-6 w-full max-w-full min-w-0">
    
    <!-- DFA Allowed Transitions map -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl min-w-0 max-w-full">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        <span><?= (App\Core\I18n::getLocale() === 'id' ? 'Matriks Alur Status Laporan K3' : 'Deterministic Finite Automaton (DFA) Mappings') ?></span>
      </h3>
      <p class="text-xs text-slate-400 leading-relaxed mb-4">
        <?= (App\Core\I18n::getLocale() === 'id'
          ? 'Status laporan K3 berubah secara berurutan sesuai aturan verifikasi keselamatan kerja untuk memastikan seluruh riwayat tindak lanjut dapat diaudit.'
          : 'Safety tickets cannot undergo random state shifts. Our state verification core enforces high-integrity ticket paths to maintain valid audit trails.') ?>
      </p>

      <div class="space-y-2.5 text-xs font-mono">
        <?php
        $dfaRules = [
          ['current' => 'NewReport',          'next' => __('status.PendingValidation')],
          ['current' => 'PendingValidation',  'next' => __('status.UnderInvestigation')],
          ['current' => 'UnderInvestigation', 'next' => __('status.ActionRequired') . ', ' . __('status.WaitingProcurement') . ', ' . __('status.Implementation') . ', ' . __('status.Completed')],
          ['current' => 'ActionRequired',     'next' => __('status.WaitingProcurement') . ', ' . __('status.Implementation') . ', ' . __('status.Completed')],
          ['current' => 'WaitingProcurement', 'next' => __('status.Implementation') . ', ' . __('status.Completed')],
          ['current' => 'Implementation',     'next' => __('status.Completed') . ', ' . __('status.UnderInvestigation')],
          ['current' => 'Completed',          'next' => __('status.Resolved')],
          ['current' => 'Resolved',           'next' => (App\Core\I18n::getLocale() === 'id' ? 'Selesai (Final State)' : 'Resolved (Final State)')]
        ];
        foreach ($dfaRules as $rule): ?>
          <div class="bg-slate-950 px-3 py-2.5 border border-slate-800 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 min-w-0 max-w-full">
            <span class="text-slate-300 font-bold shrink-0 text-xs"><?= htmlspecialchars(__('status.' . $rule['current'])) ?></span>
            <div class="flex items-center gap-1.5 sm:justify-end min-w-0 flex-1 max-w-full">
              <svg class="w-3 h-3 text-slate-600 shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <span class="text-emerald-400/90 text-[11px] font-semibold sm:text-right break-words min-w-0"><?= htmlspecialchars($rule['next']) ?></span>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>

    <!-- Hazard Classifications -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl flex flex-col justify-between min-w-0 max-w-full">
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span><?= (App\Core\I18n::getLocale() === 'id' ? 'Klasifikasi Bahaya K3 Manufaktur' : 'Safety Hazard Classifications') ?></span>
        </h3>

        <div class="space-y-4">
          <?php
          $classifications = [
            [
              'class' => 'A',
              'name'  => (App\Core\I18n::getLocale() === 'id' ? 'K3 / Alat Pelindung Diri (APD)' : 'Safety / APD / PPE'),
              'desc'  => (App\Core\I18n::getLocale() === 'id' ? 'Pelanggaran penggunaan APD (helm, sepatu safety, kacamata), potensi bahaya terpeleset, atau keselamatan kerja langsung. Ditugaskan ke HRGA Admin.' : 'Critical life safety protections. Missing helmets, safety boots, safety harness bypasses, or floor sliding hazards. Assigned immediately to HRGA Admin.'),
              'color' => 'text-rose-400 border-rose-500/20 bg-rose-500/5'
            ],
            [
              'class' => 'B',
              'name'  => (App\Core\I18n::getLocale() === 'id' ? 'Lingkungan Kerja & Bahan Berbahaya' : 'Environmental Compliance'),
              'desc'  => (App\Core\I18n::getLocale() === 'id' ? 'Kebocoran bahan kimia, limbah B3, emisi asap mesin, atau genangan oli di lantai produksi. Ditugaskan ke Asep Permana.' : 'Resource leakages, chemical drum spillage, smoke emissions, toxic materials handling issues, or hydraulic leaks. Assigned immediately to Asep Permana.'),
              'color' => 'text-amber-400 border-amber-500/20 bg-amber-500/5'
            ],
            [
              'class' => 'C',
              'name'  => (App\Core\I18n::getLocale() === 'id' ? 'Mekanikal, Kelistrikan & Fasilitas' : 'General Maintenance & Floor'),
              'desc'  => (App\Core\I18n::getLocale() === 'id' ? 'Kabel terkelupas, mesin rusak, penerangan kurang, kerusakan pagar pengaman, atau komponen fisik. Ditugaskan ke Purwanto.' : 'Broken locks, frayed machinery wires, ventilation faults, damaged facility panels, or cracked walls. Assigned immediately to Purwanto.'),
              'color' => 'text-blue-400 border-blue-500/20 bg-blue-500/5'
            ]
          ];
          foreach ($classifications as $c): ?>
            <div class="p-3.5 border rounded-lg flex items-start gap-3 text-xs min-w-0 max-w-full <?= $c['color'] ?>">
              <span class="text-base font-black font-mono shrink-0 bg-slate-950 w-7 h-7 rounded border border-slate-800/80 flex items-center justify-center text-slate-100"><?= $c['class'] ?></span>
              <div class="min-w-0 flex-1">
                <h4 class="font-bold break-words"><?= htmlspecialchars($c['name']) ?></h4>
                <p class="text-slate-400 mt-1 leading-relaxed text-[11px] break-words"><?= htmlspecialchars($c['desc']) ?></p>
              </div>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
    </div>

  </div>

</div>
