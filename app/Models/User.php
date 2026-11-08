<?php

declare(strict_types=1);

namespace App\Models;

/**
 * User Account Model
 */
class User extends BaseModel
{
    public static function findByEmail(string $email): ?array
    {
        $stmt = self::getDb()->prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1");
        $stmt->execute([$email]);
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
