<?php

declare(strict_types=1);

/**
 * Global Helper Functions
 * Supports running in subfolders (e.g. http://localhost/hse-portal or http://localhost/hse-portal/public)
 * and root domains (e.g. http://localhost:3000)
 */

if (!function_exists('base_path_url')) {
    function base_path_url(): string
    {
        static $base = null;
        if ($base !== null) {
            return $base;
        }

        $appUrl = getenv('APP_URL') ?: '';
        if (!empty($appUrl)) {
            $parsedPath = parse_url($appUrl, PHP_URL_PATH);
            $base = $parsedPath ? rtrim($parsedPath, '/') : '';
        } else {
            $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
            $dir = dirname($scriptName);
            $base = ($dir === '/' || $dir === '\\') ? '' : rtrim(str_replace('\\', '/', $dir), '/');
            if (str_ends_with($base, '/public')) {
                $base = substr($base, 0, -7);
            }
        }

        return $base;
    }
}

if (!function_exists('url')) {
    function url(string $path = ''): string
    {
        $base = base_path_url();
        $trimmed = ltrim($path, '/');
        
        if ($trimmed === '') {
            return $base === '' ? '/' : $base;
        }

        return ($base === '' ? '' : $base) . '/' . $trimmed;
    }
}

if (!function_exists('asset')) {
    function asset(string $path): string
    {
        return url($path);
    }
}
