<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Models\HazardReport;

/**
 * Home Controller (Public Landing & Quick Navigation)
 */
class HomeController extends Controller
{
    public function index(Request $request): void
    {
        $stats = HazardReport::getHomeStats();
        $recentReports = HazardReport::getRecentPublicReports(6);

        $selectedTicketId = $request->get('ticket') ?: $request->get('id');
        $selectedReport = null;
        if ($selectedTicketId) {
            $selectedReport = HazardReport::findById($selectedTicketId);
        }

        $this->render('home/index', [
            'stats'          => $stats,
            'recentReports'  => $recentReports,
            'selectedReport' => $selectedReport,
            'searchQuery'    => $request->get('q', ''),
        ]);
    }
}
