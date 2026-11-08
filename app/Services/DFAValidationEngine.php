<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Deterministic Finite Automaton (DFA) Validation Engine
 * Validates allowable state transitions for hazard tickets.
 * 100% parity with src/types.ts DFAValidationEngine.
 */
class DFAValidationEngine
{
    public const ALLOWED_TRANSITIONS = [
        'NewReport'          => ['PendingValidation'],
        'PendingValidation'  => ['UnderInvestigation'],
        'UnderInvestigation' => ['ActionRequired', 'WaitingProcurement', 'Implementation', 'Completed'],
        'ActionRequired'     => ['WaitingProcurement', 'Implementation', 'Completed'],
        'WaitingProcurement' => ['Implementation', 'Completed'],
        'Implementation'     => ['Completed', 'UnderInvestigation'],
        'Completed'          => ['Resolved', 'UnderInvestigation'],
        'Resolved'           => ['UnderInvestigation'],
    ];

    public static function isValidTransition(string $current, string $next): bool
    {
        if ($current === $next) {
            return true;
        }

        $targets = self::ALLOWED_TRANSITIONS[$current] ?? [];
        return in_array($next, $targets, true);
    }

    public static function getNextAllowedStates(string $current): array
    {
        return self::ALLOWED_TRANSITIONS[$current] ?? [];
    }

    public static function mapStatusToLabel(string $status): string
    {
        return match ($status) {
            'NewReport'          => 'New Report',
            'PendingValidation'  => 'Pending Validation',
            'UnderInvestigation' => 'Under Investigation',
            'ActionRequired'     => 'Action Required',
            'WaitingProcurement' => 'Waiting Procurement',
            'Implementation'     => 'Implementation',
            'Completed'          => 'Completed',
            'Resolved'           => 'Resolved',
            default              => $status,
        };
    }
}
