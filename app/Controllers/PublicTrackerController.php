<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Models\HazardReport;
use App\Models\HazardComment;
use App\Services\HazardPresentation;
use App\Services\RiskMatrixEvaluator;

/**
 * Public Tracker Controller
 */
class PublicTrackerController extends Controller
{
    public function search(Request $request): void
    {
        $q = trim((string)$request->get('q', ''));
        $results = [];

        if ($q !== '') {
            $results = HazardReport::searchPublic($q);
        }

        if ($request->isJson()) {
            $this->json(['results' => $results, 'query' => $q]);
            return;
        }

        $this->render('home/tracker', [
            'searchQuery'    => $q,
            'results'        => $results,
            'selectedReport' => count($results) === 1 ? $results[0] : null,
        ]);
    }

    public function view(Request $request, string $ticketId): void
    {
        $report = HazardReport::findById($ticketId);

        if (!$report) {
            $this->render('home/tracker', [
                'searchQuery'    => $ticketId,
                'results'        => [],
                'selectedReport' => null,
                'notFound'       => true,
            ]);
            return;
        }

        $parsed = HazardPresentation::parseDetails($report);
        $comments = HazardComment::getForTicket($report['id'], false);
        $risk = RiskMatrixEvaluator::evaluate((int)($report['severity'] ?? 2), (int)($report['likelihood'] ?? 2));

        $this->render('home/tracker', [
            'searchQuery'    => $ticketId,
            'results'        => [$report],
            'selectedReport' => $report,
            'parsed'         => $parsed,
            'comments'       => $comments,
            'risk'           => $risk,
        ]);
    }

    public function addComment(Request $request, string $ticketId): void
    {
        $this->validateCsrf($request);

        $report = HazardReport::findById($ticketId);
        if (!$report) {
            if ($request->isJson()) {
                $this->json(['error' => 'Report not found'], 404);
            }
            $this->redirect('/tracker');
        }

        $commentText = trim((string)$request->input('comment', ''));
        $authorName = trim((string)$request->input('name', 'Anonymous Worker'));

        if ($commentText !== '') {
            HazardComment::add(
                $report['id'],
                'public_user',
                $authorName ?: 'Anonymous Worker',
                'employee',
                $commentText,
                false
            );
        }

        if ($request->isJson()) {
            $this->json(['success' => true]);
            return;
        }

        $this->redirect('/tracker/' . urlencode($report['ticket_id']));
    }
}
