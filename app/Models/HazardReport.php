<?php

declare(strict_types=1);

namespace App\Models;

use PDO;

/**
 * Hazard Report Model
 */
class HazardReport extends BaseModel
{
    public const STATUSES = [
        'NewReport',
        'PendingValidation',
        'UnderInvestigation',
        'ActionRequired',
        'WaitingProcurement',
        'Implementation',
        'Completed',
        'Resolved'
    ];

    public static function findById(string $id): ?array
    {
        $stmt = self::getDb()->prepare("SELECT * FROM hazard_reports WHERE id = ? OR ticket_id = ? LIMIT 1");
        $stmt->execute([$id, $id]);
        return $stmt->fetch() ?: null;
    }

    public static function searchPublic(string $query): array
    {
        $q = trim($query);
        if ($q === '') {
            return [];
        }

        // 1. Exact match on ticket ID first
        $stmt = self::getDb()->prepare("SELECT * FROM hazard_reports WHERE LOWER(ticket_id) = LOWER(?) LIMIT 1");
        $stmt->execute([$q]);
        $exact = $stmt->fetch();
        if ($exact) {
            return [$exact];
        }

        // 2. Keyword match on ticket_id, department, area, reporter_name, title, description
        $wildcard = '%' . $q . '%';
        $stmt = self::getDb()->prepare("
            SELECT * FROM hazard_reports
            WHERE ticket_id LIKE ?
               OR department LIKE ?
               OR area LIKE ?
               OR reporter_name LIKE ?
               OR title LIKE ?
               OR description LIKE ?
            ORDER BY created_at DESC
            LIMIT 20
        ");
        $stmt->execute([$wildcard, $wildcard, $wildcard, $wildcard, $wildcard, $wildcard]);
        return $stmt->fetchAll();
    }

    public static function getHomeStats(): array
    {
        $db = self::getDb();

        $total = (int)$db->query("SELECT COUNT(*) FROM hazard_reports")->fetchColumn();
        $completed = (int)$db->query("SELECT COUNT(*) FROM hazard_reports WHERE status IN ('Completed', 'Resolved')")->fetchColumn();
        $open = $total - $completed;
        
        // Overdue count: not completed and created > 3 days ago
        $overdue = (int)$db->query("
            SELECT COUNT(*) FROM hazard_reports 
            WHERE status NOT IN ('Completed', 'Resolved') 
              AND created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)
        ")->fetchColumn();

        // High priority / Critical
        $highRisk = (int)$db->query("
            SELECT COUNT(*) FROM hazard_reports 
            WHERE risk_level IN ('High', 'Extreme') AND status NOT IN ('Completed', 'Resolved')
        ")->fetchColumn();

        return [
            'totalReports'   => $total,
            'openReports'    => $open,
            'closedReports'  => $completed,
            'overdueReports' => $overdue,
            'highRiskOpen'   => $highRisk,
        ];
    }

    public static function getRecentPublicReports(int $limit = 5): array
    {
        $stmt = self::getDb()->prepare("
            SELECT * FROM hazard_reports 
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public static function generateTicketId(): string
    {
        $year = date('Y');
        $db = self::getDb();

        for ($i = 0; $i < 10; $i++) {
            $num = random_int(1, 9999);
            $candidate = sprintf('HZ-%s-%04d', $year, $num);

            $stmt = $db->prepare("SELECT COUNT(*) FROM hazard_reports WHERE ticket_id = ?");
            $stmt->execute([$candidate]);
            if ((int)$stmt->fetchColumn() === 0) {
                return $candidate;
            }
        }

        return sprintf('HZ-%s-%04d', $year, time() % 10000);
    }
}
