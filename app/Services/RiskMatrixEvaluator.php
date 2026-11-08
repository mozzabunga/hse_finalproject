<?php

declare(strict_types=1);

namespace App\Services;

/**
 * PT MINDA AUTOMOTIVE INDONESIA
 * IK Pedoman PEP-HSE-P-01-IK-01
 * Official HSE Risk Assessment & Matrix Evaluation Engine
 */
class RiskMatrixEvaluator
{
    public const LOOKUP_MATRIX = [
        1 => [1 => ['score' => 1, 'level' => 'Low'], 2 => ['score' => 2, 'level' => 'Low'], 3 => ['score' => 3, 'level' => 'Low'], 4 => ['score' => 4, 'level' => 'Low'], 5 => ['score' => 5, 'level' => 'Moderate']],
        2 => [1 => ['score' => 2, 'level' => 'Low'], 2 => ['score' => 4, 'level' => 'Low'], 3 => ['score' => 6, 'level' => 'Moderate'], 4 => ['score' => 8, 'level' => 'Moderate'], 5 => ['score' => 10, 'level' => 'High']],
        3 => [1 => ['score' => 3, 'level' => 'Low'], 2 => ['score' => 6, 'level' => 'Moderate'], 3 => ['score' => 9, 'level' => 'Moderate'], 4 => ['score' => 12, 'level' => 'High'], 5 => ['score' => 15, 'level' => 'High']],
        4 => [1 => ['score' => 4, 'level' => 'Low'], 2 => ['score' => 8, 'level' => 'Moderate'], 3 => ['score' => 12, 'level' => 'High'], 4 => ['score' => 16, 'level' => 'High'], 5 => ['score' => 20, 'level' => 'Extreme']],
        5 => [1 => ['score' => 5, 'level' => 'Moderate'], 2 => ['score' => 10, 'level' => 'High'], 3 => ['score' => 15, 'level' => 'High'], 4 => ['score' => 20, 'level' => 'Extreme'], 5 => ['score' => 25, 'level' => 'Extreme']]
    ];

    public const SEVERITY_DEFINITIONS = [
        1 => ['title' => 'Ringan (P3K)', 'short' => 'Cedera/sakit ringan, P3K (No LTI)'],
        2 => ['title' => 'Ringan LTI', 'short' => 'Cedera/sakit, hilang hari kerja, tidak cacat'],
        3 => ['title' => 'Cacat Permanen (LTI)', 'short' => 'Cedera dengan cacat permanen'],
        4 => ['title' => 'Cacat Permanen / Fatality (1 Orang)', 'short' => 'Kematian/cacat fisik 1 orang'],
        5 => ['title' => 'Fatality (>1 Orang / Kerugian Besar)', 'short' => 'Kematian >1 orang / kerugian material besar']
    ];

    public const LIKELIHOOD_DEFINITIONS = [
        1 => ['title' => 'Unlikely (Jarang)', 'short' => 'Tidak pernah terjadi (≈ 1x/thn)'],
        2 => ['title' => 'Rarely (Kecil Kemungkinan)', 'short' => 'Hampir tidak mungkin (≈ 2–5x/thn)'],
        3 => ['title' => 'Possible (Ada Kemungkinan)', 'short' => 'Beberapa kali/bulan (≈ 6–10x/thn)'],
        4 => ['title' => 'Probable (Kemungkinan Besar)', 'short' => 'Beberapa kali/minggu (≈ 11–19x/thn)'],
        5 => ['title' => 'Almost Certain (Pasti)', 'short' => 'Setiap hari (> 19x/thn)']
    ];

    public static function evaluate(int $severity = 2, int $likelihood = 2): array
    {
        $s = max(1, min(5, $severity));
        $l = max(1, min(5, $likelihood));

        $cell = self::LOOKUP_MATRIX[$s][$l];
        $score = $cell['score'];
        $level = $cell['level'];

        $isOtpRequired = $score > 9;
        $isAdditionalControlRequired = $score >= 5;

        $badgeClass = match ($level) {
            'Low'      => 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            'Moderate' => 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            'High'     => 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            'Extreme'  => 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        };

        return [
            'severity'                    => $s,
            'likelihood'                  => $l,
            'score'                       => $score,
            'level'                       => $level,
            'label'                       => "{$score} {$level}",
            'badgeClass'                  => $badgeClass,
            'isOtpRequired'               => $isOtpRequired,
            'isAdditionalControlRequired' => $isAdditionalControlRequired
        ];
    }
}
