<?php

declare(strict_types=1);

namespace App\Services;

use DateTime;
use DateTimeZone;

/**
 * WIB (Asia/Jakarta) Date Formatter
 * Strict 100% parity with src/lib/dateUtils.ts
 */
class DateFormatter
{
    public static function formatWibDateTime(?string $utcDateStr): string
    {
        if (empty($utcDateStr)) {
            return '-';
        }

        try {
            $dt = new DateTime($utcDateStr, new DateTimeZone('UTC'));
            $dt->setTimezone(new DateTimeZone('Asia/Jakarta'));
            return $dt->format('d M Y, H:i') . ' WIB';
        } catch (\Exception) {
            return (string)$utcDateStr;
        }
    }

    public static function formatWibDate(?string $utcDateStr): string
    {
        if (empty($utcDateStr)) {
            return '-';
        }

        try {
            $dt = new DateTime($utcDateStr, new DateTimeZone('UTC'));
            $dt->setTimezone(new DateTimeZone('Asia/Jakarta'));
            return $dt->format('d M Y');
        } catch (\Exception) {
            return (string)$utcDateStr;
        }
    }

    public static function daysOpen(?string $createdAtUtc, ?string $resolvedAtUtc = null): int
    {
        if (empty($createdAtUtc)) {
            return 0;
        }

        try {
            $start = new DateTime($createdAtUtc, new DateTimeZone('UTC'));
            $end = $resolvedAtUtc ? new DateTime($resolvedAtUtc, new DateTimeZone('UTC')) : new DateTime('now', new DateTimeZone('UTC'));
            $diff = $start->diff($end);
            return (int)$diff->days;
        } catch (\Exception) {
            return 0;
        }
    }
}
