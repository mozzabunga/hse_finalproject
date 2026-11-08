<?php
use App\Services\RiskMatrixEvaluator;
?>

<div class="space-y-6">

  <!-- Header Row & Executive PDF Export Button -->
  <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
    <div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-500/30">
          Pengawasan Manajemen HSE
        </span>
        <span class="text-xs text-slate-500 font-mono">&middot; Sesi Terotentikasi</span>
      </div>
      <h2 class="text-lg font-bold text-slate-100 mt-1">Dashboard Metrik & Ringkasan Eksekutif K3</h2>
      <p class="text-xs text-slate-400 mt-0.5">Analisis risiko, performa penyelesaian tiket, dan kepatuhan standar SLA PT Minda Automotive Indonesia.</p>
    </div>

    <a
      href="<?= url('/admin/export-executive-pdf') ?>"
      target="_blank"
      class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50 cursor-pointer shrink-0"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span><?= htmlspecialchars(__('officer.exportExecPdf')) ?></span>
    </a>
  </div>

  <!-- Executive KPI Cards (11 Key Indicators - Mobile-First Responsive Grid) -->
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
    
    <!-- 1. Open Hazards -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
      <span class="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold"><?= htmlspecialchars(__('officer.openReports')) ?></span>
      <p class="text-2xl font-bold font-mono text-amber-400 mt-1"><?= $metrics['openCount'] ?></p>
      <span class="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Tindakan Diperlukan</span>
    </div>

    <!-- 2. Closed Hazards -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
      <span class="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold"><?= htmlspecialchars(__('officer.resolvedReports')) ?></span>
      <p class="text-2xl font-bold font-mono text-emerald-400 mt-1"><?= $metrics['closedCount'] ?></p>
      <span class="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Terverifikasi Selesai</span>
    </div>

    <!-- 3. Avg Resolution Time (in DAYS / HARI) -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
      <span class="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold"><?= htmlspecialchars(__('officer.avgResolution')) ?></span>
      <p class="text-2xl font-bold font-mono text-cyan-300 mt-1"><?= $metrics['avgResolutionDays'] ?> <span class="text-xs text-slate-400 font-normal"><?= htmlspecialchars(__('officer.days')) ?></span></p>
      <span class="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Target &lt; 3.0 <?= htmlspecialchars(__('officer.days')) ?></span>
    </div>

    <!-- 4. SLA Compliance Rate -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
      <span class="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold"><?= htmlspecialchars(__('officer.slaRate')) ?></span>
      <p class="text-2xl font-bold font-mono text-emerald-300 mt-1"><?= $metrics['slaComplianceRate'] ?>%</p>
      <span class="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Target &ge; 95%</span>
    </div>

    <!-- 5. Top Department -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
      <span class="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold"><?= htmlspecialchars(__('officer.topDept')) ?></span>
      <p class="text-sm font-bold text-slate-200 mt-1 truncate" title="<?= htmlspecialchars($metrics['topDepartment']) ?>"><?= htmlspecialchars($metrics['topDepartment']) ?></p>
      <span class="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Volume Tertinggi</span>
    </div>

    <!-- 6. Top Category -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
      <span class="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold"><?= htmlspecialchars(__('officer.topCategory')) ?></span>
      <p class="text-xs font-bold text-slate-200 mt-1 truncate" title="<?= htmlspecialchars($metrics['topCategory']) ?>"><?= htmlspecialchars($metrics['topCategory']) ?></p>
      <span class="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Paling Sering Terjadi</span>
    </div>

    <!-- 7. Pending Validation -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
      <span class="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Pending Validation</span>
      <p class="text-2xl font-bold font-mono text-slate-200 mt-1"><?= $metrics['pendingValidationCount'] ?></p>
      <span class="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Menunggu Review Awal</span>
    </div>

    <!-- 8. Under Review -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
      <span class="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">Under Review</span>
      <p class="text-2xl font-bold font-mono text-blue-300 mt-1"><?= $metrics['underReviewCount'] ?></p>
      <span class="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Dalam Investigasi</span>
    </div>

    <!-- 9. Resolved Today -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
      <span class="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Resolved Today</span>
      <p class="text-2xl font-bold font-mono text-emerald-300 mt-1"><?= $metrics['resolvedTodayCount'] ?></p>
      <span class="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Ditutup 24 Jam Terakhir</span>
    </div>

    <!-- 10. SLA Breaches -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden">
      <span class="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold"><?= htmlspecialchars(__('officer.overdueSla')) ?></span>
      <p class="text-2xl font-bold font-mono mt-1 <?= $metrics['overdueCount'] > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400' ?>">
        <?= $metrics['overdueCount'] ?>
      </p>
      <span class="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">&gt; 3 Hari Belum Tuntas</span>
    </div>

    <!-- 11. Total Hazards Logged -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow text-left relative overflow-hidden col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-2">
      <span class="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold"><?= htmlspecialchars(__('officer.totalReports')) ?></span>
      <p class="text-2xl font-bold font-mono text-slate-100 mt-1"><?= $metrics['totalReports'] ?></p>
      <span class="text-[9px] text-slate-500 font-mono mt-1.5 block border-t border-slate-800/40 pt-1">Akumulasi Database K3 PT Minda</span>
    </div>

  </div>

  <!-- Row 2: 5x5 Risk Matrix & Factory Area Heatmap -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
    
    <!-- 5x5 RISK MATRIX (IK-01) -->
    <div class="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl text-left flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div class="flex items-center gap-1.5">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>5x5 Risk Matrix (IK Pedoman PEP-HSE-P-01-IK-01)</span>
            </h3>
          </div>
          <div class="flex items-center gap-2 text-[10px] font-mono">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Low (1-4)</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Med (5-9)</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-orange-500"></span> High (10-16)</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Extreme (20-25)</span>
          </div>
        </div>
        <p class="text-[11px] text-slate-400 mb-4">Evaluasi Risiko Standar Internal PT MINDA AUTOMOTIVE INDONESIA (IK Pedoman PEP-HSE-P-01-IK-01).</p>

        <!-- 5x5 Table Grid -->
        <div class="overflow-x-auto">
          <div class="min-w-[420px] font-mono text-xs">
            
            <!-- Header Row: Likelihood Labels -->
            <div class="grid grid-cols-6 gap-1 mb-1 text-center text-[10px] text-slate-400 font-bold">
              <div class="p-1 text-left text-[9px] text-slate-500 uppercase">Keparahan \ Peluang</div>
              <div>1: Unlikely</div>
              <div>2: Rarely</div>
              <div>3: Possible</div>
              <div>4: Probable</div>
              <div>5: Certain</div>
            </div>

            <!-- 5 Rows for Severity (5 down to 1) -->
            <?php
            $severityRows = [
              ['s' => 5, 'label' => '5: Fatality (>1)'],
              ['s' => 4, 'label' => '4: Cacat/Fatal(1)'],
              ['s' => 3, 'label' => '3: Cacat LTI'],
              ['s' => 2, 'label' => '2: Ringan LTI'],
              ['s' => 1, 'label' => '1: Ringan (P3K)']
            ];

            foreach ($severityRows as $sRow):
              $s = $sRow['s'];
            ?>
              <div class="grid grid-cols-6 gap-1 mb-1 items-center">
                <div class="text-[9px] font-bold text-slate-400 truncate pr-1">
                  <?= htmlspecialchars($sRow['label']) ?>
                </div>
                <?php
                for ($l = 1; $l <= 5; $l++):
                  $eval = RiskMatrixEvaluator::evaluate($s, $l);
                  $rating = $eval['score'];
                  $riskLevel = $eval['level'];
                  $cellCount = $metrics['riskMatrixCellCounts']["{$s}_{$l}"] ?? 0;

                  $bgClass = 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400';
                  if ($riskLevel === 'Extreme') {
                    $bgClass = $cellCount > 0 ? 'bg-rose-950 border-rose-500 text-rose-300 font-extrabold animate-pulse' : 'bg-rose-950/30 border-rose-500/20 text-rose-500/60';
                  } elseif ($riskLevel === 'High') {
                    $bgClass = $cellCount > 0 ? 'bg-orange-950 border-orange-500 text-orange-300 font-bold' : 'bg-orange-950/30 border-orange-500/20 text-orange-500/60';
                  } elseif ($riskLevel === 'Moderate') {
                    $bgClass = $cellCount > 0 ? 'bg-amber-950 border-amber-500 text-amber-300 font-bold' : 'bg-amber-950/30 border-amber-500/20 text-amber-500/60';
                  } elseif ($cellCount > 0) {
                    $bgClass = 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold';
                  }
                ?>
                  <div
                    class="p-2 rounded border text-center transition <?= $bgClass ?>"
                    title="Keparahan <?= $s ?> x Peluang <?= $l ?> (Skor: <?= $rating ?> <?= $riskLevel ?>) - <?= $cellCount ?> temuan bahaya"
                  >
                    <span class="text-sm block leading-none font-bold"><?= $cellCount ?></span>
                    <span class="text-[8px] opacity-75 block mt-0.5 font-bold">R:<?= $rating ?></span>
                  </div>
                <?php endfor; ?>
              </div>
            <?php endforeach; ?>

          </div>
        </div>
      </div>
    </div>

    <!-- FACTORY AREA & DEPARTMENT HEATMAP -->
    <div class="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl text-left flex flex-col justify-between">
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Peta Konsentrasi Area Pabrik & Departemen</span>
        </h3>
        <p class="text-[11px] text-slate-400 mb-4">Konsentrasi temuan bahaya berdasarkan area fasilitas dan departemen kerja.</p>

        <div class="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          <?php if (empty($metrics['heatmapList'])): ?>
            <p class="text-xs text-slate-600 text-center py-10 font-mono">Belum ada data klaster area</p>
          <?php else: ?>
            <?php
            $maxHeat = $metrics['heatmapList'][0]['count'] ?? 1;
            foreach ($metrics['heatmapList'] as $item):
              $pct = min(100, (int)round(($item['count'] / $maxHeat) * 100));
              $barColor = $item['highestScore'] >= 15 ? 'bg-rose-500' : ($item['highestScore'] >= 8 ? 'bg-amber-500' : 'bg-emerald-500');
            ?>
              <div class="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs font-mono space-y-1">
                <div class="flex items-center justify-between text-slate-200 font-bold">
                  <span class="truncate"><?= htmlspecialchars($item['area']) ?> &middot; <span class="text-slate-400 font-normal"><?= htmlspecialchars($item['dept']) ?></span></span>
                  <span class="text-emerald-400 shrink-0"><?= $item['count'] ?> Laporan</span>
                </div>
                <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div class="h-full rounded-full <?= $barColor ?>" style="width: <?= $pct ?>%;"></div>
                </div>
              </div>
            <?php endforeach; ?>
          <?php endif; ?>
        </div>
      </div>
    </div>

  </div>

  <!-- Row 3: Monthly Trend Chart & Distribution Graphics -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
    
    <!-- Monthly Trend Chart (SVG Standalone) -->
    <div class="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl text-left">
      <div class="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">Tren Insiden Bulanan (Dicatat vs. Ditutup)</h3>
          <p class="text-[11px] text-slate-400">Pantau perbandingan laju laporan baru dan efektivitas verifikasi penutupan K3.</p>
        </div>
        <div class="flex items-center gap-3 text-[10px] font-mono">
          <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-rose-500"></span> Dicatat</span>
          <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-emerald-500"></span> Ditutup</span>
        </div>
      </div>

      <div class="mt-4 h-64 w-full bg-slate-950 rounded-lg p-3 border border-slate-800/80 flex flex-col justify-end">
        <?php
        $trendData = $metrics['monthlyTrend'];
        $maxVal = 1;
        foreach ($trendData as $td) {
            if ($td['created'] > $maxVal) $maxVal = $td['created'];
            if ($td['resolved'] > $maxVal) $maxVal = $td['resolved'];
        }
        ?>
        <div class="grid grid-cols-12 gap-1 items-end h-48 w-full border-b border-slate-800 pb-2">
          <?php foreach ($trendData as $td):
            $cHeight = max(4, (int)round(($td['created'] / $maxVal) * 160));
            $rHeight = max(4, (int)round(($td['resolved'] / $maxVal) * 160));
          ?>
            <div class="flex items-end justify-center gap-0.5 h-full group relative">
              <!-- Created bar -->
              <div
                class="w-2.5 sm:w-3 bg-rose-500 rounded-t transition-all hover:bg-rose-400"
                style="height: <?= $cHeight ?>px;"
                title="<?= $td['month'] ?>: <?= $td['created'] ?> Laporan Baru"
              ></div>
              <!-- Resolved bar -->
              <div
                class="w-2.5 sm:w-3 bg-emerald-500 rounded-t transition-all hover:bg-emerald-400"
                style="height: <?= $rHeight ?>px;"
                title="<?= $td['month'] ?>: <?= $td['resolved'] ?> Laporan Selesai"
              ></div>
            </div>
          <?php endforeach; ?>
        </div>
        <div class="grid grid-cols-12 gap-1 text-center text-[9px] font-mono text-slate-500 pt-2">
          <?php foreach ($trendData as $td): ?>
            <div><?= $td['month'] ?></div>
          <?php endforeach; ?>
        </div>
      </div>
    </div>

    <!-- Department Incident Distribution (SVG Standalone) -->
    <div class="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl text-left">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Distribusi Departemen</h3>
      <p class="text-[11px] text-slate-400 mb-4">Proporsi temuan bahaya berdasarkan struktur organisasi pabrik.</p>

      <div class="mt-4 h-64 w-full bg-slate-950 rounded-lg p-4 border border-slate-800/80 overflow-y-auto space-y-3 font-mono text-xs">
        <?php
        $depMap = $metrics['depMap'];
        arsort($depMap);
        $totalDepHaz = array_sum($depMap) ?: 1;
        if (empty($depMap)): ?>
          <p class="text-slate-600 text-center py-20">Belum ada data departemen</p>
        <?php else:
          foreach ($depMap as $dName => $dCount):
            $pct = (int)round(($dCount / $totalDepHaz) * 100);
        ?>
          <div class="space-y-1">
            <div class="flex items-center justify-between text-slate-300 text-[11px]">
              <span class="truncate"><?= htmlspecialchars($dName) ?></span>
              <span class="text-emerald-400 font-bold"><?= $dCount ?> (<?= $pct ?>%)</span>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
              <div class="h-full bg-emerald-500 rounded-full" style="width: <?= $pct ?>%;"></div>
            </div>
          </div>
        <?php endforeach; endif; ?>
      </div>
    </div>

  </div>

  <!-- Ticket Status Summary Breakdown Table -->
  <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl text-left">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">Ringkasan Status Tiket Sesuai Siklus DFA</h3>
        <p class="text-[11px] text-slate-400">Status operasional tiket di seluruh 8 tahapan Deterministic Finite Automata (DFA).</p>
      </div>
      <a
        href="<?= url('/admin/tickets') ?>"
        class="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
      >
        <span>Kelola Semua Tiket</span>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
      <?php
      $statusLabels = [
        'NewReport'          => ['label' => __('status.NewReport'),          'color' => 'border-blue-500/30 text-blue-400'],
        'PendingValidation'  => ['label' => __('status.PendingValidation'),  'color' => 'border-purple-500/30 text-purple-400'],
        'UnderInvestigation' => ['label' => __('status.UnderInvestigation'), 'color' => 'border-amber-500/30 text-amber-400'],
        'ActionRequired'     => ['label' => __('status.ActionRequired'),     'color' => 'border-orange-500/30 text-orange-400'],
        'WaitingProcurement' => ['label' => __('status.WaitingProcurement'), 'color' => 'border-indigo-500/30 text-indigo-400'],
        'Implementation'     => ['label' => __('status.Implementation'),     'color' => 'border-cyan-500/30 text-cyan-400'],
        'Completed'          => ['label' => __('status.Completed'),          'color' => 'border-emerald-500/30 text-emerald-400'],
        'Resolved'           => ['label' => __('status.Resolved'),           'color' => 'border-emerald-600/50 text-emerald-300 font-bold']
      ];

      foreach ($statusLabels as $stKey => $stMeta):
        $stCount = $metrics['statusMap'][$stKey] ?? 0;
      ?>
        <a
          href="<?= url('/admin/tickets?status=' . urlencode($stKey)) ?>"
          class="bg-slate-950 border <?= $stMeta['color'] ?> p-3 rounded-lg text-center hover:bg-slate-900 transition block group"
        >
          <span class="text-xl font-bold font-mono block text-slate-100 group-hover:scale-110 transition-transform"><?= $stCount ?></span>
          <span class="text-[10px] block mt-1 truncate"><?= htmlspecialchars($stMeta['label']) ?></span>
        </a>
      <?php endforeach; ?>
    </div>
  </div>

</div>
