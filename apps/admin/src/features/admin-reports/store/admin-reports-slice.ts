import { adminApi } from '@/lib/admin-api';
import type { RootState } from '@/lib/store';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import type { AdminReport, AdminReportsState, ReportStatus } from '../types';

const initialState: AdminReportsState = {
  reports: [],
  loading: false,
  error: null,
  statusFilter: 'all',
};

export const fetchAdminReports = createAsyncThunk(
  'adminReports/fetch',
  async (statusFilter: AdminReportsState['statusFilter']) => {
    const response = await adminApi.get('/admin/reports', {
      params: { status: statusFilter !== 'all' ? statusFilter : undefined },
    });
    return response.data.reports as AdminReport[];
  },
);

export const updateAdminReportStatus = createAsyncThunk(
  'adminReports/updateStatus',
  async ({ id, status }: { id: string; status: ReportStatus }) => {
    const response = await adminApi.patch(`/admin/reports/${id}`, { status });
    return response.data.report as AdminReport;
  },
);

const adminReportsSlice = createSlice({
  name: 'adminReports',
  initialState,
  reducers: {
    setReportStatusFilter(state, action: PayloadAction<AdminReportsState['statusFilter']>) {
      state.statusFilter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload;
      })
      .addCase(fetchAdminReports.rejected, (state) => {
        state.loading = false;
        state.error = 'Impossible de charger les signalements.';
      })
      .addCase(updateAdminReportStatus.fulfilled, (state, action) => {
        state.error = null;
        state.reports = state.reports.map((report) =>
          report.id === action.payload.id ? action.payload : report,
        );
      })
      .addCase(updateAdminReportStatus.rejected, (state) => {
        state.error = 'Impossible de mettre à jour ce signalement.';
      });
  },
});

export const { setReportStatusFilter } = adminReportsSlice.actions;

export const selectAdminReportsState = (state: RootState) => state.adminReports;

export const selectAdminReports = createSelector(
  [selectAdminReportsState],
  (adminReports) => adminReports,
);

/** Count of still-pending reports, for the sidebar badge ("admin reçoit"). */
export const selectPendingReportCount = createSelector([selectAdminReportsState], (adminReports) =>
  adminReports.reports.reduce((count, report) => count + (report.status === 'PENDING' ? 1 : 0), 0),
);

/**
 * Reports grouped by the reported user — the "per user" view the admin asked for. Each group
 * keeps the reported account plus every report filed against it (with its reporter).
 */
export const selectReportsByReportedUser = createSelector([selectAdminReportsState], (state) => {
  const groups = new Map<string, { reported: AdminReport['reported']; reports: AdminReport[] }>();

  state.reports.forEach((report) => {
    const existing = groups.get(report.reported.id);
    if (existing) {
      existing.reports.push(report);
    } else {
      groups.set(report.reported.id, { reported: report.reported, reports: [report] });
    }
  });

  // Most-reported first, then by most recent report within a tie.
  return Array.from(groups.values()).sort((a, b) => b.reports.length - a.reports.length);
});

export default adminReportsSlice.reducer;
