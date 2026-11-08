<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;

class WorkflowController extends Controller
{
    /**
     * Tampilkan halaman SOP K3 & Alur Verifikasi DFA
     */
    public function index(Request $request): void
    {
        Response::render('workflow/index', [
            'pageTitle' => __('nav.workflow') . ' — PT Minda Automotive Indonesia',
            'currentNav' => 'workflow'
        ]);
    }
}
