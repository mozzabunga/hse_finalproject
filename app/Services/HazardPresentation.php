<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Hazard Presentation & Narrative Parsing Engine
 * Ensures consequence / administrative phrases are never leaked as hazard title or summary.
 */
class HazardPresentation
{
    public const ADMINISTRATIVE_PREFIXES = [
        'kondisi saat dilaporkan',
        'kondisi saat ini',
        'kondisi saat',
        'current condition',
        'status kondisi',
        'status korban',
        'injury status',
        'korban',
        'sudah disampaikan ke atasan/leader',
        'sudah disampaikan ke atasan',
        'disampaikan ke atasan/leader',
        'disampaikan ke atasan',
        'disampaikan ke leader',
        'sudah disampaikan',
        'status laporan',
        'status tiket',
        'timestamp',
        'id tiket',
        'ticket id',
        'potensi dampak',
        'potensi bahaya',
        'potential impact',
        'tindakan sementara',
        'immediate action',
        'tindakan langsung',
        'saran perbaikan',
        'rekomendasi',
        'corrective suggestion',
        '[title]'
    ];

    public const CONSEQUENCE_VALUES = [
        'cedera ringan', 'cedera sedang', 'cedera berat', 'luka ringan', 'luka berat',
        'first aid', 'pertolongan pertama', 'fatality', 'korban jiwa', 'potensi korban jiwa',
        'tidak ada korban', 'ada korban', 'masih ada', 'sudah ditangani', 'selesai',
        'sudah selesai', 'belum selesai', 'open', 'closed', 'n/a', 'na', 'null', 'undefined', 'none'
    ];

    public static function isConsequenceOrAdmin(string $val): bool
    {
        $clean = strtolower(trim($val));
        if ($clean === '' || $clean === '-' || $clean === '.') return true;

        foreach (self::ADMINISTRATIVE_PREFIXES as $prefix) {
            if (str_starts_with($clean, $prefix)) return true;
        }

        foreach (self::CONSEQUENCE_VALUES as $term) {
            if ($clean === $term || str_starts_with($clean, $term . ':') || str_starts_with($clean, $term . ' -')) {
                return true;
            }
        }

        return false;
    }

    public static function parseDetails(array $report): array
    {
        $rawText = $report['description'] ?? '';
        $lines = array_filter(array_map('trim', explode("\n", $rawText)));

        $explicitDetail = '';
        $currentCondition = '';
        $injuryStatus = '';
        $potentialImpact = '';
        $immediateAction = '';
        $informedToLeader = '';
        $improvementSuggestion = '';
        $locationDetail = '';
        $unassigned = [];

        foreach ($lines as $line) {
            $lower = strtolower($line);
            if (str_starts_with($lower, 'detail temuan:') || str_starts_with($lower, 'detail temuan / hazard description:')) {
                $val = trim(substr($line, strpos($line, ':') + 1));
                if (!self::isConsequenceOrAdmin($val)) $explicitDetail = $val;
            } elseif (str_starts_with($lower, 'kondisi saat dilaporkan:')) {
                $currentCondition = trim(substr($line, strpos($line, ':') + 1));
            } elseif (str_starts_with($lower, 'status korban:')) {
                $injuryStatus = trim(substr($line, strpos($line, ':') + 1));
            } elseif (str_starts_with($lower, 'potensi dampak:')) {
                $potentialImpact = trim(substr($line, strpos($line, ':') + 1));
            } elseif (str_starts_with($lower, 'tindakan sementara:')) {
                $immediateAction = trim(substr($line, strpos($line, ':') + 1));
            } elseif (str_starts_with($lower, 'sudah disampaikan ke atasan:')) {
                $informedToLeader = trim(substr($line, strpos($line, ':') + 1));
            } elseif (str_starts_with($lower, 'saran perbaikan:')) {
                $improvementSuggestion = trim(substr($line, strpos($line, ':') + 1));
            } elseif (str_starts_with($lower, 'detail lokasi:')) {
                $locationDetail = trim(substr($line, strpos($line, ':') + 1));
            } elseif (!self::isConsequenceOrAdmin($line)) {
                $unassigned[] = $line;
            }
        }

        $finalDesc = $explicitDetail ?: implode("\n", $unassigned);

        // Resolve clean summary title
        $summary = '';
        if (!empty($report['title']) && !self::isConsequenceOrAdmin($report['title'])) {
            $summary = trim($report['title']);
        } elseif ($explicitDetail && !self::isConsequenceOrAdmin($explicitDetail)) {
            $summary = strlen($explicitDetail) > 100 ? substr($explicitDetail, 0, 97) . '...' : $explicitDetail;
        } elseif (!empty($unassigned[0]) && !self::isConsequenceOrAdmin($unassigned[0])) {
            $summary = strlen($unassigned[0]) > 100 ? substr($unassigned[0], 0, 97) . '...' : $unassigned[0];
        } else {
            $cat = $report['category'] ?? 'C';
            $area = $report['area'] ?? 'Area Pabrik';
            $summary = "Bahaya K3 Kategori {$cat} - {$area}";
        }

        return [
            'summary'               => $summary,
            'hazardDescription'     => $finalDesc,
            'currentCondition'      => $currentCondition ?: ($report['current_condition'] ?? ''),
            'injuryStatus'          => $injuryStatus ?: ($report['injury_status'] ?? ''),
            'potentialImpact'       => $potentialImpact ?: ($report['potential_impact'] ?? ''),
            'immediateAction'       => $immediateAction ?: ($report['temporary_action'] ?? ''),
            'informedToLeader'      => $informedToLeader ?: ($report['reported_to_leader'] ?? ''),
            'improvementSuggestion' => $improvementSuggestion ?: ($report['suggestion'] ?? ''),
            'locationDetail'        => $locationDetail ?: ($report['detail_location'] ?? ''),
            'categoryBadge'         => 'CAT ' . ($report['category'] ?? 'C'),
        ];
    }
}
