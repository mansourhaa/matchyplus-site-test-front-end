import { adminApi, extractAdminErrorMessage } from '@/lib/admin-api';
import type { RootState } from '@/lib/store';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type {
  AdminCreateUserInput,
  AdminCreateUserResult,
  AdminManagedUser,
  AdminRegenerateActivationResult,
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
  creatingUser: false,
  error: null,
  filters: {
    search: '',
    plan: 'all',
    status: 'all',
    category: 'all',
  },
};

export const fetchAdminStats = createAsyncThunk(
  'adminUsers/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await adminApi.get('/admin/stats');
      return response.data.stats as AdminStats;
    } catch (error) {
      return rejectWithValue(
        extractAdminErrorMessage(error, 'Impossible de charger les statistiques.'),
      );
    }
  },
);

export const fetchAdminUsers = createAsyncThunk(
  'adminUsers/fetchUsers',
  async (filters: AdminUserFilters, { rejectWithValue }) => {
    try {
      const response = await adminApi.get('/admin/users', {
        params: {
          limit: 200,
          search: filters.search || undefined,
          status: filters.status !== 'all' ? filters.status : undefined,
          plan: filters.plan !== 'all' ? filters.plan : undefined,
          category: filters.category !== 'all' ? filters.category : undefined,
        },
      });
      return response.data as { users: AdminManagedUser[]; total: number };
    } catch (error) {
      return rejectWithValue(
        extractAdminErrorMessage(error, 'Impossible de charger les utilisateurs.'),
      );
    }
  },
);

export const fetchAdminUserById = createAsyncThunk(
  'adminUsers/fetchUserById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await adminApi.get(`/admin/users/${id}`);
      return response.data.user as AdminManagedUser;
    } catch (error) {
      return rejectWithValue(
        extractAdminErrorMessage(error, "Impossible de charger les détails de l'utilisateur."),
      );
    }
  },
);

export const createAdminUser = createAsyncThunk(
  'adminUsers/createUser',
  async (input: AdminCreateUserInput, { rejectWithValue }) => {
    try {
      const response = await adminApi.post<AdminCreateUserResult>('/admin/users', input);
      return response.data;
    } catch (error) {
      return rejectWithValue(extractAdminErrorMessage(error, "Impossible de créer l'utilisateur."));
    }
  },
);

export const regenerateAdminUserActivation = createAsyncThunk(
  'adminUsers/regenerateActivation',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await adminApi.post<AdminRegenerateActivationResult>(
        `/admin/users/${userId}/regenerate-activation`,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        extractAdminErrorMessage(error, "Impossible de régénérer le lien d'activation."),
      );
    }
  },
);

export const updateAdminUser = createAsyncThunk(
  'adminUsers/updateUser',
  async ({ id, changes }: { id: string; changes: AdminUserUpdate }, { rejectWithValue }) => {
    try {
      const response = await adminApi.put(`/admin/users/${id}`, changes);
      return response.data.user as AdminManagedUser;
    } catch (error) {
      return rejectWithValue(
        extractAdminErrorMessage(error, "Impossible d'enregistrer les modifications."),
      );
    }
  },
);

export const updateAdminUserStatus = createAsyncThunk(
  'adminUsers/updateUserStatus',
  async (
    { id, status }: { id: string; status: AdminManagedUser['status'] },
    { rejectWithValue },
  ) => {
    try {
      const response = await adminApi.patch(`/admin/users/${id}/status`, { status });
      return response.data.user as AdminManagedUser;
    } catch (error) {
      return rejectWithValue(
        extractAdminErrorMessage(error, 'Impossible de modifier le statut de cet utilisateur.'),
      );
    }
  },
);

export const deleteAdminUser = createAsyncThunk(
  'adminUsers/deleteUser',
  async (id: string, { rejectWithValue }) => {
    try {
      await adminApi.delete(`/admin/users/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        extractAdminErrorMessage(error, 'Impossible de supprimer cet utilisateur.'),
      );
    }
  },
);

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
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Impossible de charger les utilisateurs';
      })
      .addCase(fetchAdminUserById.fulfilled, (state, action) => {
        state.selectedUser = action.payload;
        upsertUser(state, action.payload);
      })
      .addCase(createAdminUser.pending, (state) => {
        state.creatingUser = true;
      })
      .addCase(createAdminUser.fulfilled, (state, action) => {
        state.creatingUser = false;
        state.error = null;
        state.users = [action.payload.user, ...state.users];
        state.total += 1;
      })
      .addCase(createAdminUser.rejected, (state, action) => {
        state.creatingUser = false;
        state.error =
          (action.payload as string | undefined) ?? "Impossible de créer l'utilisateur.";
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
