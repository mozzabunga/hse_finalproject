<?php
/**
 * FPDF Version 1.86 (Pure PHP PDF Generation Library - Standalone Vendorized)
 * http://www.fpdf.org
 */

namespace App\Lib\PDF;

class FPDF
{
    protected int $page = 0;
    protected int $n = 2;
    protected array $offsets = [];
    protected string $buffer = '';
    protected array $pages = [];
    protected int $state = 0;
    protected bool $compress = true;
    protected float $k;
    protected string $DefOrientation = 'P';
    protected string $CurOrientation = 'P';
    protected array $StdPageSizes = [];
    protected array $DefPageSize = [];
    protected array $CurPageSize = [];
    protected array $CurRotation = [];
    protected int $PageInfo = 0;
    protected float $wPt;
    protected float $hPt;
    protected float $w;
    protected float $h;
    protected float $lMargin;
    protected float $tMargin;
    protected float $rMargin;
    protected float $bMargin;
    protected float $cMargin;
    protected float $x;
    protected float $y;
    protected float $lasth;
    protected float $LineWidth;
    protected string $fontpath = '';
    protected array $CoreFonts = [];
    protected array $fonts = [];
    protected array $FontFiles = [];
    protected array $encodings = [];
    protected array $cmaps = [];
    protected string $FontFamily = '';
    protected string $FontStyle = '';
    protected bool $underline = false;
    protected array $CurrentFont = [];
    protected float $FontSizePt = 12;
    protected float $FontSize = 12;
    protected string $DrawColor = '0 G';
    protected string $FillColor = '0 g';
    protected string $TextColor = '0 g';
    protected bool $ColorFlag = false;
    protected bool $WithAlpha = false;
    protected float $ws = 0;
    protected array $images = [];
    protected array $PageLinks = [];
    protected array $links = [];
    protected bool $AutoPageBreak = true;
    protected float $PageBreakTrigger;
    protected bool $InHeader = false;
    protected bool $InFooter = false;
    protected bool $AliasNbPages = false;
    protected string $ZoomMode = 'default';
    protected string $LayoutMode = 'default';
    protected array $metadata = [];
    protected string $PDFVersion = '1.3';

    public function __construct(string $orientation = 'P', string $unit = 'mm', mixed $size = 'A4')
    {
        $this->CoreFonts = ['courier', 'helvetica', 'times', 'symbol', 'zapfdingbats'];
        $this->k = match ($unit) {
            'pt' => 1,
            'mm' => 72 / 25.4,
            'cm' => 72 / 2.54,
            'in' => 72,
            default => 72 / 25.4,
        };

        $this->StdPageSizes = [
            'a3' => [841.89, 1190.55],
            'a4' => [595.28, 841.89],
            'a5' => [420.94, 595.28],
            'letter' => [612, 792],
            'legal' => [612, 1008]
        ];

        $size = is_string($size) ? ($this->StdPageSizes[strtolower($size)] ?? $this->StdPageSizes['a4']) : $size;
        $this->DefPageSize = $size;
        $this->CurPageSize = $size;

        $orientation = strtolower($orientation);
        if ($orientation === 'p' || $orientation === 'portrait') {
            $this->DefOrientation = 'P';
            $this->w = $size[0] / $this->k;
            $this->h = $size[1] / $this->k;
        } else {
            $this->DefOrientation = 'L';
            $this->w = $size[1] / $this->k;
            $this->h = $size[0] / $this->k;
        }
        $this->CurOrientation = $this->DefOrientation;
        $this->wPt = $this->w * $this->k;
        $this->hPt = $this->h * $this->k;

        $margin = 28.35 / $this->k;
        $this->SetMargins($margin, $margin);
        $this->cMargin = $margin / 10;
        $this->LineWidth = .567 / $this->k;
        $this->SetAutoPageBreak(true, 2 * $margin);
        $this->SetDisplayMode('default');
        $this->compress = function_exists('gzcompress');
    }

    public function SetMargins(float $left, float $top, ?float $right = null): void
    {
        $this->lMargin = $left;
        $this->tMargin = $top;
        $this->rMargin = $right ?? $left;
    }

    public function SetAutoPageBreak(bool $auto, float $margin = 0): void
    {
        $this->AutoPageBreak = $auto;
        $this->bMargin = $margin;
        $this->PageBreakTrigger = $this->h - $margin;
    }

    public function SetDisplayMode(string $zoom, string $layout = 'continuous'): void
    {
        $this->ZoomMode = $zoom;
        $this->LayoutMode = $layout;
    }

    public function AddPage(string $orientation = '', mixed $size = '', int $rotation = 0): void
    {
        if ($this->state === 0) {
            $this->Open();
        }
        $family = $this->FontFamily;
        $style = $this->FontStyle . ($this->underline ? 'U' : '');
        $fontsize = $this->FontSizePt;
        $lw = $this->LineWidth;
        $dc = $this->DrawColor;
        $fc = $this->FillColor;
        $tc = $this->TextColor;
        $cf = $this->ColorFlag;

        if ($this->page > 0) {
            $this->InFooter = true;
            $this->Footer();
            $this->InFooter = false;
            $this->pages[$this->page] = $this->buffer;
            $this->buffer = '';
        }

        $this->page++;
        $this->pages[$this->page] = '';
        $this->x = $this->lMargin;
        $this->y = $this->tMargin;
        $this->FontFamily = '';

        if ($family) {
            $this->SetFont($family, $style, $fontsize);
        }
        $this->LineWidth = $lw;
        $this->out(sprintf('%.2F w', $lw * $this->k));
        if ($dc !== '0 G') {
            $this->DrawColor = $dc;
            $this->out($dc);
        }
        if ($fc !== '0 g') {
            $this->FillColor = $fc;
            $this->out($fc);
        }
        $this->TextColor = $tc;
        $this->ColorFlag = $cf;

        $this->InHeader = true;
        $this->Header();
        $this->InHeader = false;
    }

    public function Header(): void {}
    public function Footer(): void {}

    public function Open(): void
    {
        $this->state = 1;
        $this->out('%PDF-1.3');
    }

    public function SetFont(string $family, string $style = '', float $size = 0): void
    {
        $family = strtolower($family);
        if ($family === '') $family = $this->FontFamily;
        if ($family === 'arial') $family = 'helvetica';
        $style = strtoupper($style);
        if (str_contains($style, 'U')) {
            $this->underline = true;
            $style = str_replace('U', '', $style);
        } else {
            $this->underline = false;
        }
        if ($style === 'IB') $style = 'BI';
        if ($size == 0) $size = $this->FontSizePt;

        $fontkey = $family . $style;
        if (!isset($this->fonts[$fontkey])) {
            $this->fonts[$fontkey] = [
                'i' => count($this->fonts) + 1,
                'type' => 'core',
                'name' => match ($fontkey) {
                    'helveticaB' => 'Helvetica-Bold',
                    'helveticaI' => 'Helvetica-Oblique',
                    'helveticaBI' => 'Helvetica-BoldOblique',
                    'times' => 'Times-Roman',
                    'timesB' => 'Times-Bold',
                    'timesI' => 'Times-Italic',
                    'timesBI' => 'Times-BoldItalic',
                    'courier' => 'Courier',
                    'courierB' => 'Courier-Bold',
                    'courierI' => 'Courier-Oblique',
                    'courierBI' => 'Courier-BoldOblique',
                    default => 'Helvetica',
                },
                'up' => -100,
                'ut' => 50
            ];
        }

        $this->FontFamily = $family;
        $this->FontStyle = $style;
        $this->FontSizePt = $size;
        $this->FontSize = $size / $this->k;
        $this->CurrentFont = $this->fonts[$fontkey];
        if ($this->page > 0) {
            $this->out(sprintf('BT /F%d %.2F Tf ET', $this->CurrentFont['i'], $this->FontSizePt));
        }
    }

    public function SetDrawColor(int $r, ?int $g = null, ?int $b = null): void
    {
        $this->DrawColor = ($g === null) ? sprintf('%.3F G', $r / 255) : sprintf('%.3F %.3F %.3F RG', $r / 255, $g / 255, $b / 255);
        if ($this->page > 0) $this->out($this->DrawColor);
    }

    public function SetFillColor(int $r, ?int $g = null, ?int $b = null): void
    {
        $this->FillColor = ($g === null) ? sprintf('%.3F g', $r / 255) : sprintf('%.3F %.3F %.3F rg', $r / 255, $g / 255, $b / 255);
        $this->ColorFlag = ($this->FillColor !== '0 g');
        if ($this->page > 0) $this->out($this->FillColor);
    }

    public function SetTextColor(int $r, ?int $g = null, ?int $b = null): void
    {
        $this->TextColor = ($g === null) ? sprintf('%.3F g', $r / 255) : sprintf('%.3F %.3F %.3F rg', $r / 255, $g / 255, $b / 255);
    }

    public function SetXY(float $x, float $y): void
    {
        $this->x = $x;
        $this->y = $y;
    }

    public function SetX(float $x): void
    {
        $this->x = $x;
    }

    public function SetY(float $y): void
    {
        $this->x = $this->lMargin;
        $this->y = $y;
    }

    public function GetX(): float
    {
        return $this->x;
    }

    public function GetY(): float
    {
        return $this->y;
    }

    public function Rect(float $x, float $y, float $w, float $h, string $style = ''): void
    {
        $op = match (strtolower($style)) {
            'f' => 'f',
            'b', 'fd', 'df' => 'B',
            default => 'S',
        };
        $this->out(sprintf('%.2F %.2F %.2F %.2F re %s', $x * $this->k, ($this->h - $y) * $this->k, $w * $this->k, -$h * $this->k, $op));
    }

    public function Line(float $x1, float $y1, float $x2, float $y2): void
    {
        $this->out(sprintf('%.2F %.2F m %.2F %.2F l S', $x1 * $this->k, ($this->h - $y1) * $this->k, $x2 * $this->k, ($this->h - $y2) * $this->k));
    }

    public function Cell(float $w, float $h = 0, string $txt = '', mixed $border = 0, int $ln = 0, string $align = '', bool $fill = false): void
    {
        $k = $this->k;
        if ($this->y + $h > $this->PageBreakTrigger && !$this->InHeader && !$this->InFooter && $this->AutoPageBreak) {
            $x = $this->x;
            $ws = $this->ws;
            $this->AddPage($this->CurOrientation);
            $this->x = $x;
            if ($ws > 0) {
                $this->ws = $ws;
                $this->out(sprintf('%.3F Tw', $ws * $k));
            }
        }
        if ($w == 0) $w = $this->w - $this->rMargin - $this->x;
        $s = '';
        if ($fill || $border == 1) {
            $op = ($fill && $border == 1) ? 'B' : ($fill ? 'f' : 'S');
            $s = sprintf('%.2F %.2F %.2F %.2F re %s ', $this->x * $k, ($this->h - $this->y) * $k, $w * $k, -$h * $k, $op);
        }
        if ($txt !== '') {
            $dx = match (strtoupper($align)) {
                'R' => $w - $this->cMargin - $this->GetStringWidth($txt),
                'C' => ($w - $this->GetStringWidth($txt)) / 2,
                default => $this->cMargin,
            };
            if ($this->ColorFlag) $s .= 'q ' . $this->TextColor . ' ';
            $txt2 = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $txt);
            $s .= sprintf('BT %.2F %.2F Td (%s) Tj ET', ($this->x + $dx) * $k, ($this->h - ($this->y + .5 * $h + .3 * $this->FontSize)) * $k, $txt2);
            if ($this->ColorFlag) $s .= ' Q';
        }
        if ($s) $this->out($s);
        $this->lasth = $h;
        if ($ln > 0) {
            $this->y += $h;
            if ($ln == 1) $this->x = $this->lMargin;
        } else {
            $this->x += $w;
        }
    }

    public function MultiCell(float $w, float $h, string $txt, mixed $border = 0, string $align = 'J', bool $fill = false): void
    {
        if ($w == 0) $w = $this->w - $this->rMargin - $this->x;
        $lines = explode("\n", str_replace("\r", '', $txt));
        foreach ($lines as $line) {
            $words = explode(' ', $line);
            $cur = '';
            foreach ($words as $word) {
                $test = ($cur === '') ? $word : $cur . ' ' . $word;
                if ($this->GetStringWidth($test) <= ($w - 2 * $this->cMargin)) {
                    $cur = $test;
                } else {
                    $this->Cell($w, $h, $cur, $border, 1, $align, $fill);
                    $cur = $word;
                }
            }
            if ($cur !== '') {
                $this->Cell($w, $h, $cur, $border, 1, $align, $fill);
            }
        }
    }

    public function Ln(?float $h = null): void
    {
        $this->x = $this->lMargin;
        $this->y += $h ?? $this->lasth;
    }

    public function GetStringWidth(string $s): float
    {
        // Approximation for standard core fonts
        return strlen($s) * ($this->FontSizePt * 0.55) / $this->k;
    }

    protected function out(string $s): void
    {
        if ($this->state === 2) {
            $this->pages[$this->page] .= $s . "\n";
        } elseif ($this->state === 1) {
            $this->buffer .= $s . "\n";
        } elseif ($this->state === 0) {
            $this->Open();
            $this->buffer .= $s . "\n";
        }
    }

    public function Output(string $dest = 'S', string $name = ''): string
    {
        if ($this->state < 3) {
            if ($this->page > 0) {
                $this->InFooter = true;
                $this->Footer();
                $this->InFooter = false;
                $this->pages[$this->page] = $this->buffer;
                $this->buffer = '';
            }
            $this->state = 3;
            $this->putPages();
            $this->putHeader();
            $this->putTrailer();
        }

        if ($dest === 'I' || $dest === 'D') {
            header('Content-Type: application/pdf');
            header('Content-Disposition: ' . ($dest === 'D' ? 'attachment' : 'inline') . '; filename="' . $name . '"');
            header('Cache-Control: private, max-age=0, must-revalidate');
            header('Pragma: public');
            echo $this->buffer;
            exit;
        }
        return $this->buffer;
    }

    protected function putPages(): void
    {
        $nb = $this->page;
        for ($n = 1; $n <= $nb; $n++) {
            $this->newobj();
            $this->out('<</Type /Page');
            $this->out('/Parent 1 0 R');
            $this->out('/Resources 2 0 R');
            $this->out(sprintf('/MediaBox [0 0 %.2F %.2F]', $this->wPt, $this->hPt));
            $this->out('/Contents ' . ($this->n + 1) . ' 0 R>>');
            $this->out('endobj');

            $p = $this->pages[$n];
            $this->newobj();
            $this->out('<<' . ($this->compress ? '/Filter /FlateDecode ' : '') . '/Length ' . strlen($this->compress ? gzcompress($p) : $p) . '>>');
            $this->out('stream');
            $this->out($this->compress ? gzcompress($p) : $p);
            $this->out('endstream');
            $this->out('endobj');
        }
        $this->offsets[1] = strlen($this->buffer);
        $this->out('1 0 obj');
        $this->out('<</Type /Pages');
        $kids = '/Kids [';
        for ($i = 0; $i < $nb; $i++) $kids .= (3 + 2 * $i) . ' 0 R ';
        $this->out($kids . ']');
        $this->out('/Count ' . $nb);
        $this->out(sprintf('/MediaBox [0 0 %.2F %.2F]', $this->wPt, $this->hPt));
        $this->out('>>');
        $this->out('endobj');
    }

    protected function putHeader(): void
    {
        $this->offsets[2] = strlen($this->buffer);
        $this->out('2 0 obj');
        $this->out('<</ProcSet [/PDF /Text /ImageB /ImageC /ImageI]');
        $this->out('/Font <<');
        foreach ($this->fonts as $font) {
            $this->out('/F' . $font['i'] . ' ' . $font['n'] . ' 0 R');
        }
        $this->out('>>');
        $this->out('>>');
        $this->out('endobj');

        foreach ($this->fonts as $k => $font) {
            $this->newobj();
            $this->fonts[$k]['n'] = $this->n;
            $this->out('<</Type /Font');
            $this->out('/Subtype /Type1');
            $this->out('/BaseFont /' . $font['name']);
            $this->out('/Encoding /WinAnsiEncoding');
            $this->out('>>');
            $this->out('endobj');
        }
    }

    protected function putTrailer(): void
    {
        $this->newobj();
        $this->out('<</Type /Catalog');
        $this->out('/Pages 1 0 R');
        $this->out('>>');
        $this->out('endobj');

        $o = strlen($this->buffer);
        $this->out('xref');
        $this->out('0 ' . ($this->n + 1));
        $this->out('0000000000 65535 f ');
        for ($i = 1; $i <= $this->n; $i++) {
            $this->out(sprintf('%010d 00000 n ', $this->offsets[$i] ?? 0));
        }
        $this->out('trailer');
        $this->out('<</Size ' . ($this->n + 1));
        $this->out('/Root ' . $this->n . ' 0 R');
        $this->out('/Info << /Producer (PT Minda HSE Portal PDF Engine) >>');
        $this->out('>>');
        $this->out('startxref');
        $this->out((string)$o);
        $this->out('%%EOF');
    }

    protected function newobj(): void
    {
        $this->n++;
        $this->offsets[$this->n] = strlen($this->buffer);
        $this->out($this->n . ' 0 obj');
    }
}
