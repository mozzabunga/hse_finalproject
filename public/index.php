<?php

declare(strict_types=1);

/**
 * PT MINDA AUTOMOTIVE INDONESIA - HSE PORTAL
 * Primary Front Controller (PHP 8.2+ MVC)
 */

// Force UTC Timezone across all server execution
date_default_timezone_set('UTC');

// Error handling settings
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Autoloader for App\ namespace
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/../app/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

require_once __DIR__ . '/../app/helpers.php';

use App\Core\Env;
use App\Core\Request;
use App\Core\Router;
use App\Core\Session;
use App\Core\I18n;
use App\Controllers\HomeController;
use App\Controllers\PublicTrackerController;
use App\Controllers\HazardReportController;
use App\Controllers\WorkflowController;
use App\Controllers\AuthController;
use App\Controllers\OfficerController;

// Load Environment Configuration
Env::load(__DIR__ . '/../.env');

// Initialize Session & Language
Session::start();
I18n::init();

$request = new Request();
$router = new Router();

// ----------------------------------------------------------------------------
// ROUTE REGISTRATION
// ----------------------------------------------------------------------------

// Home / Landing Page
$router->get('/', [HomeController::class, 'index']);

// SOP K3 (Standard Operating Procedure)
$router->get('/workflow', [WorkflowController::class, 'index']);

// Public Tracker & Search
$router->get('/tracker', [PublicTrackerController::class, 'search']);
$router->get('/track', [PublicTrackerController::class, 'search']);
$router->get('/tracker/{ticketId}', [PublicTrackerController::class, 'view']);
$router->post('/tracker/{ticketId}/comment', [PublicTrackerController::class, 'addComment']);

// Hazard Reporting & Submission
$router->get('/report', [HazardReportController::class, 'showForm']);
$router->post('/report', [HazardReportController::class, 'submit']);
$router->get('/processing', [HazardReportController::class, 'processing']);
$router->get('/submitted', [HazardReportController::class, 'submitted']);

// Officer Authentication
$router->get('/login', [AuthController::class, 'showLogin']);
$router->post('/login', [AuthController::class, 'login']);
$router->get('/logout', [AuthController::class, 'logout']);
$router->get('/change-password', [AuthController::class, 'showChangePassword']);
$router->post('/change-password', [AuthController::class, 'changePassword']);

// Officer Portal & Subtabs (Subtab 1: Dashboard)
$router->get('/admin', [OfficerController::class, 'dashboard']);
$router->get('/admin/dashboard', [OfficerController::class, 'dashboard']);
$router->get('/admin/export-executive-pdf', [OfficerController::class, 'exportExecutivePdf']);

// Officer Portal Subtab 2: Safety Tickets Ledger & DFA Transitions
$router->get('/admin/tickets', [OfficerController::class, 'tickets']);
$router->post('/admin/tickets/{id}/update', [OfficerController::class, 'updateTicket']);
$router->post('/admin/tickets/{id}/edit', [OfficerController::class, 'editReport']);
$router->post('/admin/tickets/{id}/comment', [OfficerController::class, 'addTicketComment']);
$router->post('/admin/tickets/{id}/delete', [OfficerController::class, 'deleteTicket']);
$router->get('/admin/tickets/{id}/pdf', [OfficerController::class, 'exportTicketPdf']);

// Health Check API
$router->get('/api/health', function (Request $req) {
    \App\Core\Response::json([
        'status'    => 'ok',
        'service'   => 'PT Minda HSE Portal PHP Engine',
        'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
        'timezone'  => 'UTC (Display WIB)'
    ]);
});

// Notifications API Stub for Polling
$router->get('/api/notifications', function (Request $req) {
    \App\Core\Response::json(['notifications' => [], 'unreadCount' => 0]);
});

$router->post('/api/notifications/mark-all-read', function (Request $req) {
    \App\Core\Response::json(['success' => true]);
});

// Dispatch current request
$router->dispatch($request);
