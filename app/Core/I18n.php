<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Internationalization (i18n) Manager
 * Default language: English (corporate automotive terminology)
 * Supports Indonesian (100% exact parity with original texts)
 */
class I18n
{
    private static string $currentLang = 'en';
    private static array $translations = [];
    private static bool $initialized = false;

    public static function init(): void
    {
        if (self::$initialized) {
            return;
        }

        Session::start();

        // 1. Check GET override (?lang=id / ?lang=en)
        if (isset($_GET['lang']) && in_array($_GET['lang'], ['id', 'en'], true)) {
            self::$currentLang = $_GET['lang'];
            Session::set('app_lang', self::$currentLang);
            setcookie('app_lang', self::$currentLang, time() + (86400 * 30), '/');
        } elseif (Session::has('app_lang')) {
            self::$currentLang = Session::get('app_lang');
        } elseif (isset($_COOKIE['app_lang']) && in_array($_COOKIE['app_lang'], ['id', 'en'], true)) {
            self::$currentLang = $_COOKIE['app_lang'];
        } else {
            self::$currentLang = 'en'; // Approved default
        }

        $langFile = __DIR__ . '/../../lang/' . self::$currentLang . '.php';
        if (file_exists($langFile)) {
            self::$translations = require $langFile;
        }

        self::$initialized = true;
    }

    public static function lang(): string
    {
        self::init();
        return self::$currentLang;
    }

    public static function isEnglish(): bool
    {
        return self::lang() === 'en';
    }

    public static function isIndonesian(): bool
    {
        return self::lang() === 'id';
    }

    public static function trans(string $key, array $replace = []): string
    {
        self::init();
        $text = self::$translations[$key] ?? $key;

        foreach ($replace as $placeholder => $value) {
            $text = str_replace(':' . $placeholder, (string)$value, $text);
            $text = str_replace('{' . $placeholder . '}', (string)$value, $text);
        }

        return $text;
    }
}

/**
 * Global translation shortcut helper
 */
function __(string $key, array $replace = []): string
{
    return \App\Core\I18n::trans($key, $replace);
}

function e(?string $val): string
{
    return htmlspecialchars((string)($val ?? ''), ENT_QUOTES, 'UTF-8');
}
