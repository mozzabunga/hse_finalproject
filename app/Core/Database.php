<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;

/**
 * Singleton Database Manager
 * Ensures single PDO connection lifecycle with forced UTC timezone.
 */
class Database
{
    private static ?PDO $instance = null;

    private function __construct()
    {
    }

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $config = require __DIR__ . '/../../config/database.php';
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                $config['host'],
                $config['port'],
                $config['database'],
                $config['charset']
            );

            try {
                self::$instance = new PDO(
                    $dsn,
                    $config['username'],
                    $config['password'],
                    $config['options']
                );
                self::$instance->exec("SET time_zone = '+00:00'");
            } catch (PDOException $e) {
                // If database does not exist or connection fails
                die('Database Connection Error: ' . $e->getMessage() . "\nPlease ensure MySQL is running in XAMPP and the database '" . htmlspecialchars($config['database']) . "' is created.");
            }
        }

        return self::$instance;
    }
}
