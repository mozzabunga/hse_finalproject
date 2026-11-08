<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Access Control Policy & Role-Based Authorization
 * Evaluates server-side session role (never from request parameters).
 * 
 * 8 Official Roles:
 *   1. hse_admin             (Full Admin: Tickets, Delete, Recipients, Templates, SLA, Audit)
 *   2. hse_officer           (Safety Inspector: DFA Transitions, PIC Notes, Review)
 *   3. ppe_officer           (PPE & Safety Equipment Specialist)
 *   4. hrga_admin            (HRGA & Facilities Lead - Operational Officer Privileges)
 *   5. env_officer           (Environmental & 5S Specialist)
 *   6. management_supervisor (HSE Supervisor: Management Oversight & Weekly Reporting)
 *   7. management_director   (President Director: Strictly Executive Read-Only)
 *   8. employee              (Employee: Public reporter only, no officer access)
 */
class Policy
{
    public const ROLES = [
        'hse_admin',
        'hse_officer',
        'ppe_officer',
        'hrga_admin',
        'env_officer',
        'management_supervisor',
        'management_director',
        'employee'
    ];

    /**
     * Check if currently authenticated user has an officer role
     */
    public static function isOfficer(?array $user = null): bool
    {
        $role = self::getUserRole($user);
        return in_array($role, [
            'hse_admin',
            'hse_officer',
            'ppe_officer',
            'hrga_admin',
            'env_officer',
            'management_supervisor',
            'management_director'
        ], true);
    }

    /**
     * Strictly restricted to hse_admin
     */
    public static function isHseAdmin(?array $user = null): bool
    {
        return self::getUserRole($user) === 'hse_admin';
    }

    /**
     * President Director: Read-Only check
     */
    public static function isReadOnly(?array $user = null): bool
    {
        return self::getUserRole($user) === 'management_director';
    }

    /**
     * Permission: Can manage Notification Recipients
     */
    public static function canManageRecipients(?array $user = null): bool
    {
        return self::isHseAdmin($user);
    }

    /**
     * Permission: Can manage Notification Templates
     */
    public static function canManageTemplates(?array $user = null): bool
    {
        return self::isHseAdmin($user);
    }

    /**
     * Permission: Can trigger SLA Escalation Checker
     */
    public static function canManageSla(?array $user = null): bool
    {
        return self::isHseAdmin($user);
    }

    /**
     * Permission: Can permanently delete tickets
     */
    public static function canDeleteTicket(?array $user = null): bool
    {
        return self::isHseAdmin($user);
    }

    /**
     * Permission: Can update ticket status / DFA state machine
     */
    public static function canUpdateTicket(?array $user = null): bool
    {
        $role = self::getUserRole($user);
        // President Director is strictly read-only, employee has no officer access
        return in_array($role, [
            'hse_admin',
            'hse_officer',
            'ppe_officer',
            'hrga_admin',
            'env_officer',
            'management_supervisor'
        ], true);
    }

    /**
     * Permission: Can assign PIC to ticket
     */
    public static function canAssignPic(?array $user = null): bool
    {
        return self::canUpdateTicket($user);
    }

    /**
     * Permission: Can post internal officer comments
     */
    public static function canAddComment(?array $user = null): bool
    {
        return self::canUpdateTicket($user);
    }

    /**
     * Retrieve role strictly from server-side session
     */
    private static function getUserRole(?array $user = null): string
    {
        if ($user !== null && isset($user['role'])) {
            return (string)$user['role'];
        }

        $sessionUser = Session::user();
        return (string)($sessionUser['role'] ?? 'employee');
    }
}
