<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * Tampilkan Halaman Login Petugas K3
     */
    public function showLogin(Request $request): void
    {
        if (Session::isAuthenticated()) {
            Response::redirect('/admin');
            return;
        }

        $rememberedUsername = $_COOKIE['minda_hse_remembered_username'] ?? '';
        $errorMsg = Session::flash('login_error');

        Response::render('auth/login', [
            'pageTitle'          => __('login.title') . ' — PT Minda Automotive Indonesia',
            'rememberedUsername' => $rememberedUsername,
            'errorMsg'           => $errorMsg,
            'csrfToken'          => Session::getCsrfToken()
        ]);
    }

    /**
     * Proses Login Form Submission
     */
    public function login(Request $request): void
    {
        $token = (string)$request->input('csrf_token', '');
        if (!Session::validateCsrfToken($token)) {
            Session::flash('login_error', 'Sesi kedaluwarsa atau token CSRF tidak valid. Silakan coba kembali.');
            Response::redirect('/login');
            return;
        }

        $username = trim((string)$request->input('username', ''));
        $password = (string)$request->input('password', '');
        $rememberMe = !empty($request->input('remember_me'));

        if ($username === '' || $password === '') {
            Session::flash('login_error', 'Silakan masukkan username/email dan kata sandi.');
            Response::redirect('/login');
            return;
        }

        $user = User::findByEmail($username);

        if (!$user) {
            Session::flash('login_error', "Access Denied\n\nYour account is not registered as an authorized HSE Officer.\nPlease contact the HSE System Administrator.");
            Response::redirect('/login');
            return;
        }

        if (empty($user['is_active'])) {
            Session::flash('login_error', "Akun ini telah dinonaktifkan.\nSilakan hubungi Administrator HSE PT Minda Automotive Indonesia.");
            Response::redirect('/login');
            return;
        }

        if (!password_verify($password, $user['password_hash'])) {
            Session::flash('login_error', "Kombinasi email/username dan kata sandi salah.\nPeriksa kembali kredensial Anda.");
            Response::redirect('/login');
            return;
        }

        // Pengaturan Cookie Remember Me
        if ($rememberMe) {
            setcookie('minda_hse_remembered_username', $username, [
                'expires'  => time() + (30 * 86400),
                'path'     => '/',
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
        } else {
            setcookie('minda_hse_remembered_username', '', [
                'expires'  => time() - 3600,
                'path'     => '/'
            ]);
        }

        // Jika akun ditandai wajib ganti password (misal login pertama kali dari seeder)
        if (!empty($user['must_change_password'])) {
            $_SESSION['temp_auth_user_id'] = $user['id'];
            $_SESSION['temp_auth_user_email'] = $user['email'];
            Response::redirect('/change-password');
            return;
        }

        // Login Sukses: Regenerasi ID Sesi & Simpan Profile Petugas
        Session::regenerate();
        Session::set('user', [
            'id'            => $user['id'],
            'email'         => $user['email'],
            'name'          => $user['name'],
            'role'          => $user['role'],
            'department_id' => $user['department_id'],
            'position'      => $user['position']
        ]);

        User::recordLogin($user['id']);

        // Catat Audit Log Login
        try {
            $pdo = \App\Core\Database::getConnection();
            $stmt = $pdo->prepare("
                INSERT INTO audit_logs (id, hazard_id, user_id, user_email, action, details, created_at)
                VALUES (?, NULL, ?, ?, 'User Login', ?, UTC_TIMESTAMP())
            ");
            $stmt->execute([
                bin2hex(random_bytes(16)),
                $user['id'],
                $user['email'],
                "Petugas {$user['name']} ({$user['role']}) berhasil login dari IP " . $request->ip()
            ]);
        } catch (\Throwable $e) {
            // Fail safe on audit logging
        }

        Response::redirect('/admin');
    }

    /**
     * Tampilkan Halaman Wajib Ganti Password
     */
    public function showChangePassword(Request $request): void
    {
        $userId = $_SESSION['temp_auth_user_id'] ?? Session::get('user')['id'] ?? null;
        if (!$userId) {
            Response::redirect('/login');
            return;
        }

        Response::render('auth/change_password', [
            'pageTitle' => 'Ganti Kata Sandi — PT Minda Automotive Indonesia',
            'errorMsg'  => Session::flash('pwd_error'),
            'csrfToken' => Session::getCsrfToken()
        ]);
    }

    /**
     * Proses Pembaruan Kata Sandi
     */
    public function changePassword(Request $request): void
    {
        $token = (string)$request->input('csrf_token', '');
        if (!Session::validateCsrfToken($token)) {
            Session::flash('pwd_error', 'Sesi kedaluwarsa. Silakan coba kembali.');
            Response::redirect('/change-password');
            return;
        }

        $userId = $_SESSION['temp_auth_user_id'] ?? Session::get('user')['id'] ?? null;
        if (!$userId) {
            Response::redirect('/login');
            return;
        }

        $user = User::findById($userId);
        if (!$user) {
            Response::redirect('/login');
            return;
        }

        $newPassword = (string)$request->input('new_password', '');
        $confirmPassword = (string)$request->input('confirm_password', '');

        if (strlen($newPassword) < 8) {
            Session::flash('pwd_error', 'Kata sandi baru minimal harus 8 karakter.');
            Response::redirect('/change-password');
            return;
        }

        if ($newPassword !== $confirmPassword) {
            Session::flash('pwd_error', 'Konfirmasi kata sandi tidak cocok.');
            Response::redirect('/change-password');
            return;
        }

        User::updatePassword($userId, $newPassword);

        // Bersihkan temp session dan set user session resmi
        unset($_SESSION['temp_auth_user_id'], $_SESSION['temp_auth_user_email']);
        Session::regenerate();
        Session::set('user', [
            'id'            => $user['id'],
            'email'         => $user['email'],
            'name'          => $user['name'],
            'role'          => $user['role'],
            'department_id' => $user['department_id'],
            'position'      => $user['position']
        ]);

        Response::redirect('/admin');
    }

    /**
     * Keluar dari Sistem (Logout)
     */
    public function logout(Request $request): void
    {
        $user = Session::get('user');
        if ($user) {
            try {
                $pdo = \App\Core\Database::getConnection();
                $stmt = $pdo->prepare("
                    INSERT INTO audit_logs (id, hazard_id, user_id, user_email, action, details, created_at)
                    VALUES (?, NULL, ?, ?, 'User Logout', ?, UTC_TIMESTAMP())
                ");
                $stmt->execute([
                    bin2hex(random_bytes(16)),
                    $user['id'],
                    $user['email'],
                    "Petugas {$user['name']} keluar dari sesi sistem"
                ]);
            } catch (\Throwable $e) {}
        }

        Session::destroy();
        Response::redirect('/');
    }
}
