/**
 * PT Minda Automotive Indonesia
 * HSE Hazard & Near Miss Reporting Portal
 * Shared TypeScript Definitions
 */

export enum HazardStatus {
  NewReport = 'NewReport',
  PendingValidation = 'PendingValidation',
  UnderInvestigation = 'UnderInvestigation',
  ActionRequired = 'ActionRequired',
  WaitingProcurement = 'WaitingProcurement',
  Implementation = 'Implementation',
  Completed = 'Completed',
  Resolved = 'Resolved'
}

export type HazardCategory = 'A' | 'B' | 'C';

export interface HazardReport {
  id: string; // Database primary key UUID (from public.hazard_reports.id)
  ticketId: string; // Business Ticket ID (from public.hazard_reports.ticket_id, e.g. HZ-2026-0001)
  uuid?: string; // Holds the primary key UUID from public.hazard_reports.id (alias)
  title: string;
  description: string;
  department: string;
  area: string;
  reporterName: string;
  reporterEmail: string;
  employeeId: string;
  picId?: string;
  picName?: string;
  picEmail?: string;
  createdAt: string;
  updatedAt: string;
  status: HazardStatus;
  category?: HazardCategory;
  hazardCategory?: string;
  officerComments?: string;
  photoEvidenceUrl?: string;
  priority?: string;
  dfaStatus?: string;
  officerReviewed?: boolean;
  officerReviewDate?: string;
  // Native Form Fields (16 Question Model)
  position?: string;
  incidentDate?: string;
  detailLocation?: string;
  potentialImpact?: string;
  injuryStatus?: string;
  temporaryAction?: string;
  currentCondition?: string;
  reportedToLeader?: string;
  suggestion?: string;
  // PEP-HSE-P-01-IK-01 Risk Evaluation
  severity?: number;
  likelihood?: number;
  riskScore?: number;
  riskLevel?: 'Low' | 'Moderate' | 'High' | 'Extreme';
  additionalControl?: string;
  otpRequired?: boolean;
  otpProgramName?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'employee' | 'hse_admin' | 'management' | 'hse_officer' | 'ppe_officer' | 'hrga_admin' | 'env_officer';
  departmentId?: string;
  position?: string;
}

export interface AuditLog {
  id: string;
  hazardId: string;
  ticketId?: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  recipientRole?: string;
  recipientEmail?: string;
}

export type NotificationEventType = 
  | 'reportCreated' 
  | 'statusUpdated' 
  | 'reportCompleted' 
  | 'reminderDay3' 
  | 'reminderDay7' 
  | 'reminderDay14' 
  | 'reminderDay30' 
  | 'weeklyReport';

export interface RecipientNotificationEvents {
  reportCreated: boolean;
  statusUpdated: boolean;
  reportCompleted: boolean;
  reminderDay3: boolean;
  reminderDay7: boolean;
  reminderDay14: boolean;
  reminderDay30: boolean;
  weeklyReport: boolean;
}

export interface Recipient {
  id: string;
  category?: string;
  name: string;
  position?: string; // Jabatan
  email: string;
  role: string;
  active?: boolean; // Status Aktif / Nonaktif
  isMandatory?: boolean; // Penerima Wajib
  mode?: 'all' | 'keyword'; // Mode A: 'all' (Kirim Semua Notifikasi) | Mode B: 'keyword' (Keyword Based)
  keywords?: string[]; // Custom / Selected keywords for Mode B
  notificationEvents?: RecipientNotificationEvents; // Checkboxes for notification types
}

export interface WeeklyReport {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  totalReported: number;
  totalResolved: number;
  criticalCount: number;
  compiledAt: string;
  pdfBase64?: string;
  generatedBy?: string;
}

/**
 * Deterministic Finite Automaton (DFA) Validation Engine
 * Validates allowable state transitions for hazard tickets.
 */
export class DFAValidationEngine {
  private static allowedTransitions: Record<HazardStatus, HazardStatus[]> = {
    [HazardStatus.NewReport]: [HazardStatus.PendingValidation],
    [HazardStatus.PendingValidation]: [HazardStatus.UnderInvestigation],
    [HazardStatus.UnderInvestigation]: [HazardStatus.ActionRequired, HazardStatus.WaitingProcurement, HazardStatus.Implementation, HazardStatus.Completed],
    [HazardStatus.ActionRequired]: [HazardStatus.WaitingProcurement, HazardStatus.Implementation, HazardStatus.Completed],
    [HazardStatus.WaitingProcurement]: [HazardStatus.Implementation, HazardStatus.Completed],
    [HazardStatus.Implementation]: [HazardStatus.Completed, HazardStatus.UnderInvestigation],
    [HazardStatus.Completed]: [HazardStatus.Resolved, HazardStatus.UnderInvestigation],
    [HazardStatus.Resolved]: [HazardStatus.UnderInvestigation]
  };

  /**
   * Validates if a status transition is permitted under the DFA rules.
   */
  public static isValidTransition(current: HazardStatus, next: HazardStatus): boolean {
    const targets = this.allowedTransitions[current] || [];
    return targets.includes(next);
  }

  /**
   * Retrieves the lists of permissible subsequent states.
   */
  public static getNextAllowedStates(current: HazardStatus): HazardStatus[] {
    return this.allowedTransitions[current] || [];
  }
}

export interface NotificationTemplate {
  id: 'assigned' | 'status_updated' | 'overdue' | 'completed';
  name: string;
  subject: string;
  body: string;
  placeholders: string[];
}

