<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Category Classification and Automated PIC Routing Service
 */
class CategoryClassifier
{
    public static function classify(string $title = '', string $description = ''): string
    {
        $text = strtolower($title . ' ' . $description);

        // Category B: Environmental / Noise / Chemical / Waste / 5S / Ergonomics
        $bKeywords = [
            'kebisingan', 'bising', 'noise', 'desibel', 'decibel', 'suara bising',
            'leak', 'bocor', 'spill', 'tumpahan', 'tumpah', 'chemical', 'kimia',
            'b3', 'oil', 'oli', 'gas', 'toxic', 'racun', 'waste', 'limbah',
            'sampah', 'garbage', 'trash', 'emissions', 'emisi', 'smoke', 'asap',
            'bau', 'odor', 'pollut', 'polusi', 'sirkulasi udara', 'ventilasi',
            'debu', 'dust', 'ergonomi', 'ergonomic', 'postur', 'posture', 'pegal',
            'housekeeping', '5s', 'kebersihan', 'kerapihan', 'cleaning', 'catering',
            'katering', 'kantin', 'sanitasi', 'toilet'
        ];
        foreach ($bKeywords as $kw) {
            if (str_contains($text, $kw)) return 'B';
        }

        // Category A: APD, Safety Fisik, Listrik, Api, Mesin, Forklift
        $aKeywords = [
            'helmet', 'helm', 'boot', 'shoes', 'sepatu', 'glasses', 'goggles',
            'kacamata', 'glove', 'sarung tangan', 'vest', 'rompi', 'mask', 'masker',
            'safety belt', 'harness', 'ear plug', 'earplug', 'earmuff', 'apd', 'ppe',
            'protect', 'shield', 'pelindung', 'fall', 'jatuh', 'slip', 'terpeleset',
            'licin', 'trip', 'tersandung', 'listrik', 'electric', 'kabel', 'setrum',
            'api', 'fire', 'kebakaran', 'percikan', 'forklift', 'tertabrak', 'terlindas',
            'terjepit', 'pinch', 'crush', 'lontaran', 'serpihan', 'tajam', 'cut',
            'mesin berputar', 'machine guard', 'unsafe act', 'near miss'
        ];
        foreach ($aKeywords as $kw) {
            if (str_contains($text, $kw)) return 'A';
        }

        return 'C';
    }

    public static function normalize(?string $rawCat, string $title = '', string $description = ''): string
    {
        if ($rawCat !== null && trim($rawCat) !== '') {
            $c = strtolower(trim($rawCat));
            if ($c === 'a' || $c === 'cat a' || $c === 'kat a' || $c === 'kategori a') return 'A';
            if ($c === 'b' || $c === 'cat b' || $c === 'kat b' || $c === 'kategori b') return 'B';
            if ($c === 'c' || $c === 'cat c' || $c === 'kat c' || $c === 'kategori c') return 'C';
        }

        return self::classify($title, $description);
    }

    public static function determinePIC(string $title, string $description, string $category): array
    {
        $text = strtolower($title . ' ' . $description);

        if (str_contains($text, 'forklift')) {
            return [
                'picId'    => 'usr_hse_team',
                'picName'  => 'HSE Team',
                'picEmail' => 'hse_supervisor@mindaauto.co.id'
            ];
        }

        $hrgaKeywords = [
            'apd', 'ppe', 'safety shoes', 'helmet', 'helm', 'mask', 'masker',
            'gloves', 'sarung tangan', 'uniform', 'seragam', 'medicine', 'obat',
            'first aid', 'p3k', 'clinic', 'klinik', 'catering', 'katering',
            'employee welfare', 'welfare', 'medical'
        ];
        foreach ($hrgaKeywords as $kw) {
            if (str_contains($text, $kw)) {
                return [
                    'picId'    => 'usr_hrga_admin',
                    'picName'  => 'HRGA Admin',
                    'picEmail' => 'hrga_admin@mindaauto.co.id'
                ];
            }
        }

        $asepKeywords = [
            'waste', 'trash', 'garbage', 'environment', 'environmental issue',
            'limbah', 'sampah', 'chemical spill', 'oil spill', 'spill', 'tumpahan',
            'drain', 'water leak', 'air bocor', 'bocor', 'pollution', 'transportation',
            'vehicle', 'truck', 'loading', 'unloading', 'ob', 'housekeeping', 'cleaning',
            'cleanliness', 'kebersihan', 'apar', 'fire extinguisher', 'ergonomi',
            'ergonomic', 'chair', 'desk', 'table', 'posture', 'driver', 'sopir', 'parking', 'parkir'
        ];
        foreach ($asepKeywords as $kw) {
            if (str_contains($text, $kw)) {
                return [
                    'picId'    => 'usr_asep_permana',
                    'picName'  => 'Asep Permana',
                    'picEmail' => 'asep.permana@mindaauto.co.id'
                ];
            }
        }

        return [
            'picId'    => 'usr_hse_team',
            'picName'  => 'HSE Team',
            'picEmail' => 'hse_supervisor@mindaauto.co.id'
        ];
    }
}
