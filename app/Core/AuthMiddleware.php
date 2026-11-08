<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Authentication & Security Middleware
 * Enforces session authentication, CSRF validation on mutating HTTP methods,
 * and role-based authorization for all /admin/* routes.
 */
class AuthMiddleware
{
    /**
     * Protect /admin/* routes: Login + CSRF for POST + Officer Role
     */
    public static function requireOfficer(Request $request): array
    {
        Session::start();
        $user = Session::user();

        if (!$user) {
            if ($request->isJson() || (isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json'))) {
                Response::json(['error' => 'Sesi kedaluwarsa. Silakan masuk kembali.'], 401);
            }
            Session::flash('login_error', 'Silakan masuk terlebih dahulu untuk mengakses Portal Petugas.');
            Response::redirect('/login');
            exit;
        }

        if (!Policy::isOfficer($user)) {
            if ($request->isJson()) {
                Response::json(['error' => 'Akses ditolak: Anda tidak memiliki izin petugas K3.'], 403);
            }
            http_response_code(403);
            die('Akses ditolak: Akun Anda tidak memiliki hak akses ke Portal Petugas K3 PT Minda Automotive Indonesia.');
        }

        // Enforce CSRF on all mutating methods (POST, PUT, DELETE, PATCH)
        $method = $request->method();
        if (in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH'], true)) {
            $token = (string)($request->post('csrf_token') ?: $request->header('X-CSRF-TOKEN') ?: '');
            if (!Session::validateCsrf($token)) {
                if ($request->isJson()) {
                    Response::json(['error' => 'Sesi formulir kedaluwarsa atau token CSRF tidak valid. Silakan muat ulang halaman.'], 403);
                }
                http_response_code(403);
                die('Validasi token CSRF gagal. Silakan kembali, muat ulang halaman, dan coba lagi.');
            }
        }

        return $user;
    }

    /**
     * Restrict strictly to hse_admin (Templates, Recipients, Ticket Delete)
     */
    public static function requireHseAdmin(Request $request): array
    {
        $user = self::requireOfficer($request);

        if (!Policy::isHseAdmin($user)) {
            if ($request->isJson()) {
                Response::json(['error' => 'Akses ditolak: Menu dan endpoint ini hanya dapat diakses oleh Administrator HSE.'], 403);
            }
            http_response_code(403);
            die('Akses Ditolak: Otorisasi khusus HSE Administrator (Purwanto / Mozza Bunga) diperlukan untuk mengelola data ini.');
        }

        return $user;
    }

    /**
     * Enforce writable permissions (blocks President Director read-only account from mutating state)
     */
    public static function requireWritable(Request $request): array
    {
        $user = self::requireOfficer($request);

        if (Policy::isReadOnly($user)) {
            if ($request->isJson()) {
                Response::json(['error' => 'Akun President Director bersifat Read-Only. Perubahan data tidak diizinkan.'], 403);
            }
            http_response_code(403);
            die('Akses Ditolak: Akun President Director berstatus Pengawasan Eksekutif (Read-Only). Anda tidak dapat mengubah status atau menghapus data.');
        }

        return $user;
    }
}
