/**
 * PT MINDA AUTOMOTIVE INDONESIA
 * IK Pedoman PEP-HSE-P-01-IK-01
 * Official HSE Risk Assessment & Matrix Evaluation Engine
 */

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Extreme';

export interface SeverityDefinition {
  level: number;
  label: string;
  title: string;
  shortText: string;
  description: string;
}

export interface LikelihoodDefinition {
  level: number;
  label: string;
  title: string;
  shortText: string;
  frequencyGuide: string;
  annualGuide: string;
}

export interface RiskEvaluationResult {
  severity: number;
  likelihood: number;
  score: number; // Derived from lookup matrix
  level: RiskLevel;
  label: string; // e.g. "12 High", "20 Extreme"
  badgeClass: string;
  badgeColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  isOtpRequired: boolean; // True if Score > 9 (Kolom 26: Wajib Objective Target Program)
  isAdditionalControlRequired: boolean; // True if Score >= 5 (Moderate, High, Extreme)
  hierarchyOfControls: {
    id: string;
    title: string;
    desc: string;
  }[];
}

// 1. Severity Definitions according to IK Pedoman PEP-HSE-P-01-IK-01
export const SEVERITY_DEFINITIONS: Record<number, SeverityDefinition> = {
  1: {
    level: 1,
    label: '1 - Ringan (P3K)',
    title: 'Ringan (P3K)',
    shortText: 'Cedera/sakit ringan, P3K (No LTI)',
    description: 'Cedera/sakit ringan, memerlukan P3K, tidak ada Lost Time Injury (No LTI)'
  },
  2: {
    level: 2,
    label: '2 - Ringan LTI',
    title: 'Ringan LTI',
    shortText: 'Cedera/sakit, hilang hari kerja, tidak cacat',
    description: 'Cedera/sakit, hilang hari kerja, tidak cacat permanen'
  },
  3: {
    level: 3,
    label: '3 - Cacat Permanen (LTI)',
    title: 'Cacat Permanen (LTI)',
    shortText: 'Cedera dengan cacat permanen',
    description: 'Cedera dengan cacat permanen'
  },
  4: {
    level: 4,
    label: '4 - Cacat Permanen / Fatality (1 Orang)',
    title: 'Cacat Permanen / Fatality',
    shortText: 'Kematian/cacat fisik 1 orang',
    description: 'Kematian atau cacat fisik permanen pada satu orang'
  },
  5: {
    level: 5,
    label: '5 - Fatality (>1 Orang)',
    title: 'Fatality (>1 Orang / Kerugian Besar)',
    shortText: 'Kematian >1 orang / kerugian material sangat besar',
    description: 'Kematian lebih dari satu orang, kerugian material sangat besar'
  }
};

// 2. Likelihood / Probability Definitions according to IK Pedoman PEP-HSE-P-01-IK-01
export const LIKELIHOOD_DEFINITIONS: Record<number, LikelihoodDefinition> = {
  1: {
    level: 1,
    label: '1 - Unlikely / Jarang',
    title: 'Unlikely (Jarang / Tidak pernah terjadi)',
    shortText: 'Jarang / Tidak pernah terjadi',
    frequencyGuide: 'Tidak pernah terjadi',
    annualGuide: '≈ 1 kali/tahun'
  },
  2: {
    level: 2,
    label: '2 - Rarely / Kecil Kemungkinan',
    title: 'Rarely (Kecil Kemungkinan / Hampir tidak mungkin)',
    shortText: 'Hampir tidak mungkin',
    frequencyGuide: '≤ 1 kali/tahun',
    annualGuide: '≈ 2–5 kali/tahun'
  },
  3: {
    level: 3,
    label: '3 - Possible / Ada kemungkinan',
    title: 'Possible (Ada kemungkinan)',
    shortText: 'Ada kemungkinan',
    frequencyGuide: 'Beberapa kali/bulan',
    annualGuide: '≈ 6–10 kali/tahun'
  },
  4: {
    level: 4,
    label: '4 - Probable / Kemungkinan besar',
    title: 'Probable (Kemungkinan besar)',
    shortText: 'Kemungkinan besar',
    frequencyGuide: 'Beberapa kali/minggu',
    annualGuide: '≈ 11–19 kali/tahun'
  },
  5: {
    level: 5,
    label: '5 - Almost Certain / Pasti',
    title: 'Almost Certain (Pasti)',
    shortText: 'Pasti / Setiap hari',
    frequencyGuide: 'Setiap hari',
    annualGuide: '> 19 kali/tahun'
  }
};

// 3. Official 5x5 Matrix Lookup Table (IK Pedoman PEP-HSE-P-01-IK-01)
// Indexed by [severity][likelihood]
const LOOKUP_MATRIX: Record<number, Record<number, { score: number; level: RiskLevel }>> = {
  1: {
    1: { score: 1, level: 'Low' },
    2: { score: 2, level: 'Low' },
    3: { score: 3, level: 'Low' },
    4: { score: 4, level: 'Low' },
    5: { score: 5, level: 'Moderate' }
  },
  2: {
    1: { score: 2, level: 'Low' },
    2: { score: 4, level: 'Low' },
    3: { score: 6, level: 'Moderate' },
    4: { score: 8, level: 'Moderate' },
    5: { score: 10, level: 'High' }
  },
  3: {
    1: { score: 3, level: 'Low' },
    2: { score: 6, level: 'Moderate' },
    3: { score: 9, level: 'Moderate' },
    4: { score: 12, level: 'High' },
    5: { score: 15, level: 'High' }
  },
  4: {
    1: { score: 4, level: 'Low' },
    2: { score: 8, level: 'Moderate' },
    3: { score: 12, level: 'High' },
    4: { score: 16, level: 'High' },
    5: { score: 20, level: 'Extreme' }
  },
  5: {
    1: { score: 5, level: 'Moderate' },
    2: { score: 10, level: 'High' },
    3: { score: 15, level: 'High' },
    4: { score: 20, level: 'Extreme' },
    5: { score: 25, level: 'Extreme' }
  }
};

export const HIERARCHY_OF_CONTROLS = [
  { id: 'elimination', title: '1. Eliminasi', desc: 'Menghilangkan sumber bahaya secara total dari area kerja.' },
  { id: 'substitution', title: '2. Substitusi', desc: 'Mengganti alat/bahan/proses yang berbahaya dengan alternatif yang lebih aman.' },
  { id: 'engineering', title: '3. Rekayasa Teknik', desc: 'Isolasi bahaya, pemasangan sensor, interlock, penutup mesin, atau peredam.' },
  { id: 'administrative', title: '4. Administrasi', desc: 'SOP, pelatihan K3, rotasi kerja, rambu keselamatan, & jadwal perawatan.' },
  { id: 'ppe', title: '5. APD (Alat Pelindung Diri)', desc: 'Penggunaan APD wajib (Helm, Sepatu Safety, Kacamata, Harness, Sarung Tangan).' }
];

/**
 * Main evaluation function per IK Pedoman PEP-HSE-P-01-IK-01
 */
export function evaluateRiskIK01(severityInput?: number | string, likelihoodInput?: number | string): RiskEvaluationResult {
  let s = Number(severityInput) || 2;
  let l = Number(likelihoodInput) || 2;

  s = Math.min(Math.max(Math.round(s), 1), 5);
  l = Math.min(Math.max(Math.round(l), 1), 5);

  const cell = LOOKUP_MATRIX[s][l];
  const score = cell.score;
  const level = cell.level;

  // Rule: Risk Score > 9 requires OTP (Objective Target Program)
  const isOtpRequired = score > 9;

  // Rule: Moderate, High, Extreme require additional controls based on Hierarchy of Control
  const isAdditionalControlRequired = score >= 5;

  let badgeClass = '';
  let badgeColor = '#10b981';
  let textColor = 'text-emerald-400';
  let bgColor = 'bg-emerald-500/10';
  let borderColor = 'border-emerald-500/30';

  switch (level) {
    case 'Low':
      badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      badgeColor = '#10b981';
      textColor = 'text-emerald-400';
      bgColor = 'bg-emerald-500/10';
      borderColor = 'border-emerald-500/30';
      break;
    case 'Moderate':
      badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      badgeColor = '#f59e0b';
      textColor = 'text-amber-400';
      bgColor = 'bg-amber-500/10';
      borderColor = 'border-amber-500/30';
      break;
    case 'High':
      badgeClass = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      badgeColor = '#f97316';
      textColor = 'text-orange-400';
      bgColor = 'bg-orange-500/10';
      borderColor = 'border-orange-500/30';
      break;
    case 'Extreme':
      badgeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      badgeColor = '#f43f5e';
      textColor = 'text-rose-400';
      bgColor = 'bg-rose-500/10';
      borderColor = 'border-rose-500/30';
      break;
  }

  return {
    severity: s,
    likelihood: l,
    score,
    level,
    label: `${score} ${level}`,
    badgeClass,
    badgeColor,
    textColor,
    bgColor,
    borderColor,
    isOtpRequired,
    isAdditionalControlRequired,
    hierarchyOfControls: HIERARCHY_OF_CONTROLS
  };
}

/**
 * Get Risk Level for a specific (S, L) cell from lookup matrix
 */
export function getMatrixCellIK01(severity: number, likelihood: number) {
  return evaluateRiskIK01(severity, likelihood);
}
