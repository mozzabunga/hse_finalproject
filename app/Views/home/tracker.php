<?php
$searchQuery = $searchQuery ?? '';
$results = $results ?? [];
$selectedReport = $selectedReport ?? null;
$parsed = $parsed ?? ($selectedReport ? \App\Services\HazardPresentation::parseDetails($selectedReport) : null);
$comments = $comments ?? [];
$risk = $risk ?? ($selectedReport ? \App\Services\RiskMatrixEvaluator::evaluate((int)($selectedReport['severity'] ?? 2), (int)($selectedReport['likelihood'] ?? 2)) : null);

$timelineStages = [
    ['status' => 'NewReport', 'label' => __('stage.NewReport'), 'desc' => 'Registered from Portal / Forms'],
    ['status' => 'PendingValidation', 'label' => __('stage.PendingValidation'), 'desc' => 'Assigned HSE Officer for site check'],
    ['status' => 'UnderInvestigation', 'label' => __('stage.UnderInvestigation'), 'desc' => 'Assessing corrective action SLA'],
    ['status' => 'ActionRequired', 'label' => __('stage.ActionRequired'), 'desc' => 'Maintenance / Procurement active'],
    ['status' => 'WaitingProcurement', 'label' => __('stage.WaitingProcurement'), 'desc' => 'Purchasing PO / Vendor / Materials'],
    ['status' => 'Implementation', 'label' => __('stage.Implementation'), 'desc' => 'Repair / Installation in progress'],
    ['status' => 'Completed', 'label' => __('stage.Completed'), 'desc' => 'Remediation work completed'],
    ['status' => 'Resolved', 'label' => __('stage.Resolved'), 'desc' => 'HSE Coordinator audited & closed'],
];

function getStatusBadgeStyle(string $status): string {
    return match ($status) {
        'NewReport'          => 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'PendingValidation'  => 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        'UnderInvestigation' => 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        'ActionRequired'     => 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        'WaitingProcurement' => 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        'Implementation'     => 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        'Completed'          => 'bg-teal-500/10 text-teal-400 border-teal-500/20',
        'Resolved'           => 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        default              => 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };
}

function highlightMatch(string $text, string $query): string {
    if ($query === '') {
        return htmlspecialchars($text);
    }
    $pattern = '/' . preg_quote($query, '/') . '/i';
    return preg_replace_callback($pattern, function($matches) {
        return '<mark class="bg-emerald-500 text-slate-950 font-semibold rounded px-0.5">' . htmlspecialchars($matches[0]) . '</mark>';
    }, htmlspecialchars($text));
}

function getStageIndex(string $status, array $stages): int {
    foreach ($stages as $idx => $s) {
        if ($s['status'] === $status) return $idx;
    }
    return 0;
}
?>

<div class="w-full max-w-5xl mx-auto space-y-6 font-sans relative min-w-0 px-3 sm:px-6 py-6 sm:py-8">
  
  <!-- Back Button -->
  <a href="<?= url('/') ?>" class="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition no-underline">
    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
    <span><?= \App\Core\I18n::isIndonesian() ? 'Kembali ke menu utama' : 'Back to main menu' ?></span>
  </a>

  <!-- Search Card -->
  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-8 shadow-2xl text-left space-y-5 sm:space-y-6">
    <div class="border-b border-slate-800 pb-4">
      <h2 class="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 m-0">
        <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span><?= e(__('track.searchTitle')) ?></span>
      </h2>
      <p class="text-xs text-slate-400 mt-1.5 leading-relaxed m-0">
        <?= e(__('track.searchDesc')) ?>
      </p>
    </div>

    <!-- Search Form -->
    <form action="<?= url('/tracker') ?>" method="GET" class="flex flex-col sm:flex-row gap-2.5">
      <input
        type="text"
        name="q"
        required
        placeholder="<?= e(__('track.placeholder')) ?>"
        value="<?= e($searchQuery) ?>"
        class="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-sans min-h-[44px]"
      />
      <button
        type="submit"
        class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow shadow-emerald-500/10 cursor-pointer shrink-0 min-h-[44px] border-0"
      >
        <span><?= e(__('track.searchBtn')) ?></span>
      </button>
    </form>

    <!-- Guidelines Box (When not searching) -->
    <?php if (empty($searchQuery)): ?>
      <div class="bg-slate-950 p-4 border border-slate-850/60 rounded-xl space-y-3">
        <h4 class="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 m-0">
          <?= e(__('track.guidelinesTitle')) ?>
        </h4>
        <ul class="space-y-2 text-xs text-slate-400 leading-relaxed list-none m-0 p-0">
          <li class="flex items-start gap-2">
            <span class="text-emerald-400 font-mono mt-0.5">•</span>
            <span><?= e(__('track.guidelineTicket')) ?></span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-emerald-400 font-mono mt-0.5">•</span>
            <span><?= e(__('track.guidelineKeyword')) ?></span>
          </li>
        </ul>
      </div>
    <?php endif; ?>

    <!-- Results List -->
    <?php if (!empty($searchQuery)): ?>
      <div class="space-y-4 pt-2">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 m-0">
            <?= e(__('track.results')) ?> (<?= count($results) ?>)
          </h3>
          <span class="text-[10px] text-slate-500">Query: "<?= e($searchQuery) ?>"</span>
        </div>

        <?php if (empty($results)): ?>
          <div class="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-850/60">
            <svg class="w-8 h-8 text-rose-500/60 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-xs font-semibold text-slate-300 m-0"><?= e(__('track.noResults')) ?></p>
            <p class="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed m-0">
              <?= e(__('track.noResultsDesc')) ?>
            </p>
          </div>
        <?php else: ?>
          <div class="grid grid-cols-1 gap-3 max-h-[360px] overflow-y-auto pr-1">
            <?php foreach ($results as $report): 
              $p = \App\Services\HazardPresentation::parseDetails($report);
              $isSelected = $selectedReport && $selectedReport['id'] === $report['id'];
            ?>
              <a
                href="<?= url('/tracker/' . urlencode($report['ticket_id'])) ?>?q=<?= urlencode($searchQuery) ?>"
                class="p-4 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-underline <?= $isSelected ? 'bg-slate-800/80 border-emerald-500/40 ring-1 ring-emerald-500/20' : 'bg-slate-950/40 border-slate-850 hover:border-slate-700 hover:bg-slate-900/10' ?>"
              >
                <div class="min-w-0 space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-emerald-400"><?= highlightMatch($report['ticket_id'], $searchQuery) ?></span>
                    <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-bold uppercase">
                      <?= e($p['categoryBadge']) ?><?= $report['department'] ? ' • ' . e($report['department']) : '' ?>
                    </span>
                  </div>
                  <h4 class="text-xs sm:text-sm font-bold text-slate-100 truncate m-0"><?= highlightMatch($p['summary'], $searchQuery) ?></h4>
                  <div class="flex items-center gap-3 text-[10px] text-slate-500 font-mono pt-0.5">
                    <span>Dept: <strong class="text-slate-400"><?= e($report['department'] ?: '-') ?></strong></span>
                    <span>&middot;</span>
                    <span><?= \App\Core\I18n::isIndonesian() ? 'Pelapor' : 'Reporter' ?>: <strong class="text-slate-400"><?= highlightMatch($report['reporter_name'] ?: 'Anonymous', $searchQuery) ?></strong></span>
                  </div>
                </div>
                <div class="shrink-0 flex items-center gap-2">
                  <span class="text-[10px] font-semibold font-mono border px-2.5 py-1 rounded-full <?= getStatusBadgeStyle($report['status']) ?>">
                    <?= e(__('status.' . $report['status'])) ?>
                  </span>
                </div>
              </a>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </div>
    <?php endif; ?>
  </div>

  <!-- Detailed Ticket Progress View -->
  <?php if ($selectedReport && $parsed): 
    $currentStageIdx = getStageIndex($selectedReport['status'], $timelineStages);
  ?>
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-left space-y-6 w-full max-w-full min-w-0" id="report-timeline-tracker">
      
      <!-- Header info -->
      <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div class="space-y-1.5 max-w-xl">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded">
              <?= e($selectedReport['ticket_id']) ?>
            </span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-bold uppercase tracking-wider">
              <?= e($parsed['categoryBadge']) ?><?= $selectedReport['department'] ? ' • ' . e($selectedReport['department']) : '' ?>
            </span>
            <?php if (!empty($selectedReport['area'])): ?>
              <span class="text-xs text-slate-400 font-mono">
                &middot; <?= e($selectedReport['area']) ?>
              </span>
            <?php endif; ?>
          </div>
          <h3 class="text-base sm:text-lg font-bold text-slate-100 mt-1 leading-snug m-0">
            <?= e($parsed['summary']) ?>
          </h3>
        </div>

        <span class="text-[10px] font-semibold font-mono border px-3 py-1 rounded-full <?= getStatusBadgeStyle($selectedReport['status']) ?>">
          <?= e(__('status.' . $selectedReport['status'])) ?>
        </span>
      </div>

      <!-- Submitted Finding Narrative & Structured Metadata -->
      <div class="bg-slate-950 p-5 border border-slate-850/80 rounded-xl text-xs space-y-4">
        <?php if (!empty($parsed['hazardDescription'])): ?>
          <div class="space-y-1">
            <span class="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold block">
              <?= \App\Core\I18n::isIndonesian() ? 'Detail Temuan / Deskripsi Bahaya' : 'Finding Details / Description' ?>
            </span>
            <p class="text-slate-200 leading-relaxed font-sans whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-850 m-0">
              <?= e($parsed['hazardDescription']) ?>
            </p>
          </div>
        <?php endif; ?>

        <!-- Structured Metadata Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-[11px] font-mono">
          <?php if (!empty($parsed['currentCondition'])): ?>
            <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
              <span class="text-[9px] text-slate-500 uppercase block"><?= \App\Core\I18n::isIndonesian() ? 'Kondisi Lapor' : 'Reported Condition' ?></span>
              <span class="text-slate-200 font-semibold block"><?= e($parsed['currentCondition']) ?></span>
            </div>
          <?php endif; ?>

          <?php if (!empty($parsed['injuryStatus'])): ?>
            <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
              <span class="text-[9px] text-slate-500 uppercase block"><?= \App\Core\I18n::isIndonesian() ? 'Status Korban' : 'Injury Status' ?></span>
              <span class="text-slate-200 font-semibold block"><?= e($parsed['injuryStatus']) ?></span>
            </div>
          <?php endif; ?>

          <?php if (!empty($parsed['potentialImpact'])): ?>
            <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
              <span class="text-[9px] text-slate-500 uppercase block"><?= \App\Core\I18n::isIndonesian() ? 'Potensi Dampak' : 'Potential Impact' ?></span>
              <span class="text-amber-300 font-semibold block"><?= e($parsed['potentialImpact']) ?></span>
            </div>
          <?php endif; ?>

          <?php if (!empty($parsed['immediateAction'])): ?>
            <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
              <span class="text-[9px] text-slate-500 uppercase block"><?= \App\Core\I18n::isIndonesian() ? 'Tindakan Sementara' : 'Immediate Action' ?></span>
              <span class="text-slate-200 font-semibold block"><?= e($parsed['immediateAction']) ?></span>
            </div>
          <?php endif; ?>

          <?php if (!empty($parsed['improvementSuggestion'])): ?>
            <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
              <span class="text-[9px] text-slate-500 uppercase block"><?= \App\Core\I18n::isIndonesian() ? 'Saran Perbaikan' : 'Suggestion' ?></span>
              <span class="text-slate-200 font-semibold block"><?= e($parsed['improvementSuggestion']) ?></span>
            </div>
          <?php endif; ?>

          <?php if (!empty($selectedReport['area'])): ?>
            <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
              <span class="text-[9px] text-slate-500 uppercase block"><?= \App\Core\I18n::isIndonesian() ? 'Area' : 'Area' ?></span>
              <span class="text-slate-200 font-semibold block"><?= e($selectedReport['area']) ?></span>
            </div>
          <?php endif; ?>

          <?php if (!empty($selectedReport['created_at'])): ?>
            <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
              <span class="text-[9px] text-slate-500 uppercase block"><?= \App\Core\I18n::isIndonesian() ? 'Tanggal Lapor' : 'Date Submitted' ?></span>
              <span class="text-slate-200 font-semibold block"><?= \App\Services\DateFormatter::formatWibDate($selectedReport['created_at']) ?></span>
            </div>
          <?php endif; ?>

          <?php if (!empty($selectedReport['assigned_pic_name'])): ?>
            <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
              <span class="text-[9px] text-slate-500 uppercase block"><?= \App\Core\I18n::isIndonesian() ? 'Petugas PIC' : 'Assigned Officer' ?></span>
              <span class="text-slate-200 font-semibold block"><?= e($selectedReport['assigned_pic_name']) ?></span>
            </div>
          <?php endif; ?>
        </div>
      </div>

      <!-- Photographic Evidence -->
      <?php if (!empty($selectedReport['photo_evidence_url'])): ?>
        <div class="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-2">
          <span class="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold block">
            <?= \App\Core\I18n::isIndonesian() ? 'Foto Bukti Temuan K3' : 'Photographic Evidence' ?>
          </span>
          <div class="max-w-md rounded-lg overflow-hidden border border-slate-800">
            <img src="<?= e($selectedReport['photo_evidence_url']) ?>" alt="Bukti Foto K3" class="w-full h-auto object-cover max-h-80" />
          </div>
        </div>
      <?php endif; ?>

      <!-- IK-01 Risk Evaluation Card -->
      <?php if ($risk): ?>
        <div class="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
          <div class="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-2.5">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span class="text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                Evaluasi Risiko K3 (IK Pedoman PEP-HSE-P-01-IK-01)
              </span>
            </div>
            <span class="px-2.5 py-0.5 rounded font-bold border uppercase <?= $risk['badgeClass'] ?>">
              <?= e($risk['label']) ?> Risk Level
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
            <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-500 uppercase block">Keparahan (Severity)</span>
              <span class="font-bold text-slate-200 block mt-0.5">Sev <?= $risk['severity'] ?>: <?= e(\App\Services\RiskMatrixEvaluator::SEVERITY_DEFINITIONS[$risk['severity']]['title']) ?></span>
              <span class="text-[10px] text-slate-400 block mt-0.5"><?= e(\App\Services\RiskMatrixEvaluator::SEVERITY_DEFINITIONS[$risk['severity']]['short']) ?></span>
            </div>

            <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-500 uppercase block">Probabilitas (Likelihood)</span>
              <span class="font-bold text-slate-200 block mt-0.5">Like <?= $risk['likelihood'] ?>: <?= e(\App\Services\RiskMatrixEvaluator::LIKELIHOOD_DEFINITIONS[$risk['likelihood']]['title']) ?></span>
              <span class="text-[10px] text-slate-400 block mt-0.5"><?= e(\App\Services\RiskMatrixEvaluator::LIKELIHOOD_DEFINITIONS[$risk['likelihood']]['short']) ?></span>
            </div>

            <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
              <div>
                <span class="text-[10px] text-slate-500 uppercase block">Hasil Titik Temu Matriks</span>
                <span class="font-extrabold text-emerald-400 text-sm block mt-0.5"><?= $risk['score'] ?> (<?= e($risk['level']) ?>)</span>
              </div>
              <?php if ($risk['isOtpRequired']): ?>
                <span class="mt-1 text-[9px] text-rose-400 font-bold uppercase tracking-wider block">Wajib Objective Target Program (OTP)</span>
              <?php endif; ?>
            </div>
          </div>

          <?php if (!empty($selectedReport['additional_control'])): ?>
            <div class="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-slate-300 space-y-0.5">
              <span class="text-[10px] text-emerald-400 font-bold uppercase block">Rencana Pengendalian Tambahan:</span>
              <p class="font-sans leading-relaxed m-0"><?= e($selectedReport['additional_control']) ?></p>
            </div>
          <?php endif; ?>
        </div>
      <?php endif; ?>

      <!-- 8-Stage Timeline Stepper -->
      <div class="space-y-4">
        <h4 class="text-xs font-mono font-bold tracking-wider uppercase text-slate-400 m-0">
          <?= e(__('track.timelineTitle')) ?>
        </h4>

        <div class="relative pt-2 pl-4 sm:pl-0">
          <!-- Stepper bar background -->
          <div class="absolute left-[23px] sm:left-1/2 top-4 bottom-4 w-0.5 bg-slate-800 -translate-x-1/2"></div>
          
          <!-- Stepper active bar foreground -->
          <div 
            class="absolute left-[23px] sm:left-1/2 top-4 w-0.5 bg-emerald-500 -translate-x-1/2 transition-all duration-500" 
            style="height: <?= max(0, ($currentStageIdx / (count($timelineStages) - 1)) * 90) ?>%;"
          ></div>

          <div class="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-1 gap-6 relative">
            <?php foreach ($timelineStages as $idx => $stage): 
              $isCompleted = $idx <= $currentStageIdx;
              $isActive = $idx === $currentStageIdx;
            ?>
              <div class="flex flex-row sm:items-center gap-4 sm:gap-6 relative z-10 <?= $isActive ? 'opacity-100' : ($isCompleted ? 'opacity-80' : 'opacity-40') ?>">
                
                <!-- Description on Left (Desktop) -->
                <div class="sm:w-1/2 sm:text-right hidden sm:block">
                  <span class="text-[10px] font-mono text-slate-500 uppercase"><?= e($stage['desc']) ?></span>
                </div>

                <!-- Center Marker Circle -->
                <div class="flex justify-center items-center shrink-0">
                  <div class="w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-300 <?= $isActive ? 'bg-emerald-500/10 border-emerald-500 ring-4 ring-emerald-500/20' : ($isCompleted ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-950 border-slate-800') ?>">
                    <?php if ($isCompleted && !$isActive): ?>
                      <svg class="w-2.5 h-2.5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    <?php elseif ($isActive): ?>
                      <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    <?php endif; ?>
                  </div>
                </div>

                <!-- Label on Right -->
                <div class="sm:w-1/2 text-left">
                  <h5 class="text-xs font-bold text-slate-200 flex items-center gap-1.5 m-0">
                    <span><?= e($stage['label']) ?></span>
                    <?php if ($isActive): ?>
                      <span class="text-[8px] font-mono font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                        <?= e(__('track.currentStage')) ?>
                      </span>
                    <?php endif; ?>
                  </h5>
                  <p class="text-[10px] text-slate-500 sm:hidden mt-0.5 m-0"><?= e($stage['desc']) ?></p>
                </div>

              </div>
            <?php endforeach; ?>
          </div>
        </div>
      </div>

      <!-- Public Comments & Action Logs -->
      <div class="space-y-4 border-t border-slate-800/60 pt-6">
        <h4 class="text-xs font-mono font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5 m-0">
          <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span><?= e(__('track.updatesTitle')) ?> (<?= count($comments) ?>)</span>
        </h4>

        <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
          <?php if (empty($comments)): ?>
            <p class="text-xs text-slate-500 italic py-4 text-center bg-slate-950/20 border border-slate-850/40 rounded-xl m-0">
              <?= e(__('track.noComments')) ?>
            </p>
          <?php else: ?>
            <?php foreach ($comments as $c): ?>
              <div class="bg-slate-950 p-3 border border-slate-850 rounded-xl space-y-1.5">
                <div class="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span class="font-bold text-slate-300"><?= e($c['user_name']) ?> (<?= e($c['user_role']) ?>)</span>
                  <span><?= \App\Services\DateFormatter::formatWibDateTime($c['created_at']) ?></span>
                </div>
                <p class="text-slate-300 text-xs font-sans leading-relaxed m-0 whitespace-pre-wrap">
                  <?= e($c['comment']) ?>
                </p>
              </div>
            <?php endforeach; ?>
          <?php endif; ?>
        </div>

        <!-- Add Comment Form -->
        <form action="<?= url('/tracker/' . urlencode($selectedReport['ticket_id']) . '/comment') ?>" method="POST" class="pt-2 flex gap-2">
          <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>" />
          <input
            type="text"
            name="comment"
            required
            placeholder="<?= \App\Core\I18n::isIndonesian() ? 'Tulis tanggapan atau pertanyaan terkait tiket...' : 'Write an update or question regarding this ticket...' ?>"
            class="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 border-0"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span><?= \App\Core\I18n::isIndonesian() ? 'Kirim' : 'Send' ?></span>
          </button>
        </form>
      </div>

      <!-- K3 Advisory Disclaimer -->
      <div class="bg-slate-950/50 border border-slate-850/60 p-4 rounded-xl text-[10px] text-slate-500 leading-relaxed font-mono">
        🔒 <b><?= e(__('track.k3Advisory')) ?></b>
      </div>

    </div>
  <?php endif; ?>

</div>
