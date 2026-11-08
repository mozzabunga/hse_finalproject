<?php

declare(strict_types=1);

namespace App\Models;

/**
 * Hazard Comments Model
 */
class HazardComment extends BaseModel
{
    public static function getForTicket(string $hazardId, bool $includeInternal = false): array
    {
        $sql = "SELECT * FROM hazard_comments WHERE hazard_id = ?";
        if (!$includeInternal) {
            $sql .= " AND is_internal_only = 0";
        }
        $sql .= " ORDER BY created_at ASC";

        $stmt = self::getDb()->prepare($sql);
        $stmt->execute([$hazardId]);
        return $stmt->fetchAll();
    }

    public static function add(string $hazardId, string $userId, string $userName, string $userRole, string $comment, bool $isInternal = false): string
    {
        $id = bin2hex(random_bytes(16));
        $stmt = self::getDb()->prepare("
            INSERT INTO hazard_comments (id, hazard_id, user_id, user_name, user_role, comment, is_internal_only, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
        ");
        $stmt->execute([
            $id,
            $hazardId,
            $userId,
            $userName,
            $userRole,
            $comment,
            $isInternal ? 1 : 0
        ]);
        return $id;
    }
}
