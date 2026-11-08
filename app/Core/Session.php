<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Secure Session Manager
 * Enforces HttpOnly, SameSite, and Session ID regeneration on login.
 * Unifies Flash messaging, Authentication checks, and Single CSRF system.
 */
class Session
{
    private static bool $started = false;

    public static function start(): void
    {
        if (self::$started || session_status() === PHP_SESSION_ACTIVE) {
            self::$started = true;
            return;
        }

        $lifetime = 60 * 60 * 24 * 7; // 7 days
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');

        session_set_cookie_params([
            'lifetime' => $lifetime,
            'path'     => '/',
            'domain'   => '',
            'secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        session_start();
        self::$started = true;

        if (!self::has('_csrf_token')) {
            self::set('_csrf_token', bin2hex(random_bytes(32)));
        }
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        self::start();
        return $_SESSION[$key] ?? $default;
    }

    public static function set(string $key, mixed $value): void
    {
        self::start();
        $_SESSION[$key] = $value;
    }

    public static function has(string $key): bool
    {
        self::start();
        return isset($_SESSION[$key]);
    }

    public static function remove(string $key): void
    {
        self::start();
        unset($_SESSION[$key]);
    }

    /**
     * Flash messaging system:
     * - If $value is given: stores message in session for next request.
     * - If $value is null: retrieves and deletes message from session.
     */
    public static function flash(string $key, mixed $value = null): mixed
    {
        self::start();
        if ($value !== null) {
            $_SESSION['_flash'][$key] = $value;
            return $value;
        }

        if (isset($_SESSION['_flash'][$key])) {
            $msg = $_SESSION['_flash'][$key];
            unset($_SESSION['_flash'][$key]);
            return $msg;
        }

        return null;
    }

    /**
     * Check if user is currently authenticated
     */
    public static function isAuthenticated(): bool
    {
        self::start();
        return !empty($_SESSION['user']) || !empty($_SESSION['auth_user']);
    }

    /**
     * Get currently logged-in user profile array
     */
    public static function user(): ?array
    {
        self::start();
        return $_SESSION['user'] ?? $_SESSION['auth_user'] ?? null;
    }

    public static function regenerate(): void
    {
        self::start();
        session_regenerate_id(true);
        self::set('_csrf_token', bin2hex(random_bytes(32)));
    }

    public static function destroy(): void
    {
        self::start();
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params["path"],
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }
        session_destroy();
        self::$started = false;
    }

    /**
     * Single CSRF Token Generator
     */
    public static function csrfToken(): string
    {
        self::start();
        return (string)self::get('_csrf_token', '');
    }

    public static function getCsrfToken(): string
    {
        return self::csrfToken();
    }

    /**
     * Single CSRF Token Validator
     */
    public static function validateCsrf(?string $token): bool
    {
        if (empty($token)) {
            return false;
        }
        return hash_equals(self::csrfToken(), (string)$token);
    }

    public static function validateCsrfToken(?string $token): bool
    {
        return self::validateCsrf($token);
    }
}
