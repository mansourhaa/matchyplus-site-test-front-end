import { ReportStatus } from '@saas-boilerplate/types';

export type CreateReportPayload = {
  reason: string;
  details?: string;
};

export type AdminListReportsQuery = {
  status?: ReportStatus;
  reportedId?: string;
};

export type AdminUpdateReportPayload = {
  status: ReportStatus;
};
