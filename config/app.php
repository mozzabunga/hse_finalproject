<?php
/**
 * Application Configuration
 */

$appSecret = getenv('APP_SECRET');
if (empty($appSecret)) {
    // Enforce APP_SECRET without any hardcoded default fallback
    throw new \RuntimeException('CRITICAL: APP_SECRET is not configured in .env. Please generate a 32-character random key.');
}

return [
    'name'         => getenv('APP_NAME') ?: 'PT MINDA HSE Portal',
    'env'          => getenv('APP_ENV') ?: 'production',
    'debug'        => filter_var(getenv('APP_DEBUG') ?: false, FILTER_VALIDATE_BOOLEAN),
    'url'          => rtrim(getenv('APP_URL') ?: 'http://localhost/hse-portal', '/'),
    'timezone'     => getenv('APP_TIMEZONE') ?: 'UTC',
    'display_tz'   => 'Asia/Jakarta', // WIB
    'default_lang' => getenv('APP_DEFAULT_LANG') ?: 'en',
    'secret'       => $appSecret,
];
