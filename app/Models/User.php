<?php

declare(strict_types=1);

namespace App\Models;

/**
 * User Account Model
 */
class User extends BaseModel
{
    public static function resolveEmail(string $input): string
    {
        $clean = strtolower(trim($input));
        if (str_contains($clean, 'mozza') || $clean === 'admin') {
            return 'mozza.bunga.tarmuji.07@gmail.com';
        }
        if (!str_contains($clean, '@')) {
            if (str_contains($clean, 'purwanto')) return 'purwanto@mindaauto.co.id';
            if (str_contains($clean, 'anita')) return 'anita@mindaauto.co.id';
            if (str_contains($clean, 'asep')) return 'asep.permana@mindaauto.co.id';
            if (str_contains($clean, 'hrga')) return 'hrga_admin@mindaauto.co.id';
            if (str_contains($clean, 'supervisor')) return 'hse_supervisor@mindaauto.co.id';
            if (str_contains($clean, 'director') || str_contains($clean, 'presdir') || str_contains($clean, 'president')) {
                return 'president_director@mindaauto.co.id';
            }
            return $clean . '@mindaauto.co.id';
        }
        return $clean;
    }

    public static function findByEmail(string $email): ?array
    {
        $resolved = self::resolveEmail($email);
        $stmt = self::getDb()->prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1");
        $stmt->execute([$resolved]);
        return $stmt->fetch() ?: null;
    }

    public static function findById(string $id): ?array
    {
        $stmt = self::getDb()->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public static function updatePassword(string $userId, string $newPassword): bool
    {
        $hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = self::getDb()->prepare("
            UPDATE users 
            SET password_hash = ?, must_change_password = 0, updated_at = UTC_TIMESTAMP() 
            WHERE id = ?
        ");
        return $stmt->execute([$hash, $userId]);
    }

    public static function recordLogin(string $userId): void
    {
        $stmt = self::getDb()->prepare("UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?");
        $stmt->execute([$userId]);
    }
}
