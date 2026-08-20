import { adminApi } from '@/lib/admin-api';
import type { RootState } from '@/lib/store';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type {
  AdminManagedUser,
  AdminStats,
  AdminUserFilters,
  AdminUserUpdate,
  AdminUsersState,
} from '../types';

const initialState: AdminUsersState = {
  users: [],
  total: 0,
  stats: null,
  selectedUser: null,
  loadingUsers: false,
  loadingStats: false,
  error: null,
  filters: {
    search: '',
    plan: 'all',
    status: 'all',
  },
};

export const fetchAdminStats = createAsyncThunk('adminUsers/fetchStats', async () => {
  const response = await adminApi.get('/admin/stats');
  return response.data.stats as AdminStats;
});

export const fetchAdminUsers = createAsyncThunk(
  'adminUsers/fetchUsers',
  async (filters: AdminUserFilters) => {
    const response = await adminApi.get('/admin/users', {
      params: {
        limit: 200,
        search: filters.search || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        plan: filters.plan !== 'all' ? filters.plan : undefined,
      },
    });
    return response.data as { users: AdminManagedUser[]; total: number };
  },
);

export const fetchAdminUserById = createAsyncThunk(
  'adminUsers/fetchUserById',
  async (id: string) => {
    const response = await adminApi.get(`/admin/users/${id}`);
    return response.data.user as AdminManagedUser;
  },
);

export const updateAdminUser = createAsyncThunk(
  'adminUsers/updateUser',
  async ({ id, changes }: { id: string; changes: AdminUserUpdate }) => {
    const response = await adminApi.put(`/admin/users/${id}`, changes);
    return response.data.user as AdminManagedUser;
  },
);

export const updateAdminUserStatus = createAsyncThunk(
  'adminUsers/updateUserStatus',
  async ({ id, status }: { id: string; status: AdminManagedUser['status'] }) => {
    const response = await adminApi.patch(`/admin/users/${id}/status`, { status });
    return response.data.user as AdminManagedUser;
  },
);

export const deleteAdminUser = createAsyncThunk('adminUsers/deleteUser', async (id: string) => {
  await adminApi.delete(`/admin/users/${id}`);
  return id;
});

const upsertUser = (state: AdminUsersState, user: AdminManagedUser) => {
  state.users = state.users.map((entry) => (entry.id === user.id ? user : entry));
  if (state.selectedUser?.id === user.id) {
    state.selectedUser = user;
  }
};

const adminUsersSlice = createSlice({
  name: 'adminUsers',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<AdminUserFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    selectUser(state, action: PayloadAction<AdminManagedUser | null>) {
      state.selectedUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminStats.pending, (state) => {
        state.loadingStats = true;
      })
      .addCase(fetchAdminStats.fulfilled, (state, action) => {
        state.loadingStats = false;
        state.stats = action.payload;
      })
      .addCase(fetchAdminStats.rejected, (state) => {
        state.loadingStats = false;
      })
      .addCase(fetchAdminUsers.pending, (state) => {
        state.loadingUsers = true;
        state.error = null;
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.loadingUsers = false;
        state.users = action.payload.users;
        state.total = action.payload.total;
      })
      .addCase(fetchAdminUsers.rejected, (state, action) => {
        state.loadingUsers = false;
        state.error = action.error.message ?? 'Impossible de charger les utilisateurs';
      })
      .addCase(fetchAdminUserById.fulfilled, (state, action) => {
        state.selectedUser = action.payload;
        upsertUser(state, action.payload);
      })
      .addCase(updateAdminUser.fulfilled, (state, action) => {
        state.error = null;
        upsertUser(state, action.payload);
      })
      .addCase(updateAdminUser.rejected, (state) => {
        state.error = "Impossible d'enregistrer les modifications.";
      })
      .addCase(updateAdminUserStatus.fulfilled, (state, action) => {
        state.error = null;
        upsertUser(state, action.payload);
      })
      .addCase(updateAdminUserStatus.rejected, (state) => {
        state.error = 'Impossible de modifier le statut de cet utilisateur.';
      })
      .addCase(deleteAdminUser.fulfilled, (state, action) => {
        state.error = null;
        state.users = state.users.filter((entry) => entry.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
        if (state.selectedUser?.id === action.payload) {
          state.selectedUser = null;
        }
      })
      .addCase(deleteAdminUser.rejected, (state) => {
        state.error = 'Impossible de supprimer cet utilisateur.';
      });
  },
});

export const { setFilters, selectUser } = adminUsersSlice.actions;

export const selectAdminUsersState = (state: RootState) => state.adminUsers;

export const selectAdminUsers = selectAdminUsersState;

export default adminUsersSlice.reducer;
