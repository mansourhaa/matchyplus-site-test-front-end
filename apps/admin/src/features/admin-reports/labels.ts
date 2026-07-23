import type { ReportStatus } from './types';

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: 'En attente',
  REVIEWED: 'Examiné',
  RESOLVED: 'Résolu',
  DISMISSED: 'Rejeté',
};

export const REPORT_STATUS_COLOR: Record<ReportStatus, string> = {
  PENDING: '#F5A623',
  REVIEWED: '#2F76BB',
  RESOLVED: '#61BCA6',
  DISMISSED: '#95A5A6',
};
