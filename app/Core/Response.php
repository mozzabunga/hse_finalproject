<?php

declare(strict_types=1);

namespace App\Core;

/**
 * HTTP Response Handler
 * Handles template rendering, security headers, JSON responses, and redirects.
 */
class Response
{
    public static function setSecurityHeaders(): void
    {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    }

    public static function json(array $data, int $status = 200): void
    {
        self::setSecurityHeaders();
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function redirect(string $url, int $status = 302): void
    {
        http_response_code($status);
        header('Location: ' . $url);
        exit;
    }

    public static function render(string $viewPath, array $data = [], ?string $layout = 'main'): void
    {
        self::setSecurityHeaders();
        header('Content-Type: text/html; charset=utf-8');

        // Extract variables to local scope
        extract($data, EXTR_SKIP);

        $viewFile = __DIR__ . '/../Views/' . ltrim($viewPath, '/') . '.php';
        if (!file_exists($viewFile)) {
            die("View template not found: {$viewPath}");
        }

        ob_start();
        require $viewFile;
        $content = ob_get_clean();

        if ($layout !== null) {
            $layoutFile = __DIR__ . '/../Views/layouts/' . $layout . '.php';
            if (!file_exists($layoutFile)) {
                die("Layout template not found: {$layout}");
            }
            require $layoutFile;
        } else {
            echo $content;
        }
        exit;
    }
}
