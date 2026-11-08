<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Base Controller
 * Demonstrates OOP Inheritance for all application controllers.
 */
abstract class Controller
{
    protected ?array $currentUser = null;

    public function __construct()
    {
        I18n::init();
        Session::start();
        $this->currentUser = Session::user();
    }

    protected function render(string $view, array $data = [], ?string $layout = 'main'): void
    {
        $defaultData = [
            'currentUser' => $this->currentUser,
            'csrfToken'   => Session::csrfToken(),
            'currentLang' => I18n::lang(),
        ];

        Response::render($view, array_merge($defaultData, $data), $layout);
    }

    protected function json(array $data, int $status = 200): void
    {
        Response::json($data, $status);
    }

    protected function redirect(string $url): void
    {
        Response::redirect($url);
    }

    protected function validateCsrf(Request $request): void
    {
        if (!$request->validateCsrf()) {
            if ($request->isJson()) {
                Response::json(['error' => 'CSRF Token Mismatch or Expired'], 403);
            }
            die('CSRF token validation failed. Please refresh the page and try again.');
        }
    }

    protected function requireAuth(): array
    {
        if ($this->currentUser === null) {
            if (isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json')) {
                Response::json(['error' => 'Unauthorized. Please login first.'], 401);
            }
            Response::redirect('/login');
        }
        return $this->currentUser;
    }

    protected function requireRole(array $allowedRoles): array
    {
        $user = $this->requireAuth();
        $role = $user['role'] ?? 'employee';

        if (!in_array($role, $allowedRoles, true)) {
            if (isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json')) {
                Response::json(['error' => 'Forbidden: Insufficient privileges.'], 403);
            }
            die('Access Denied: You do not possess the required authorization level.');
        }

        return $user;
    }
}
