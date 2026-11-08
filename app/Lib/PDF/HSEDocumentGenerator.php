<?php

declare(strict_types=1);

namespace App\Lib\PDF;

use App\Services\DateFormatter;
use App\Services\RiskMatrixEvaluator;
use App\Services\HazardPresentation;

/**
 * Server-Side Document Generator for PT Minda Automotive Indonesia HSE Portal
 * Produces pure binary PDF documents without Node.js or browser dependencies.
 */
class HSEDocumentGenerator
{
    public static function generateTicketSummary(array $report): string
    {
        $pdf = new FPDF('P', 'mm', 'A4');
        $pdf->SetMargins(15, 15, 15);
        $pdf->AddPage();

        // 1. Top Header Banner
        $pdf->SetFillColor(15, 23, 42); // slate-900 (#0f172a)
        $pdf->Rect(15, 15, 180, 26, 'F');

        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetXY(20, 20);
        $pdf->Cell(120, 7, 'PT MINDA AUTOMOTIVE INDONESIA', 0, 1, 'L');

        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->SetTextColor(52, 211, 153); // emerald-400
        $pdf->SetX(20);
        $pdf->Cell(120, 5, 'HSE HAZARD & NEAR MISS REPORTING PORTAL', 0, 0, 'L');

        // Ticket ID Badge on Top Right
        $pdf->SetXY(140, 20);
        $pdf->SetFillColor(30, 41, 59); // slate-800
        $pdf->SetTextColor(52, 211, 153);
        $pdf->SetFont('courier', 'B', 12);
        $pdf->Cell(50, 10, $report['ticket_id'] ?? 'HZ-2026-XXXX', 1, 1, 'C', true);

        $pdf->Ln(12);

        // 2. Incident Summary Header
        $parsed = HazardPresentation::parseDetails($report);
        $risk = RiskMatrixEvaluator::evaluate((int)($report['severity'] ?? 2), (int)($report['likelihood'] ?? 2));

        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(180, 7, $parsed['summary'], 0, 1, 'L');

        $pdf->SetFont('helvetica', '', 9);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(180, 5, 'Status: ' . ($report['status'] ?? 'NewReport') . '  |  Category: Class ' . ($report['category'] ?? 'C') . '  |  Date: ' . DateFormatter::formatWibDateTime($report['created_at'] ?? 'now'), 0, 1, 'L');

        $pdf->Ln(4);
        $pdf->SetDrawColor(226, 232, 240);
        $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
        $pdf->Ln(5);

        // 3. Structured Data Grid
        $fields = [
            ['Reporter Name', $report['reporter_name'] ?? 'Anonymous Worker', 'Employee ID / NIK', $report['employee_id'] ?? 'EMP-0000'],
            ['Department', $report['department'] ?? 'Production', 'Exact Area', $report['area'] ?? 'Factory Floor'],
            ['Incident Date', DateFormatter::formatWibDate($report['incident_date'] ?? 'now'), 'Assigned PIC', $report['assigned_pic_name'] ?? 'HSE Team'],
            ['Priority', $report['priority'] ?? 'Medium', 'DFA Workflow State', $report['dfa_status'] ?? 'PendingValidation']
        ];

        foreach ($fields as $row) {
            $pdf->SetFillColor(248, 250, 252); // slate-50
            $pdf->SetFont('helvetica', 'B', 8);
            $pdf->SetTextColor(71, 85, 105);
            $pdf->Cell(35, 7, ' ' . $row[0], 1, 0, 'L', true);

            $pdf->SetFont('helvetica', '', 8);
            $pdf->SetTextColor(15, 23, 42);
            $pdf->Cell(55, 7, ' ' . $row[1], 1, 0, 'L');

            $pdf->SetFont('helvetica', 'B', 8);
            $pdf->SetTextColor(71, 85, 105);
            $pdf->Cell(35, 7, ' ' . $row[2], 1, 0, 'L', true);

            $pdf->SetFont('helvetica', '', 8);
            $pdf->SetTextColor(15, 23, 42);
            $pdf->Cell(55, 7, ' ' . $row[3], 1, 1, 'L');
        }

        $pdf->Ln(5);

        // 4. IK-01 Risk Evaluation Section
        $pdf->SetFillColor(241, 245, 249);
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(180, 7, ' K3 RISK MATRIX EVALUATION (IK PEDOMAN PEP-HSE-P-01-IK-01)', 1, 1, 'L', true);

        $pdf->SetFont('helvetica', '', 8);
        $pdf->Cell(60, 6, ' Severity: Level ' . $risk['severity'], 1, 0, 'L');
        $pdf->Cell(60, 6, ' Likelihood: Level ' . $risk['likelihood'], 1, 0, 'L');
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->Cell(60, 6, ' Score: ' . $risk['score'] . ' (' . $risk['level'] . ' Risk)', 1, 1, 'L');

        if (!empty($report['additional_control'])) {
            $pdf->SetFont('helvetica', 'B', 8);
            $pdf->Cell(180, 5, ' Hierarchy of Controls Plan:', 'LRT', 1, 'L');
            $pdf->SetFont('helvetica', '', 8);
            $pdf->MultiCell(180, 5, $report['additional_control'], 'LRB', 'L');
        }

        $pdf->Ln(5);

        // 5. Narrative Details
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->Cell(180, 6, 'FINDING DESCRIPTION & IMMEDIATE ACTION', 'B', 1, 'L');
        $pdf->SetFont('helvetica', '', 8);
        $pdf->Ln(2);
        $pdf->MultiCell(180, 5, $parsed['hazardDescription'] ?: ($report['description'] ?? 'N/A'), 0, 'L');

        $pdf->Ln(10);

        // 6. Sign-off Boxes
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->SetTextColor(71, 85, 105);
        $pdf->Cell(60, 5, 'Reported By (Pelapor)', 0, 0, 'C');
        $pdf->Cell(60, 5, 'Investigated By (Safety Officer)', 0, 0, 'C');
        $pdf->Cell(60, 5, 'Verified & Approved (HSE Lead)', 0, 1, 'C');

        $pdf->Ln(18);
        $pdf->SetFont('helvetica', '', 8);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(60, 5, '( ' . ($report['reporter_name'] ?? '...........................') . ' )', 0, 0, 'C');
        $pdf->Cell(60, 5, '( ' . ($report['assigned_pic_name'] ?? 'Anita / Safety Inspector') . ' )', 0, 0, 'C');
        $pdf->Cell(60, 5, '( Purwanto / Safety Officer Lead )', 0, 1, 'C');

        return $pdf->Output('S');
    }

    public static function generateExecutiveSummary(array $stats): string
    {
        $pdf = new FPDF('P', 'mm', 'A4');
        $pdf->SetMargins(15, 15, 15);
        $pdf->AddPage();

        // Header
        $pdf->SetFillColor(15, 23, 42);
        $pdf->Rect(15, 15, 180, 24, 'F');

        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 13);
        $pdf->SetXY(20, 19);
        $pdf->Cell(120, 6, 'PT MINDA AUTOMOTIVE INDONESIA', 0, 1, 'L');

        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->SetTextColor(52, 211, 153);
        $pdf->SetX(20);
        $pdf->Cell(120, 5, 'EXECUTIVE KPI & SAFETY COMPLIANCE SUMMARY', 0, 1, 'L');

        $pdf->Ln(14);
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(180, 7, '11 KEY PERFORMANCE INDICATORS (HSE DASHBOARD)', 0, 1, 'L');

        // Render KPI metric rows
        $kpis = [
            ['Total Hazards Logged', (string)($stats['totalReports'] ?? 0), 'Open Hazards (Active)', (string)($stats['openReports'] ?? 0)],
            ['Closed / Resolved', (string)($stats['closedReports'] ?? 0), 'SLA Breaches (>3 Days)', (string)($stats['overdueReports'] ?? 0)],
            ['SLA Compliance Rate', ($stats['slaComplianceRate'] ?? '98%'), 'Avg Resolution Time', ($stats['avgResolutionTime'] ?? '2.4 Hari')],
            ['Top Incident Department', ($stats['topDepartment'] ?? 'Production'), 'Primary Category Class', ($stats['topCategory'] ?? 'Class A (Safety)')],
        ];

        foreach ($kpis as $row) {
            $pdf->SetFillColor(248, 250, 252);
            $pdf->SetFont('helvetica', 'B', 8);
            $pdf->SetTextColor(71, 85, 105);
            $pdf->Cell(45, 8, ' ' . $row[0], 1, 0, 'L', true);

            $pdf->SetFont('helvetica', 'B', 9);
            $pdf->SetTextColor(15, 23, 42);
            $pdf->Cell(45, 8, ' ' . $row[1], 1, 0, 'C');

            $pdf->SetFont('helvetica', 'B', 8);
            $pdf->SetTextColor(71, 85, 105);
            $pdf->Cell(45, 8, ' ' . $row[2], 1, 0, 'L', true);

            $pdf->SetFont('helvetica', 'B', 9);
            $pdf->SetTextColor(15, 23, 42);
            $pdf->Cell(45, 8, ' ' . $row[3], 1, 1, 'C');
        }

        $pdf->Ln(8);
        $pdf->SetFont('helvetica', '', 8);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(180, 5, 'Compiled automatically by PT Minda HSE Portal on ' . date('d M Y, H:i') . ' WIB', 0, 1, 'R');

        return $pdf->Output('S');
    }

    public static function generateWeeklyReport(array $weekly): string
    {
        return self::generateExecutiveSummary($weekly);
    }
}
