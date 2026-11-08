import { HazardReport, HazardCategory } from '../types';

/**
 * PT Minda Automotive Indonesia - HSE Portal
 * Presentation & Data Normalization Layer for Hazard Reports
 * 
 * NOTE: This module operates strictly on the UI/presentation layer.
 * It does NOT mutate the database, change schemas, or alter backend logic.
 */

// Administrative prefixes and labels that must never be used as a hazard title or identity
const ADMINISTRATIVE_PREFIXES = [
  'kondisi saat dilaporkan',
  'kondisi saat ini',
  'kondisi saat',
  'current condition',
  'status kondisi',
  'status korban',
  'injury status',
  'korban',
  'sudah disampaikan ke atasan/leader',
  'sudah disampaikan ke atasan',
  'disampaikan ke atasan/leader',
  'disampaikan ke atasan',
  'disampaikan ke leader',
  'sudah disampaikan',
  'status laporan',
  'status tiket',
  'timestamp',
  'id tiket',
  'ticket id',
  'potensi dampak',
  'potensi bahaya',
  'potential impact',
  'tindakan sementara',
  'immediate action',
  'tindakan langsung',
  'saran perbaikan',
  'rekomendasi',
  'corrective suggestion',
  '[title]'
];

// Consequence / impact / status phrases that must never be confused with hazard type or title
const CONSEQUENCE_OR_STATUS_VALUES = [
  'cedera ringan',
  'cedera sedang',
  'cedera berat',
  'luka ringan',
  'luka berat',
  'first aid',
  'pertolongan pertama',
  'fatality',
  'korban jiwa',
  'potensi korban jiwa',
  'tidak ada korban',
  'ada korban',
  'masih ada',
  'sudah ditangani',
  'selesai',
  'sudah selesai',
  'belum selesai',
  'open',
  'closed',
  'n/a',
  'na',
  'null',
  'undefined',
  'none',
  'no title',
  'untitled',
  'untitled safety hazard'
];

export interface ParsedHazardDetails {
  summary: string;
  hazardDescription: string;
  currentCondition: string;
  injuryStatus: string;
  potentialImpact: string;
  immediateAction: string;
  informedToLeader: string;
  improvementSuggestion: string;
  area: string;
  locationDetail: string;
  hazardCategory: string;
  categoryBadge: string;
  rawText: string;
}

/**
 * Validates whether a value actually contains meaningful data.
 * Returns false for null, undefined, empty strings, '-', '.', 'N/A', 'null', 'undefined'.
 */
export function hasValue(val: any): boolean {
  if (val === null || val === undefined) return false;
  const str = String(val).trim();
  if (!str) return false;
  const lower = str.toLowerCase();
  if (
    lower === 'n/a' ||
    lower === 'na' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'none' ||
    lower === 'no title' ||
    str === '-' ||
    str === '.' ||
    str === '_'
  ) {
    return false;
  }
  return true;
}

/**
 * Sanitizes any raw string into a clean UI value.
 */
export function sanitizeDisplayValue(val: any, fallback = ''): string {
  if (!hasValue(val)) return fallback;
  return String(val).trim();
}

/**
 * Checks if a string line is purely an administrative attribute (like 'Kondisi Saat Dilaporkan: ...')
 */
export function isAdministrativeLine(line: string): boolean {
  const clean = line.trim().toLowerCase();
  if (!clean) return true;
  return ADMINISTRATIVE_PREFIXES.some(prefix => clean.startsWith(prefix));
}

/**
 * Checks if a string is a consequence, effect, status, or administrative phrase
 * that MUST NEVER be used as a hazard title or hazard type identity.
 */
export function isConsequenceOrAdminValue(val: string): boolean {
  if (!hasValue(val)) return true;
  const clean = val.trim().toLowerCase();
  if (isAdministrativeLine(clean)) return true;

  // Exact match or prefix match with consequence terms
  return CONSEQUENCE_OR_STATUS_VALUES.some(term => {
    return clean === term || clean.startsWith(term + ':') || clean.startsWith(term + ' -');
  });
}

/**
 * Resolves the true hazard category/type display name from Supabase.
 * Examples: 'Ergonomi', 'APD', 'Mesin', '5S / Housekeeping', 'Lingkungan', 'Kimia', 'Listrik', etc.
 */
export function getHazardCategoryDisplay(report: Partial<HazardReport>): string {
  // 1. Direct hazardCategory from Supabase if valid and not consequence/admin
  if (hasValue(report.hazardCategory) && !isConsequenceOrAdminValue(report.hazardCategory!)) {
    const raw = report.hazardCategory!.trim();
    if (/^(kategori|cat|class)\s*([a-c])$/i.test(raw) || /^[a-c]$/i.test(raw)) {
      const match = raw.match(/([a-c])/i);
      const letter = match ? match[1].toUpperCase() : 'C';
      if (letter === 'A') return 'Kategori A (Safety / APD)';
      if (letter === 'B') return 'Kategori B (Lingkungan / 5S)';
      if (letter === 'C') return 'Kategori C (General / Maintenance)';
    }
    return raw;
  }

  // 2. Map category class letter to standard descriptive category
  if (report.category === 'A') return 'Kategori A (Safety / APD)';
  if (report.category === 'B') return 'Kategori B (Lingkungan / 5S)';
  if (report.category === 'C') return 'Kategori C (General / Maintenance)';

  return 'Bahaya K3';
}

/**
 * Returns a clean, concise badge string for the ticket category.
 * e.g., 'ERGONOMI', 'APD', 'MESIN', 'CAT A', 'CAT B', 'CAT C'
 */
export function getHazardCategoryBadge(report: Partial<HazardReport>): string {
  if (hasValue(report.hazardCategory) && !isConsequenceOrAdminValue(report.hazardCategory!)) {
    const raw = report.hazardCategory!.trim();
    // If it's already a single letter like 'A', 'B', 'C', format as CAT A
    if (/^[a-c]$/i.test(raw)) {
      return `CAT ${raw.toUpperCase()}`;
    }
    if (/^(cat|kat|kategori|class)\s*([a-c])$/i.test(raw)) {
      const match = raw.match(/([a-c])/i);
      return `CAT ${match ? match[1].toUpperCase() : raw.toUpperCase()}`;
    }
    return raw.toUpperCase();
  }

  if (report.category) {
    return `CAT ${report.category}`;
  }

  return 'K3';
}

/**
 * Extracts key-value pairs and structured fields from multi-line or unstructured description text.
 * Only returns non-empty strings for attributes that actually exist in the record.
 * Consequence/administrative values are isolated to their own fields and NEVER leaked as title/hazard identity.
 */
export function parseHazardIncidentDetails(report: Partial<HazardReport>): ParsedHazardDetails {
  const rawText = report.description || '';
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  let explicitDetail = '';
  let currentCondition = '';
  let injuryStatus = '';
  let potentialImpact = '';
  let immediateAction = '';
  let informedToLeader = '';
  let improvementSuggestion = '';
  let locationDetail = '';

  const unassignedLines: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Check specific known labels
    if (lower.startsWith('detail temuan / hazard description:') || lower.startsWith('detail temuan:') || lower.startsWith('temuan:') || lower.startsWith('hazard description:')) {
      const val = line.substring(line.indexOf(':') + 1).trim();
      if (val && !isConsequenceOrAdminValue(val)) explicitDetail = val;
    } else if (lower.startsWith('kondisi saat dilaporkan:') || lower.startsWith('status kondisi:') || lower.startsWith('current condition:')) {
      const val = line.substring(line.indexOf(':') + 1).trim();
      if (hasValue(val)) currentCondition = val;
    } else if (lower.startsWith('status korban:') || lower.startsWith('injury status:') || lower.startsWith('korban:')) {
      const val = line.substring(line.indexOf(':') + 1).trim();
      if (hasValue(val)) injuryStatus = val;
    } else if (lower.startsWith('potensi dampak:') || lower.startsWith('potensi bahaya:') || lower.startsWith('potential impact:')) {
      const val = line.substring(line.indexOf(':') + 1).trim();
      if (hasValue(val)) potentialImpact = val;
    } else if (lower.startsWith('tindakan sementara:') || lower.startsWith('immediate action:') || lower.startsWith('tindakan langsung:')) {
      const val = line.substring(line.indexOf(':') + 1).trim();
      if (hasValue(val)) immediateAction = val;
    } else if (lower.startsWith('sudah disampaikan ke atasan/leader:') || lower.startsWith('sudah disampaikan ke atasan:') || lower.startsWith('disampaikan ke atasan/leader:') || lower.startsWith('disampaikan ke atasan:') || lower.startsWith('disampaikan ke leader:')) {
      const val = line.substring(line.indexOf(':') + 1).trim();
      if (hasValue(val)) informedToLeader = val;
    } else if (lower.startsWith('saran perbaikan:') || lower.startsWith('rekomendasi:') || lower.startsWith('corrective suggestion:')) {
      const val = line.substring(line.indexOf(':') + 1).trim();
      if (hasValue(val)) improvementSuggestion = val;
    } else if (lower.startsWith('detail lokasi:') || lower.startsWith('lokasi spesifik:') || lower.startsWith('location detail:')) {
      const val = line.substring(line.indexOf(':') + 1).trim();
      if (hasValue(val)) locationDetail = val;
    } else if (lower.startsWith('[title]')) {
      // Ignore title tag from internal description prefix
    } else if (!isAdministrativeLine(line) && !isConsequenceOrAdminValue(line)) {
      unassignedLines.push(line);
    }
  }

  // Determine main hazard description (preserves actual incident narrative finding only)
  let finalDescription = explicitDetail;
  if (!finalDescription && unassignedLines.length > 0) {
    finalDescription = unassignedLines.join('\n');
  }

  // Determine clean incident / hazard summary for header and cards
  // STRICT RULE: NEVER use consequence (e.g. 'Cedera Ringan') or administrative fields as summary!
  let summary = '';
  
  // 1. Existing title if valid and not an administrative attribute or consequence
  if (hasValue(report.title) && !isConsequenceOrAdminValue(report.title!)) {
    summary = sanitizeDisplayValue(report.title, '');
  }

  // 2. Explicit Detail Temuan if title was missing, administrative, or consequence
  if (!summary && explicitDetail && !isConsequenceOrAdminValue(explicitDetail)) {
    summary = explicitDetail.length > 120 ? explicitDetail.substring(0, 120) + '...' : explicitDetail;
  }

  // 3. Unassigned narrative lines if available and not consequence
  if (!summary && unassignedLines.length > 0) {
    const firstNarrative = unassignedLines[0];
    if (!isConsequenceOrAdminValue(firstNarrative)) {
      summary = firstNarrative.length > 120 ? firstNarrative.substring(0, 120) + '...' : firstNarrative;
    }
  }

  // 4. If no valid custom narrative title, use the genuine hazard category name from Supabase
  if (!summary) {
    const categoryName = getHazardCategoryDisplay(report);
    const dept = sanitizeDisplayValue(report.department, '');
    summary = categoryName;
  }

  // Sanitize area and location detail
  const areaVal = sanitizeDisplayValue(report.area, '');
  const locDetailVal = sanitizeDisplayValue(locationDetail, '');

  const hazardCategory = getHazardCategoryDisplay(report);
  const categoryBadge = getHazardCategoryBadge(report);

  return {
    summary,
    hazardDescription: sanitizeDisplayValue(finalDescription, ''),
    currentCondition: sanitizeDisplayValue(currentCondition, ''),
    injuryStatus: sanitizeDisplayValue(injuryStatus, ''),
    potentialImpact: sanitizeDisplayValue(potentialImpact, ''),
    immediateAction: sanitizeDisplayValue(immediateAction, ''),
    informedToLeader: sanitizeDisplayValue(informedToLeader, ''),
    improvementSuggestion: sanitizeDisplayValue(improvementSuggestion, ''),
    area: areaVal,
    locationDetail: locDetailVal !== areaVal ? locDetailVal : '',
    hazardCategory,
    categoryBadge,
    rawText
  };
}

/**
 * Gets the clean Incident / Hazard Summary for cards, headers, and listings.
 * Guaranteed to NEVER return 'Kondisi Saat Dilaporkan: ...', 'Status Korban: ...', or consequence values ('Cedera Ringan').
 */
export function getHazardSummary(report: Partial<HazardReport>): string {
  const parsed = parseHazardIncidentDetails(report);
  return parsed.summary;
}

/**
 * Normalizes reporter details from the Supabase record.
 */
export function getReporterDetails(report: Partial<HazardReport>) {
  return {
    name: hasValue(report.reporterName) ? report.reporterName!.trim() : 'Anonymous',
    employeeId: hasValue(report.employeeId) ? report.employeeId!.trim() : '',
    email: hasValue(report.reporterEmail) ? report.reporterEmail!.trim() : '',
    department: hasValue(report.department) ? report.department!.trim() : ''
  };
}

/**
 * Deduplicates an array of hazard reports so 1 database record = 1 card/ticket.
 * Preserves the exact array order while eliminating duplicate ticket IDs or IDs.
 */
export function deduplicateReports(reports: HazardReport[]): HazardReport[] {
  if (!Array.isArray(reports) || reports.length <= 1) return reports || [];

  const seenIds = new Set<string>();
  const seenTicketIds = new Set<string>();
  const unique: HazardReport[] = [];

  for (const report of reports) {
    if (!report) continue;
    const idKey = report.id || report.uuid;
    const ticketKey = report.ticketId ? report.ticketId.trim().toUpperCase() : '';

    if (idKey && seenIds.has(idKey)) continue;
    if (ticketKey && seenTicketIds.has(ticketKey)) continue;

    if (idKey) seenIds.add(idKey);
    if (ticketKey) seenTicketIds.add(ticketKey);

    unique.push(report);
  }

  return unique;
}

