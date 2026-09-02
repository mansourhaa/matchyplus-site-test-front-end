import { adminApi, extractAdminErrorMessage } from '@/lib/admin-api';
import type { RootState } from '@/lib/store';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type {
  AdminCreateTeamMemberInput,
  AdminTeamFilters,
  AdminTeamMember,
  AdminTeamState,
  AdminUpdateTeamMemberInput,
} from '../types';

const initialState: AdminTeamState = {
  members: [],
  total: 0,
  loading: false,
  creating: false,
  error: null,
  filters: {
    search: '',
  },
};

export const fetchAdminTeam = createAsyncThunk(
  'adminTeam/fetchTeam',
  async (filters: AdminTeamFilters) => {
    const response = await adminApi.get('/admin/team', {
      params: { limit: 200, search: filters.search || undefined },
    });
    return response.data as { team: AdminTeamMember[]; total: number };
  },
);

export const createAdminTeamMember = createAsyncThunk(
  'adminTeam/createTeamMember',
  async (input: AdminCreateTeamMemberInput, { rejectWithValue }) => {
    try {
      const response = await adminApi.post('/admin/team', input);
      return response.data.member as AdminTeamMember;
    } catch (error) {
      return rejectWithValue(extractAdminErrorMessage(error, 'Impossible de créer ce compte.'));
    }
  },
);

export const updateAdminTeamMember = createAsyncThunk(
  'adminTeam/updateTeamMember',
  async (
    { id, changes }: { id: string; changes: AdminUpdateTeamMemberInput },
    { rejectWithValue },
  ) => {
    try {
      const response = await adminApi.put(`/admin/users/${id}`, changes);
      return response.data.user as AdminTeamMember;
    } catch (error) {
      return rejectWithValue(
        extractAdminErrorMessage(error, "Impossible d'enregistrer les modifications."),
      );
    }
  },
);

export const updateAdminTeamMemberStatus = createAsyncThunk(
  'adminTeam/updateTeamMemberStatus',
  async (
    { id, status }: { id: string; status: AdminTeamMember['status'] },
    { rejectWithValue },
  ) => {
    try {
      const response = await adminApi.patch(`/admin/users/${id}/status`, { status });
      return response.data.user as AdminTeamMember;
    } catch (error) {
      return rejectWithValue(
        extractAdminErrorMessage(error, 'Impossible de modifier le statut de ce compte.'),
      );
    }
  },
);

const upsertMember = (state: AdminTeamState, member: AdminTeamMember) => {
  state.members = state.members.map((entry) => (entry.id === member.id ? member : entry));
};

const adminTeamSlice = createSlice({
  name: 'adminTeam',
  initialState,
  reducers: {
    setTeamFilters(state, action: PayloadAction<Partial<AdminTeamFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.members = action.payload.team;
        state.total = action.payload.total;
      })
      .addCase(fetchAdminTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Impossible de charger l'équipe";
      })
      .addCase(createAdminTeamMember.pending, (state) => {
        state.creating = true;
      })
      .addCase(createAdminTeamMember.fulfilled, (state, action) => {
        state.creating = false;
        state.error = null;
        state.members = [action.payload, ...state.members];
        state.total += 1;
      })
      .addCase(createAdminTeamMember.rejected, (state, action) => {
        state.creating = false;
        state.error = (action.payload as string | undefined) ?? 'Impossible de créer ce compte.';
      })
      .addCase(updateAdminTeamMember.fulfilled, (state, action) => {
        state.error = null;
        upsertMember(state, action.payload);
      })
      .addCase(updateAdminTeamMember.rejected, (state, action) => {
        state.error =
          (action.payload as string | undefined) ?? "Impossible d'enregistrer les modifications.";
      })
      .addCase(updateAdminTeamMemberStatus.fulfilled, (state, action) => {
        state.error = null;
        upsertMember(state, action.payload);
      })
      .addCase(updateAdminTeamMemberStatus.rejected, (state, action) => {
        state.error =
          (action.payload as string | undefined) ??
          'Impossible de modifier le statut de ce compte.';
      });
  },
});

export const { setTeamFilters } = adminTeamSlice.actions;

export const selectAdminTeam = (state: RootState) => state.adminTeam;

export default adminTeamSlice.reducer;
