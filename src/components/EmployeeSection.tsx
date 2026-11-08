import React from 'react';
import { HazardReport, User as AppUser } from '../types';
import NativeHazardForm from './NativeHazardForm';

interface EmployeeSectionProps {
  reports: HazardReport[];
  currentUser?: AppUser | null;
  onReportCreated?: (report: HazardReport) => void;
  onTrackReport?: (report: HazardReport) => void;
}

export default function EmployeeSection({
  reports,
  currentUser,
  onReportCreated,
  onTrackReport
}: EmployeeSectionProps) {
  return (
    <div className="space-y-6">
      <NativeHazardForm
        onReportCreated={(ticket) => {
          if (onReportCreated) onReportCreated(ticket);
        }}
        onViewTracker={(ticket) => {
          if (ticket && onTrackReport) {
            onTrackReport(ticket);
          }
        }}
      />
    </div>
  );
}
