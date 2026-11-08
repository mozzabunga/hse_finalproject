<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use PDO;

/**
 * Base Model
 * Demonstrates OOP Encapsulation for database entities.
 */
abstract class BaseModel
{
    protected static function getDb(): PDO
    {
        return Database::getConnection();
    }
}
