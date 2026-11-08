<?php

use App\Core\Policy;
use App\Services\DateFormatter;
use App\Services\DFAValidationEngine;
use App\Services\RiskMatrixEvaluator;

$isHseAdmin = Policy::isHseAdmin($currentUser);
$isReadOnly = Policy::isReadOnly($currentUser);

$departments = [
    'Production', 'Maintenance', 'Quality', 'Warehouse',
    'PPIC', 'HRGA', 'HSE', 'Finance', 'Engineering'
];

$hazardStatuses = [
    'NewReport', 'PendingValidation', 'UnderInvestigation',
    'ActionRequired', 'WaitingProcurement', 'Implementation',
    'Completed', 'Resolved'
];

$hierarchyOfControls = [
    ['id' => 'elimination', 'title' => '1. Eliminasi', 'desc' => 'Menghilangkan sumber bahaya secara total dari area kerja.'],
    ['id' => 'substitution', 'title' => '2. Substitusi', 'desc' => 'Mengganti alat/bahan/proses yang berbahaya dengan alternatif yang lebih aman.'],
    ['id' => 'engineering', 'title' => '3. Rekayasa Teknik', 'desc' => 'Isolasi bahaya, pemasangan sensor, interlock, penutup mesin, atau peredam.'],
    ['id' => 'administrative', 'title' => '4. Administrasi', 'desc' => 'SOP, pelatihan K3, rotasi kerja, rambu keselamatan, & jadwal perawatan.'],
    ['id' => 'ppe', 'title' => '5. APD (Alat Pelindung Diri)', 'desc' => 'Penggunaan APD wajib (Helm, Sepatu Safety, Kacamata, Harness, Sarung Tangan).']
];
?>

<div class="space-y-4 text-left w-full">

  <!-- Success & Error Flash Messages -->
  <?php if (!empty($successMessage)): ?>
    <div class="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
      <svg class="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span><?= htmlspecialchars($successMessage) ?></span>
    </div>
  <?php endif; ?>

  <?php if (!empty($errorMessage)): ?>
    <div class="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs flex items-center gap-2">
      <svg class="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span><?= htmlspecialchars($errorMessage) ?></span>
    </div>
  <?php endif; ?>

  <!-- Main Grid: Left Column Ledger + Right Column Detail -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

    <!-- ========================================================================= -->
    <!-- LEFT COLUMN: TICKETS LEDGER (5 cols)                                     -->
    <!-- ========================================================================= -->
    <div class="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-left flex flex-col gap-4">
      
      <!-- Top Bar: Title, Count, Search & Filter Toggles -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span>Safety Tickets Ledger</span>
          </h3>
          <span class="text-[10px] font-mono text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            <?= count($filteredReports) ?> Shown
          </span>
        </div>

        <!-- Search Bar & Filters Button -->
        <form method="GET" action="<?= url('/admin/tickets') ?>" class="flex flex-wrap items-center gap-1.5" id="ticket-search-form">
          <input type="hidden" name="showFilters" id="show-filters-input" value="<?= $filters['showFilters'] ? '1' : '0' ?>">
          <?php if (!empty($selectedReport['id'])): ?>
            <input type="hidden" name="id" value="<?= htmlspecialchars($selectedReport['id']) ?>">
          <?php endif; ?>

          <div class="relative flex-1">
            <svg class="absolute left-2.5 top-2.5 w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              name="searchQuery"
              placeholder="Search Title..."
              value="<?= htmlspecialchars($filters['searchQuery'] ?? '') ?>"
              class="w-full bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded pl-7 pr-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="button"
            onclick="toggleLedgerFilters()"
            class="border text-[10px] font-mono font-bold px-2 py-1.5 rounded flex items-center gap-1 transition cursor-pointer <?= $filters['showFilters'] ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700' ?>"
            title="Advanced Ledger Filters"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Filters</span>
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <button
            type="submit"
            class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[10px] font-mono px-2.5 py-1.5 rounded transition cursor-pointer"
          >
            Apply
          </button>

          <?php if (!empty($filters['searchQuery']) || !empty($filters['searchTicketId']) || !empty($filters['searchEmployeeId']) || !empty($filters['searchReporterName']) || $filters['filterStatus'] !== 'all' || $filters['filterCategory'] !== 'all' || $filters['filterDepartment'] !== 'all' || $filters['dateRangePreset'] !== 'all'): ?>
            <a
              href="<?= url('/admin/tickets') ?>"
              class="bg-rose-950/40 hover:bg-rose-900/40 border border-rose-500/30 text-rose-400 text-[10px] font-mono font-bold p-1.5 rounded transition cursor-pointer flex items-center justify-center"
              title="Reset All Ledger Filters"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </a>
          <?php endif; ?>
        </form>
      </div>

      <!-- Collapsible Advanced Filters Panel inside ledger sidebar -->
      <div id="advanced-filters-panel" class="<?= $filters['showFilters'] ? 'block' : 'hidden' ?> bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-3">
        <form method="GET" action="<?= url('/admin/tickets') ?>" class="space-y-3">
          <input type="hidden" name="showFilters" value="1">
          <input type="hidden" name="searchQuery" value="<?= htmlspecialchars($filters['searchQuery'] ?? '') ?>">
          <?php if (!empty($selectedReport['id'])): ?>
            <input type="hidden" name="id" value="<?= htmlspecialchars($selectedReport['id']) ?>">
          <?php endif; ?>

          <div class="grid grid-cols-2 gap-2.5 text-left">
            <!-- Date Range Preset -->
            <div class="col-span-2">
              <label class="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Date Range</label>
              <select
                name="dateRangePreset"
                id="date-range-preset-select"
                onchange="handleDatePresetChange(this.value)"
                class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all" <?= ($filters['dateRangePreset'] ?? 'all') === 'all' ? 'selected' : '' ?>>All Time</option>
                <option value="last24h" <?= ($filters['dateRangePreset'] ?? '') === 'last24h' ? 'selected' : '' ?>>Last 24 Hours</option>
                <option value="last7d" <?= ($filters['dateRangePreset'] ?? '') === 'last7d' ? 'selected' : '' ?>>Last 7 Days</option>
                <option value="last30d" <?= ($filters['dateRangePreset'] ?? '') === 'last30d' ? 'selected' : '' ?>>Last 30 Days</option>
                <option value="custom" <?= ($filters['dateRangePreset'] ?? '') === 'custom' ? 'selected' : '' ?>>Custom Range</option>
              </select>
            </div>

            <!-- Custom Range Date inputs -->
            <div id="custom-date-container" class="col-span-2 grid grid-cols-2 gap-2 <?= ($filters['dateRangePreset'] ?? '') === 'custom' ? 'block' : 'hidden' ?>">
              <div>
                <label class="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Start Date</label>
                <input
                  type="date"
                  name="customStartDate"
                  value="<?= htmlspecialchars($filters['customStartDate'] ?? '') ?>"
                  class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label class="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">End Date</label>
                <input
                  type="date"
                  name="customEndDate"
                  value="<?= htmlspecialchars($filters['customEndDate'] ?? '') ?>"
                  class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <!-- Status Select -->
            <div>
              <label class="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Status</label>
              <select
                name="filterStatus"
                class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all" <?= ($filters['filterStatus'] ?? 'all') === 'all' ? 'selected' : '' ?>>All Statuses</option>
                <?php foreach ($hazardStatuses as $st): ?>
                  <option value="<?= $st ?>" <?= ($filters['filterStatus'] ?? '') === $st ? 'selected' : '' ?>>
                    <?= DFAValidationEngine::mapStatusToLabel($st) ?>
                  </option>
                <?php endforeach; ?>
              </select>
            </div>

            <!-- Category Select -->
            <div>
              <label class="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Category</label>
              <select
                name="filterCategory"
                class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all" <?= ($filters['filterCategory'] ?? 'all') === 'all' ? 'selected' : '' ?>>All Categories</option>
                <option value="A" <?= ($filters['filterCategory'] ?? '') === 'A' ? 'selected' : '' ?>>Class A (PPE / Safety)</option>
                <option value="B" <?= ($filters['filterCategory'] ?? '') === 'B' ? 'selected' : '' ?>>Class B (Environmental)</option>
                <option value="C" <?= ($filters['filterCategory'] ?? '') === 'C' ? 'selected' : '' ?>>Class C (Maintenance)</option>
              </select>
            </div>

            <!-- Department Select -->
            <div class="col-span-2">
              <label class="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Department</label>
              <select
                name="filterDepartment"
                class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all" <?= ($filters['filterDepartment'] ?? 'all') === 'all' ? 'selected' : '' ?>>All Departments</option>
                <?php foreach ($departments as $dept): ?>
                  <option value="<?= $dept ?>" <?= ($filters['filterDepartment'] ?? '') === $dept ? 'selected' : '' ?>>
                    <?= htmlspecialchars($dept) ?>
                  </option>
                <?php endforeach; ?>
              </select>
            </div>

            <!-- Ticket ID Filter -->
            <div>
              <label class="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Ticket ID</label>
              <input
                type="text"
                name="searchTicketId"
                placeholder="HZ-2026-..."
                value="<?= htmlspecialchars($filters['searchTicketId'] ?? '') ?>"
                class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <!-- Employee ID Filter -->
            <div>
              <label class="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Employee ID</label>
              <input
                type="text"
                name="searchEmployeeId"
                placeholder="EMP-9021"
                value="<?= htmlspecialchars($filters['searchEmployeeId'] ?? '') ?>"
                class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <!-- Reporter Name Filter -->
            <div class="col-span-2">
              <label class="block text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">Reporter Name</label>
              <input
                type="text"
                name="searchReporterName"
                placeholder="Search reporter name..."
                value="<?= htmlspecialchars($filters['searchReporterName'] ?? '') ?>"
                class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-850">
            <a
              href="<?= url('/admin/tickets') ?>"
              class="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded text-[10px] font-mono font-bold transition"
            >
              Reset
            </a>
            <button
              type="submit"
              class="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded text-[10px] font-mono font-bold transition cursor-pointer"
            >
              Filter Ledger
            </button>
          </div>
        </form>
      </div>

      <!-- Tickets Cards List -->
      <div class="space-y-3 max-h-[560px] overflow-y-auto pr-1">
        <?php if (empty($filteredReports)): ?>
          <div class="text-center py-12 text-slate-500 text-xs">
            No tickets match the filtered criteria.
          </div>
        <?php else: ?>
          <?php foreach ($filteredReports as $rep): ?>
            <?php
              $isResolved = in_array($rep['status'] ?? '', ['Completed', 'Resolved'], true);
              $cTime = !empty($rep['created_at']) ? strtotime($rep['created_at']) : time();
              $isOverdue = !$isResolved && ((time() - $cTime) > (3 * 86400));
              $isSelected = ($selectedReport && ($selectedReport['id'] === $rep['id'] || $selectedReport['ticket_id'] === $rep['ticket_id']));
              $cat = $rep['category'] ?? 'C';
              $dept = $rep['department'] ?? 'Production';
              $repName = $rep['reporter_name'] ?? 'Anonymous';
              $title = $rep['title'] ?: "Bahaya K3 Kategori {$cat} - " . ($rep['area'] ?? 'Area Pabrik');
              $prio = $rep['priority'] ?? 'Medium';
            ?>
            <div
              onclick="window.location.href='<?= url('/admin/tickets?id=' . urlencode($rep['id']) . ($filters['showFilters'] ? '&showFilters=1' : '') . (!empty($filters['searchQuery']) ? '&searchQuery=' . urlencode($filters['searchQuery']) : '')) ?>'"
              class="p-4 rounded-xl border transition cursor-pointer text-left relative <?= $isSelected ? 'bg-slate-850 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/30' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/30' ?>"
            >
              <?php if ($isOverdue): ?>
                <span class="absolute top-2.5 right-2.5 flex h-2 w-2" title="Overdue (>3 days)">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              <?php endif; ?>

              <!-- Header Row: Ticket ID & Badges & Action Buttons -->
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-mono font-bold text-emerald-400"><?= htmlspecialchars($rep['ticket_id'] ?? $rep['id']) ?></span>
                  <span class="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold uppercase tracking-wider">
                    CAT <?= htmlspecialchars($cat) ?> &bull; <?= htmlspecialchars($dept) ?>
                  </span>
                </div>
                <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                  <span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider <?= ($prio === 'High' || $prio === 'Critical') ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : ($prio === 'Medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-400') ?>">
                    <?= htmlspecialchars($prio) ?> PRIORITY
                  </span>
                  
                  <!-- Quick Edit Modal Trigger -->
                  <button
                    type="button"
                    onclick="openEditModal(<?= htmlspecialchars(json_encode($rep), ENT_QUOTES, 'UTF-8') ?>)"
                    class="p-1 rounded text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition cursor-pointer"
                    title="Edit <?= htmlspecialchars($rep['ticket_id'] ?? $rep['id']) ?>"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <!-- Delete Button (Only for hse_admin) -->
                  <?php if ($isHseAdmin): ?>
                    <button
                      type="button"
                      onclick="openDeleteModal('<?= htmlspecialchars($rep['id']) ?>', '<?= htmlspecialchars($rep['ticket_id']) ?>')"
                      class="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                      title="Delete <?= htmlspecialchars($rep['ticket_id'] ?? $rep['id']) ?>"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  <?php endif; ?>
                </div>
              </div>

              <!-- Headline: Incident Summary -->
              <h4 class="text-xs sm:text-sm font-bold text-slate-100 mt-2.5 line-clamp-2 leading-snug">
                <?= htmlspecialchars($title) ?>
              </h4>

              <!-- Metadata Grid -->
              <div class="grid grid-cols-2 gap-y-1.5 gap-x-2 mt-3 pt-2.5 text-[11px] text-slate-400 font-mono border-t border-slate-900/80">
                <div>
                  <span class="text-slate-500">Dept:</span> <span class="text-slate-300 font-semibold"><?= htmlspecialchars($dept) ?></span>
                </div>
                <div class="truncate">
                  <span class="text-slate-500">Reporter:</span> <span class="text-slate-300 font-semibold"><?= htmlspecialchars($repName) ?></span>
                </div>
                <div>
                  <span class="text-slate-500">Status:</span> <span class="text-emerald-400 font-semibold"><?= DFAValidationEngine::mapStatusToLabel($rep['status'] ?? 'NewReport') ?></span>
                </div>
                <div>
                  <span class="text-slate-500">Logged:</span> <span class="text-slate-300"><?= DateFormatter::formatWibDate($rep['created_at'] ?? 'now') ?></span>
                </div>
              </div>
            </div>
          <?php endforeach; ?>
        <?php endif; ?>
      </div>

    </div>

    <!-- ========================================================================= -->
    <!-- RIGHT COLUMN: TICKET CONTROL PANEL & DETAILS (7 cols)                    -->
    <!-- ========================================================================= -->
    <div class="lg:col-span-7">
      <?php if ($selectedReport): ?>
        <?php
          $summary = $parsedDetails['summary'] ?? ($selectedReport['title'] ?: 'Safety Hazard Report');
          $prio = $selectedReport['priority'] ?? 'Medium';
          $cat = $selectedReport['category'] ?? 'C';
          $dept = $selectedReport['department'] ?? 'Production';
          $currentStatus = $selectedReport['status'] ?? 'NewReport';
          $allowedNext = DFAValidationEngine::getNextAllowedStates($currentStatus);
          $allowedLabels = array_map([DFAValidationEngine::class, 'mapStatusToLabel'], $allowedNext);
        ?>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-left space-y-6">

          <!-- SECTION 1: HEADER / COVER -->
          <div class="flex items-start justify-between border-b border-slate-800 pb-5 flex-wrap gap-4">
            <div class="space-y-2 max-w-xl">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded">
                  <?= htmlspecialchars($selectedReport['ticket_id'] ?? $selectedReport['id']) ?>
                </span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-bold uppercase tracking-wider">
                  CAT <?= htmlspecialchars($cat) ?> &bull; <?= htmlspecialchars($dept) ?>
                </span>
                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider <?= ($prio === 'High' || $prio === 'Critical') ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : ($prio === 'Medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400') ?>">
                  <?= htmlspecialchars($prio) ?> Priority
                </span>
              </div>
              <h3 class="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                <?= htmlspecialchars($summary) ?>
              </h3>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <!-- Edit Button -->
              <button
                type="button"
                onclick="openEditModal(<?= htmlspecialchars(json_encode($selectedReport), ENT_QUOTES, 'UTF-8') ?>)"
                class="bg-slate-950 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/50 text-emerald-400 font-mono text-[10px] uppercase font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow"
                title="Edit Hazard Report Details"
              >
                <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit Report</span>
              </button>

              <!-- Export Ticket PDF -->
              <a
                href="<?= url('/admin/tickets/' . urlencode($selectedReport['id']) . '/pdf') ?>"
                class="bg-slate-950 hover:bg-slate-850 border border-slate-700 hover:border-emerald-500/50 text-emerald-400 font-mono text-[10px] uppercase font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow"
              >
                <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export Ticket PDF</span>
              </a>

              <!-- Delete Report (hse_admin only) -->
              <?php if ($isHseAdmin): ?>
                <button
                  type="button"
                  onclick="openDeleteModal('<?= htmlspecialchars($selectedReport['id']) ?>', '<?= htmlspecialchars($selectedReport['ticket_id']) ?>')"
                  class="bg-slate-950 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 text-rose-400 hover:text-rose-300 font-mono text-[10px] uppercase font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow"
                  title="Delete Hazard Report"
                >
                  <svg class="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete Report</span>
                </button>
              <?php endif; ?>
            </div>
          </div>

          <!-- SECTION 2: INCIDENT DESCRIPTION & FIELD DETAILS (Form IK-01 Data Mapping) -->
          <div class="bg-slate-950 border border-slate-800/90 rounded-xl p-5 space-y-4 text-xs">
            <div class="flex items-center justify-between border-b border-slate-900 pb-2">
              <span class="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Incident Description & Field Details</span>
              </span>
              <span class="text-[10px] font-mono text-slate-500">Form IK-01 Data Mapping</span>
            </div>

            <!-- Detail Temuan / Main Hazard Description -->
            <?php if (!empty($parsedDetails['hazardDescription'])): ?>
              <div class="space-y-1">
                <span class="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                  Detail Temuan / Hazard Description
                </span>
                <p class="leading-relaxed text-slate-200 font-sans whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                  <?= htmlspecialchars($parsedDetails['hazardDescription']) ?>
                </p>
              </div>
            <?php endif; ?>

            <!-- Structured Incident Attributes Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              <?php if (!empty($parsedDetails['currentCondition'])): ?>
                <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                  <span class="text-[9px] font-mono uppercase text-slate-500 block">Kondisi Saat Dilaporkan</span>
                  <span class="font-semibold text-slate-200 block text-[11px]"><?= htmlspecialchars($parsedDetails['currentCondition']) ?></span>
                </div>
              <?php endif; ?>

              <?php if (!empty($parsedDetails['injuryStatus'])): ?>
                <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                  <span class="text-[9px] font-mono uppercase text-slate-500 block">Status Korban</span>
                  <span class="font-semibold text-slate-200 block text-[11px]"><?= htmlspecialchars($parsedDetails['injuryStatus']) ?></span>
                </div>
              <?php endif; ?>

              <?php if (!empty($parsedDetails['potentialImpact'])): ?>
                <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                  <span class="text-[9px] font-mono uppercase text-slate-500 block">Potensi Dampak</span>
                  <span class="font-semibold text-amber-300 block text-[11px]"><?= htmlspecialchars($parsedDetails['potentialImpact']) ?></span>
                </div>
              <?php endif; ?>

              <?php if (!empty($parsedDetails['immediateAction'])): ?>
                <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                  <span class="text-[9px] font-mono uppercase text-slate-500 block">Tindakan Sementara</span>
                  <span class="font-semibold text-slate-200 block text-[11px]"><?= htmlspecialchars($parsedDetails['immediateAction']) ?></span>
                </div>
              <?php endif; ?>

              <?php if (!empty($parsedDetails['informedToLeader'])): ?>
                <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                  <span class="text-[9px] font-mono uppercase text-slate-500 block">Disampaikan ke Atasan/Leader</span>
                  <span class="font-semibold text-slate-200 block text-[11px]"><?= htmlspecialchars($parsedDetails['informedToLeader']) ?></span>
                </div>
              <?php endif; ?>

              <?php if (!empty($parsedDetails['improvementSuggestion'])): ?>
                <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                  <span class="text-[9px] font-mono uppercase text-slate-500 block">Saran Perbaikan</span>
                  <span class="font-semibold text-slate-200 block text-[11px]"><?= htmlspecialchars($parsedDetails['improvementSuggestion']) ?></span>
                </div>
              <?php endif; ?>

              <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                <span class="text-[9px] font-mono uppercase text-slate-500 block">Area</span>
                <span class="font-semibold text-slate-200 block text-[11px]"><?= htmlspecialchars($selectedReport['area'] ?? 'Area Pabrik') ?></span>
              </div>

              <?php if (!empty($parsedDetails['locationDetail'])): ?>
                <div class="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-0.5 sm:col-span-2">
                  <span class="text-[9px] font-mono uppercase text-slate-500 block">Detail Lokasi</span>
                  <span class="font-semibold text-slate-200 block text-[11px]"><?= htmlspecialchars($parsedDetails['locationDetail']) ?></span>
                </div>
              <?php endif; ?>
            </div>

            <!-- Photo Evidence -->
            <?php if (!empty($selectedReport['photo_evidence_url'])): ?>
              <div class="border-t border-slate-900 pt-3 space-y-1.5">
                <span class="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">Photo Evidence</span>
                <a href="<?= htmlspecialchars($selectedReport['photo_evidence_url']) ?>" target="_blank" rel="noreferrer" class="inline-block hover:opacity-90 transition">
                  <img
                    src="<?= htmlspecialchars($selectedReport['photo_evidence_url']) ?>"
                    alt="Evidence"
                    class="max-h-48 rounded-lg border border-slate-800 object-cover shadow"
                  />
                </a>
              </div>
            <?php endif; ?>
          </div>

          <!-- SECTION 3: REPORTER INFORMATION -->
          <div class="bg-slate-950 border border-slate-800/90 rounded-xl p-4 text-xs">
            <div class="flex items-center gap-1.5 border-b border-slate-900 pb-2 mb-3">
              <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span class="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold">Reporter Information</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
              <div>
                <span class="text-[9px] uppercase text-slate-500 block">Reporter Name</span>
                <p class="mt-0.5 font-bold text-slate-200 text-[11px]"><?= htmlspecialchars($selectedReport['reporter_name'] ?? 'N/A') ?></p>
              </div>
              <div>
                <span class="text-[9px] uppercase text-slate-500 block">Employee ID</span>
                <p class="mt-0.5 font-bold text-slate-200 text-[11px]"><?= htmlspecialchars($selectedReport['employee_id'] ?? 'N/A') ?></p>
              </div>
              <div>
                <span class="text-[9px] uppercase text-slate-500 block">Reporter Email</span>
                <p class="mt-0.5 text-slate-400 text-[11px] truncate" title="<?= htmlspecialchars($selectedReport['reporter_email'] ?? '') ?>">
                  <?= htmlspecialchars($selectedReport['reporter_email'] ?? 'N/A') ?>
                </p>
              </div>
              <div>
                <span class="text-[9px] uppercase text-slate-500 block">Department</span>
                <p class="mt-0.5 font-bold text-slate-200 text-[11px]"><?= htmlspecialchars($selectedReport['department'] ?? 'N/A') ?></p>
              </div>
            </div>
          </div>

          <!-- SECTION 4: WORKFLOW & AUDIT STATE -->
          <div class="bg-slate-950 border border-slate-800/90 rounded-xl p-4 text-xs">
            <div class="flex items-center gap-1.5 border-b border-slate-900 pb-2 mb-3">
              <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold">Workflow & Audit State</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
              <div>
                <span class="text-[9px] uppercase text-slate-500 block">DFA Workflow Status</span>
                <p class="mt-0.5 font-bold text-purple-400 text-[11px]"><?= DFAValidationEngine::mapStatusToLabel($selectedReport['dfa_status'] ?? $selectedReport['status']) ?></p>
              </div>
              <div>
                <span class="text-[9px] uppercase text-slate-500 block">Ticket Status</span>
                <p class="mt-0.5 font-bold text-emerald-400 text-[11px]"><?= DFAValidationEngine::mapStatusToLabel($selectedReport['status']) ?></p>
              </div>
              <div>
                <span class="text-[9px] uppercase text-slate-500 block">Assigned Officer / PIC</span>
                <p class="mt-0.5 font-bold text-slate-200 text-[11px]"><?= htmlspecialchars($selectedReport['assigned_pic_name'] ?? 'N/A') ?></p>
              </div>
              <div>
                <span class="text-[9px] uppercase text-slate-500 block">Officer Review Status</span>
                <p class="mt-0.5 text-slate-300 text-[11px]">
                  <?= !empty($selectedReport['officer_reviewed']) ? 'Reviewed' : 'Review Pending' ?>
                </p>
              </div>
              <div>
                <span class="text-[9px] uppercase text-slate-500 block">Officer Review Date</span>
                <p class="mt-0.5 text-slate-300 text-[11px]">
                  <?= !empty($selectedReport['officer_review_date']) ? DateFormatter::formatWibDate($selectedReport['officer_review_date']) : 'N/A' ?>
                </p>
              </div>
              <div>
                <span class="text-[9px] uppercase text-slate-500 block">Ticket Reference ID</span>
                <p class="mt-0.5 text-emerald-400 font-bold text-[11px] truncate"><?= htmlspecialchars($selectedReport['ticket_id']) ?></p>
              </div>
              <div>
                <span class="text-[9px] uppercase text-slate-500 block">Logged At</span>
                <p class="mt-0.5 text-slate-300 text-[11px]"><?= DateFormatter::formatWibDateTime($selectedReport['created_at']) ?></p>
              </div>
              <div>
                <span class="text-[9px] uppercase text-slate-500 block">Last Updated At</span>
                <p class="mt-0.5 text-slate-300 text-[11px]"><?= DateFormatter::formatWibDateTime($selectedReport['updated_at']) ?></p>
              </div>
              <div class="sm:col-span-2 lg:col-span-1">
                <span class="text-[9px] uppercase text-slate-500 block">Officer Comments</span>
                <p class="mt-0.5 text-slate-300 text-[11px] truncate" title="<?= htmlspecialchars($selectedReport['officer_comments'] ?? 'None') ?>">
                  <?= htmlspecialchars($selectedReport['officer_comments'] ?? 'None') ?>
                </p>
              </div>
            </div>
          </div>

          <!-- SECTION 5: RISK EVALUATION (PEP-HSE-P-01-IK-01) -->
          <div class="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between flex-wrap gap-2 border-b border-slate-900 pb-2">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-200">
                  Risk Assessment (IK Pedoman PEP-HSE-P-01-IK-01)
                </span>
              </div>
              <span class="px-2.5 py-0.5 rounded font-bold border uppercase text-[10px] <?= $evalRes['badgeClass'] ?>">
                <?= htmlspecialchars($evalRes['label']) ?> Risk Level
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div class="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                <span class="text-[9px] text-slate-500 uppercase block">Keparahan (Severity)</span>
                <span class="font-bold text-slate-200 block mt-0.5">Sev <?= $evalRes['severity'] ?>: <?= RiskMatrixEvaluator::SEVERITY_DEFINITIONS[$evalRes['severity']]['title'] ?? '' ?></span>
                <span class="text-[10px] text-slate-400 block mt-0.5"><?= RiskMatrixEvaluator::SEVERITY_DEFINITIONS[$evalRes['severity']]['short'] ?? '' ?></span>
              </div>

              <div class="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                <span class="text-[9px] text-slate-500 uppercase block">Probabilitas (Likelihood)</span>
                <span class="font-bold text-slate-200 block mt-0.5">Like <?= $evalRes['likelihood'] ?>: <?= RiskMatrixEvaluator::LIKELIHOOD_DEFINITIONS[$evalRes['likelihood']]['title'] ?? '' ?></span>
                <span class="text-[10px] text-slate-400 block mt-0.5"><?= RiskMatrixEvaluator::LIKELIHOOD_DEFINITIONS[$evalRes['likelihood']]['short'] ?? '' ?></span>
              </div>

              <div class="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 flex flex-col justify-between">
                <div>
                  <span class="text-[9px] text-slate-500 uppercase block">Nilai Titik Temu Matriks</span>
                  <span class="font-extrabold text-emerald-400 text-sm block mt-0.5"><?= $evalRes['score'] ?> (<?= $evalRes['level'] ?>)</span>
                </div>
                <?php if ($evalRes['isOtpRequired']): ?>
                  <span class="mt-1 text-[9px] text-rose-400 font-bold uppercase tracking-wider block">Wajib Program OTP</span>
                <?php endif; ?>
              </div>
            </div>
          </div>

          <!-- CONTROLLER ACTION: EDITABLE CORPORATE HAZARD CONTROLS -->
          <form method="POST" action="<?= url('/admin/tickets/' . urlencode($selectedReport['id']) . '/update') ?>" class="bg-slate-950 p-5 border border-slate-800 rounded-lg space-y-4">
            <?= csrf_field() ?>

            <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Editable Corporate Hazard Controls</span>
            </h4>

            <?php if ($isReadOnly): ?>
              <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-lg">
                Peran Anda (President Director) adalah Read-Only. Perubahan pengaturan tiket tidak dapat disimpan.
              </div>
            <?php endif; ?>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Control 1: Assigned To (PIC Allocation) -->
              <div class="space-y-1.5">
                <label class="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                  Assigned Officer (PIC)
                </label>
                <?php
                  $currentPic = $selectedReport['assigned_pic_id'] ?? $selectedReport['assigned_to'] ?? 'usr_hse_team';
                ?>
                <select
                  name="assigned_pic"
                  class="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  <?= $isReadOnly ? 'disabled' : '' ?>
                >
                  <option value="usr_hrga_admin" <?= $currentPic === 'usr_hrga_admin' ? 'selected' : '' ?>>HRGA Admin</option>
                  <option value="usr_asep_permana" <?= $currentPic === 'usr_asep_permana' ? 'selected' : '' ?>>Asep Permana</option>
                  <option value="usr_hse_team" <?= ($currentPic !== 'usr_hrga_admin' && $currentPic !== 'usr_asep_permana') ? 'selected' : '' ?>>HSE Team</option>
                </select>
              </div>

              <!-- Control 2: Status Dropdown with DFA rules -->
              <div class="space-y-1.5">
                <label class="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                  Ticket Status (DFA Enforced)
                </label>
                <select
                  name="status"
                  id="ticket-status-select"
                  class="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  <?= $isReadOnly ? 'disabled' : '' ?>
                >
                  <?php foreach ($hazardStatuses as $st): ?>
                    <option value="<?= $st ?>" <?= $currentStatus === $st ? 'selected' : '' ?>>
                      <?= DFAValidationEngine::mapStatusToLabel($st) ?>
                    </option>
                  <?php endforeach; ?>
                </select>
                <p class="text-[9px] text-slate-500 font-mono mt-1">
                  Allowed subsequent states: <span class="text-emerald-400"><?= !empty($allowedLabels) ? htmlspecialchars(implode(', ', $allowedLabels)) : 'None' ?></span>
                </p>
              </div>
            </div>

            <!-- Risk Assessment Matrix Controls (PEP-HSE-P-01-IK-01) -->
            <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-lg space-y-4">
              <div class="flex items-center justify-between border-b border-slate-800/80 pb-2 flex-wrap gap-2">
                <span class="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Evaluasi Risiko Standar Internal (PEP-HSE-P-01-IK-01)
                </span>
                <span id="risk-score-badge" class="text-xs font-bold font-mono px-2.5 py-0.5 rounded border <?= $evalRes['badgeClass'] ?>">
                  Nilai Risiko: <?= $evalRes['score'] ?> (<?= $evalRes['level'] ?>)
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Severity Selection -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                    Keparahan / Severity (1 - 5)
                  </label>
                  <select
                    name="severity"
                    id="severity-select"
                    onchange="updateRiskCalculation()"
                    class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    <?= $isReadOnly ? 'disabled' : '' ?>
                  >
                    <?php foreach (RiskMatrixEvaluator::SEVERITY_DEFINITIONS as $lvl => $sev): ?>
                      <option value="<?= $lvl ?>" <?= (int)($selectedReport['severity'] ?? 2) === $lvl ? 'selected' : '' ?>>
                        Severity <?= $lvl ?> - <?= htmlspecialchars($sev['title']) ?> (<?= htmlspecialchars($sev['short']) ?>)
                      </option>
                    <?php endforeach; ?>
                  </select>
                </div>

                <!-- Likelihood Selection -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                    Kemungkinan / Likelihood (1 - 5)
                  </label>
                  <select
                    name="likelihood"
                    id="likelihood-select"
                    onchange="updateRiskCalculation()"
                    class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    <?= $isReadOnly ? 'disabled' : '' ?>
                  >
                    <?php foreach (RiskMatrixEvaluator::LIKELIHOOD_DEFINITIONS as $lvl => $lik): ?>
                      <option value="<?= $lvl ?>" <?= (int)($selectedReport['likelihood'] ?? 2) === $lvl ? 'selected' : '' ?>>
                        Likelihood <?= $lvl ?> - <?= htmlspecialchars($lik['title']) ?> (<?= htmlspecialchars($lik['short']) ?>)
                      </option>
                    <?php endforeach; ?>
                  </select>
                </div>
              </div>

              <!-- Rule Requirements & Additional Inputs -->
              <div class="space-y-3 border-t border-slate-800/80 pt-3 text-xs">
                <!-- Control Hierarchy Requirement (Score >= 5) -->
                <div id="additional-control-container" class="<?= $evalRes['isAdditionalControlRequired'] ? 'block' : 'hidden' ?> p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded space-y-2">
                  <p class="font-semibold text-[11px] flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Pengendalian Tambahan Wajib Ditentukan (Nilai &ge; 5)</span>
                  </p>
                  <div class="space-y-1">
                    <label class="text-[10px] font-mono uppercase text-slate-400 block">
                      Hirarki Pengendalian Tambahan
                    </label>
                    <select
                      name="additional_control"
                      class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      <?= $isReadOnly ? 'disabled' : '' ?>
                    >
                      <?php foreach ($hierarchyOfControls as $hc): ?>
                        <option value="<?= htmlspecialchars($hc['title']) ?>" <?= ($selectedReport['additional_control'] ?? '') === $hc['title'] ? 'selected' : '' ?>>
                          <?= htmlspecialchars($hc['title']) ?> - <?= htmlspecialchars($hc['desc']) ?>
                        </option>
                      <?php endforeach; ?>
                    </select>
                  </div>
                </div>

                <!-- OTP Requirement (Score > 9) -->
                <div id="otp-container" class="<?= $evalRes['isOtpRequired'] ? 'block' : 'hidden' ?> p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded space-y-2">
                  <p class="font-semibold text-[11px] flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>WAJIB Membuat Sasaran Program K3 (OTP) (Nilai &gt; 9)</span>
                  </p>
                  <div class="space-y-1">
                    <label class="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                      Nama Program OTP (Objective Target Program)
                    </label>
                    <input
                      type="text"
                      name="otp_program_name"
                      value="<?= htmlspecialchars($selectedReport['otp_program_name'] ?? '') ?>"
                      placeholder="Contoh: OTP-2026-HSE-001 (Perbaikan Sistem Kelistrikan Area 3)"
                      class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                      <?= $isReadOnly ? 'disabled' : '' ?>
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Control 3: Officer Comments -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                Primary Officer Comments (officer_comments column)
              </label>
              <textarea
                name="officer_comments"
                placeholder="Type standard mitigation comments, corporate safety findings, or escalation notes directly on the hazard ticket row..."
                rows="3"
                class="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                <?= $isReadOnly ? 'disabled' : '' ?>
              ><?= htmlspecialchars($selectedReport['officer_comments'] ?? '') ?></textarea>
            </div>

            <!-- Submit Button -->
            <div class="flex justify-end pt-2">
              <button
                type="submit"
                <?= $isReadOnly ? 'disabled' : '' ?>
                class="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-bold px-6 py-2 rounded text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Save Ticket Settings</span>
              </button>
            </div>
          </form>

          <!-- CONTROLLER ACTION: COMMENT ACTIVITY LEDGER -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Comment Activity Ledger (Public / Private Comments)</span>
            </h4>

            <div class="space-y-2 max-h-48 overflow-y-auto bg-slate-950 p-3 rounded border border-slate-800/60">
              <?php if (empty($comments)): ?>
                <p class="text-slate-600 text-center py-6 text-xs font-mono">No notes or status commentaries yet.</p>
              <?php else: ?>
                <?php foreach ($comments as $c): ?>
                  <?php
                    $isInternal = (!empty($c['is_internal_only']) || str_starts_with($c['comment_text'] ?? '', '[INTERNAL]'));
                    $displayText = str_replace('[INTERNAL]', '', $c['comment_text'] ?? '');
                  ?>
                  <div class="p-2.5 border-b border-slate-900/60 text-xs <?= $isInternal ? 'bg-slate-900/40 border-l-2 border-amber-500 rounded-r' : '' ?>">
                    <div class="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                      <span class="font-bold text-slate-400 flex items-center gap-1.5">
                        <span><?= htmlspecialchars($c['user_name'] ?? 'Staff') ?> (<?= htmlspecialchars($c['user_role'] ?? 'staff') ?>)</span>
                        <?php if ($isInternal): ?>
                          <span class="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded uppercase font-mono font-bold">
                            🔒 Internal Use Only
                          </span>
                        <?php endif; ?>
                      </span>
                      <span><?= DateFormatter::formatWibDateTime($c['created_at']) ?></span>
                    </div>
                    <p class="text-slate-300 font-sans leading-relaxed"><?= nl2br(htmlspecialchars(trim($displayText))) ?></p>
                  </div>
                <?php endforeach; ?>
              <?php endif; ?>
            </div>

            <!-- Post Comment Form -->
            <form method="POST" action="<?= url('/admin/tickets/' . urlencode($selectedReport['id']) . '/comment') ?>" class="space-y-2">
              <?= csrf_field() ?>
              <div class="flex gap-2">
                <input
                  type="text"
                  name="comment_text"
                  required
                  placeholder="Log mitigation notes, instructions, or progress updates..."
                  class="flex-grow bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  <?= $isReadOnly ? 'disabled' : '' ?>
                />
                <button
                  type="submit"
                  <?= $isReadOnly ? 'disabled' : '' ?>
                  class="bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-50 border border-slate-700 text-slate-200 px-4 py-2 text-xs font-semibold rounded transition shrink-0 cursor-pointer"
                >
                  Post
                </button>
              </div>

              <div class="flex items-center gap-2">
                <label class="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="is_internal"
                    value="1"
                    class="bg-slate-950 border-slate-800 rounded text-emerald-500 focus:ring-0 w-3 h-3 cursor-pointer"
                    <?= $isReadOnly ? 'disabled' : '' ?>
                  />
                  <span>🔒 Mark as internal comment (not visible to public tracking)</span>
                </label>
              </div>
            </form>
          </div>

        </div>
      <?php else: ?>
        <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center text-slate-500 h-96 flex flex-col items-center justify-center">
          <svg class="w-8 h-8 text-slate-600 mb-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <h3 class="text-sm font-semibold text-slate-400">No Ticket Selected</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-xs leading-normal">
            Select any hazard report from the list on the left to allocate PICs, process DFA transitions, or write commentaries.
          </p>
        </div>
      <?php endif; ?>
    </div>

  </div>
</div>

<!-- ========================================================================= -->
<!-- MODAL: DELETE CONFIRMATION (hse_admin only)                               -->
<!-- ========================================================================= -->
<div id="delete-modal" class="fixed inset-0 z-50 hidden items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
  <div class="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl text-left space-y-4">
    <div class="flex items-center gap-3 border-b border-slate-800 pb-3">
      <div class="p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-bold text-slate-100">Delete Hazard Report?</h3>
        <p class="text-[11px] text-slate-400 font-mono">Permanent Cloud Deletion</p>
      </div>
    </div>

    <div class="space-y-2 text-xs text-slate-300">
      <p class="leading-relaxed">
        Ticket <span id="delete-ticket-id-badge" class="font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/25">HZ-2026-XXXX</span> will be permanently removed from the system.
      </p>
      <p class="text-slate-400 font-medium">
        This action cannot be undone.
      </p>
    </div>

    <form id="delete-form" method="POST" action="" class="pt-2 border-t border-slate-800 flex items-center justify-end gap-2.5">
      <?= csrf_field() ?>
      <button
        type="button"
        onclick="closeDeleteModal()"
        class="px-4 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-900/30"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>Delete</span>
      </button>
    </form>
  </div>
</div>

<!-- ========================================================================= -->
<!-- MODAL: EDIT HAZARD REPORT DIALOG                                          -->
<!-- ========================================================================= -->
<div id="edit-modal" class="fixed inset-0 z-50 hidden items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
  <div class="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-left space-y-4 my-8">
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-100">Edit Hazard Report</h3>
          <p class="text-[11px] text-slate-400 font-mono">
            Ticket ID: <span id="edit-modal-ticket-id" class="text-emerald-400 font-bold">HZ-2026-XXXX</span>
          </p>
        </div>
      </div>
      <button
        type="button"
        onclick="closeEditModal()"
        class="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <form id="edit-form" method="POST" action="" class="space-y-4">
      <?= csrf_field() ?>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Reporter Name</label>
          <input
            type="text"
            name="reporter_name"
            id="edit-reporter-name"
            placeholder="e.g. Ahmad Fauzi"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          />
        </div>

        <div>
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Employee ID</label>
          <input
            type="text"
            name="employee_id"
            id="edit-employee-id"
            placeholder="e.g. EMP-1024"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          />
        </div>

        <div>
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Department</label>
          <input
            type="text"
            name="department"
            id="edit-department"
            placeholder="e.g. Production, Maintenance"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          />
        </div>

        <div>
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Area / Location</label>
          <input
            type="text"
            name="area"
            id="edit-area"
            placeholder="e.g. Stamping Line 2"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          />
        </div>

        <div>
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Hazard Category</label>
          <select
            name="category"
            id="edit-category"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          >
            <option value="A">Category A - Safety / APD / Physical / Electrical / Fire / Machine</option>
            <option value="B">Category B - Environmental / Waste / Spill / Chemical</option>
            <option value="C">Category C - Facilities / Maintenance / Ergonomics / 5S</option>
          </select>
        </div>

        <div>
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Priority Level</label>
          <select
            name="priority"
            id="edit-priority"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          >
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
            <option value="Critical">Critical Priority</option>
          </select>
        </div>

        <div class="sm:col-span-2">
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Ticket Status</label>
          <select
            name="status"
            id="edit-status"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          >
            <?php foreach ($hazardStatuses as $st): ?>
              <option value="<?= $st ?>"><?= DFAValidationEngine::mapStatusToLabel($st) ?></option>
            <?php endforeach; ?>
          </select>
        </div>

        <div class="sm:col-span-2">
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Hazard Description / Finding Details</label>
          <textarea
            name="description"
            id="edit-description"
            rows="3"
            placeholder="Detailed finding report..."
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs leading-relaxed"
          ></textarea>
        </div>

        <div class="sm:col-span-2">
          <label class="block text-[11px] font-mono text-slate-400 mb-1">Officer Comments</label>
          <textarea
            name="officer_comments"
            id="edit-officer-comments"
            rows="2"
            placeholder="Official HSE notes or instructions..."
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs leading-relaxed"
          ></textarea>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
        <button
          type="button"
          onclick="closeEditModal()"
          class="px-4 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Save Changes</span>
        </button>
      </div>
    </form>
  </div>
</div>

<script>
  // Filter Toggle Handling
  function toggleLedgerFilters() {
    const panel = document.getElementById('advanced-filters-panel');
    const input = document.getElementById('show-filters-input');
    if (panel.classList.contains('hidden')) {
      panel.classList.remove('hidden');
      if (input) input.value = '1';
    } else {
      panel.classList.add('hidden');
      if (input) input.value = '0';
    }
  }

  function handleDatePresetChange(val) {
    const customDiv = document.getElementById('custom-date-container');
    if (customDiv) {
      if (val === 'custom') {
        customDiv.classList.remove('hidden');
      } else {
        customDiv.classList.add('hidden');
      }
    }
  }

  // Risk Lookup Table matching IK Pedoman PEP-HSE-P-01-IK-01
  const LOOKUP_MATRIX = {
    1: { 1: { score: 1, level: 'Low' }, 2: { score: 2, level: 'Low' }, 3: { score: 3, level: 'Low' }, 4: { score: 4, level: 'Low' }, 5: { score: 5, level: 'Moderate' } },
    2: { 1: { score: 2, level: 'Low' }, 2: { score: 4, level: 'Low' }, 3: { score: 6, level: 'Moderate' }, 4: { score: 8, level: 'Moderate' }, 5: { score: 10, level: 'High' } },
    3: { 1: { score: 3, level: 'Low' }, 2: { score: 6, level: 'Moderate' }, 3: { score: 9, level: 'Moderate' }, 4: { score: 12, level: 'High' }, 5: { score: 15, level: 'High' } },
    4: { 1: { score: 4, level: 'Low' }, 2: { score: 8, level: 'Moderate' }, 3: { score: 12, level: 'High' }, 4: { score: 16, level: 'High' }, 5: { score: 20, level: 'Extreme' } },
    5: { 1: { score: 5, level: 'Moderate' }, 2: { score: 10, level: 'High' }, 3: { score: 15, level: 'High' }, 4: { score: 20, level: 'Extreme' }, 5: { score: 25, level: 'Extreme' } }
  };

  function updateRiskCalculation() {
    const sElem = document.getElementById('severity-select');
    const lElem = document.getElementById('likelihood-select');
    if (!sElem || !lElem) return;

    const s = parseInt(sElem.value, 10) || 2;
    const l = parseInt(lElem.value, 10) || 2;

    const cell = (LOOKUP_MATRIX[s] && LOOKUP_MATRIX[s][l]) ? LOOKUP_MATRIX[s][l] : { score: s * l, level: 'Low' };
    const badge = document.getElementById('risk-score-badge');
    const addCtrl = document.getElementById('additional-control-container');
    const otpCtrl = document.getElementById('otp-container');

    if (badge) {
      badge.textContent = `Nilai Risiko: ${cell.score} (${cell.level})`;
      badge.className = 'text-xs font-bold font-mono px-2.5 py-0.5 rounded border ';
      if (cell.level === 'Low') {
        badge.className += 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      } else if (cell.level === 'Moderate') {
        badge.className += 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      } else if (cell.level === 'High') {
        badge.className += 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      } else {
        badge.className += 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      }
    }

    if (addCtrl) {
      if (cell.score >= 5) {
        addCtrl.classList.remove('hidden');
      } else {
        addCtrl.classList.add('hidden');
      }
    }

    if (otpCtrl) {
      if (cell.score > 9) {
        otpCtrl.classList.remove('hidden');
      } else {
        otpCtrl.classList.add('hidden');
      }
    }
  }

  // Delete Modal
  function openDeleteModal(reportId, ticketId) {
    const modal = document.getElementById('delete-modal');
    const form = document.getElementById('delete-form');
    const badge = document.getElementById('delete-ticket-id-badge');

    if (badge) badge.textContent = ticketId || reportId;
    if (form) form.action = '<?= url('/admin/tickets/') ?>' + encodeURIComponent(reportId) + '/delete';
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // Edit Modal
  function openEditModal(report) {
    if (!report) return;
    const modal = document.getElementById('edit-modal');
    const form = document.getElementById('edit-form');
    const idSpan = document.getElementById('edit-modal-ticket-id');

    if (idSpan) idSpan.textContent = report.ticket_id || report.id;
    if (form) form.action = '<?= url('/admin/tickets/') ?>' + encodeURIComponent(report.id) + '/edit';

    const repName = document.getElementById('edit-reporter-name');
    const empId = document.getElementById('edit-employee-id');
    const dept = document.getElementById('edit-department');
    const area = document.getElementById('edit-area');
    const cat = document.getElementById('edit-category');
    const prio = document.getElementById('edit-priority');
    const stat = document.getElementById('edit-status');
    const desc = document.getElementById('edit-description');
    const comm = document.getElementById('edit-officer-comments');

    if (repName) repName.value = report.reporter_name || '';
    if (empId) empId.value = report.employee_id || '';
    if (dept) dept.value = report.department || '';
    if (area) area.value = report.area || '';
    if (cat) cat.value = report.category || 'C';
    if (prio) prio.value = report.priority || 'Medium';
    if (stat) stat.value = report.status || 'NewReport';
    if (desc) desc.value = report.description || '';
    if (comm) comm.value = report.officer_comments || '';

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // Close modals on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeDeleteModal();
      closeEditModal();
    }
  });
</script>
