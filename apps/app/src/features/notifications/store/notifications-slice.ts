import {
  changePassword,
  deleteAccount,
  fetchCurrentUser,
  logout,
  resetAuthState,
} from '@/features/auth/store/auth-slice';
import { api, getApiErrorCode } from '@/lib/api';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type {
  NotificationItem,
  NotificationPreferences,
  UpdateNotificationPreferencesBody,
} from '../types';

type NotificationsState = {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  // Bumped by every mark-read / mark-all-read commit. fetchNotifications captures this
  // value when it starts (see revisionAtStart below); if it no longer matches by the
  // time the fetch resolves, a mark committed while that request was in flight and its
  // snapshot can't be trusted — the fulfilled handler discards it instead of risking a
  // stale unread row, or a stale unread_count, undoing what the mark already applied.
  revision: number;
  preferences: NotificationPreferences | null;
  preferencesLoading: boolean;
  preferencesError: string | null;
};

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,
  revision: 0,
  preferences: null,
  preferencesLoading: false,
  preferencesError: null,
};

type ListResponse = {
  notifications: NotificationItem[];
  unread_count: number;
};

function currentRevision(getState: () => unknown): number {
  return (getState() as { notifications: NotificationsState }).notifications.revision;
}

export const fetchNotifications = createAsyncThunk<
  ListResponse & { revisionAtStart: number },
  void,
  { rejectValue: { message: string; revisionAtStart: number } }
>('notifications/fetch', async (_, { getState, rejectWithValue }) => {
  const revisionAtStart = currentRevision(getState);
  try {
    const response = await api.get<ListResponse>('/notifications');
    return { ...response.data, revisionAtStart };
  } catch (error) {
    // Rejection carries revisionAtStart too — otherwise a 401 that only fails because
    // the session was reset out from under it (see resetForNewSession) could still
    // land an error message into whichever new session is active by the time it settles.
    return rejectWithValue({
      message: getApiErrorCode(error) ?? 'notifications_fetch_failed',
      revisionAtStart,
    });
  }
});

export const markNotificationRead = createAsyncThunk<
  { id: string; revisionAtStart: number },
  string,
  { rejectValue: string }
>('notifications/markRead', async (id, { getState, rejectWithValue }) => {
  const revisionAtStart = currentRevision(getState);
  try {
    await api.post(`/notifications/${id}/read`);
    return { id, revisionAtStart };
  } catch (error) {
    return rejectWithValue(getApiErrorCode(error) ?? 'notification_mark_read_failed');
  }
});

export const markAllNotificationsRead = createAsyncThunk<
  { revisionAtStart: number },
  void,
  { rejectValue: string }
>('notifications/markAllRead', async (_, { getState, rejectWithValue }) => {
  const revisionAtStart = currentRevision(getState);
  try {
    await api.post('/notifications/read-all');
    return { revisionAtStart };
  } catch (error) {
    return rejectWithValue(getApiErrorCode(error) ?? 'notifications_mark_all_read_failed');
  }
});

export const fetchNotificationPreferences = createAsyncThunk<
  NotificationPreferences,
  void,
  { rejectValue: string }
>('notifications/fetchPreferences', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ preferences: NotificationPreferences }>(
      '/notifications/preferences',
    );
    return response.data.preferences;
  } catch (error) {
    return rejectWithValue(getApiErrorCode(error) ?? 'notification_preferences_fetch_failed');
  }
});

export const updateNotificationPreferences = createAsyncThunk<
  NotificationPreferences,
  UpdateNotificationPreferencesBody,
  { rejectValue: string }
>('notifications/updatePreferences', async (body, { rejectWithValue }) => {
  try {
    const response = await api.put<{ preferences: NotificationPreferences }>(
      '/notifications/preferences',
      body,
    );
    return response.data.preferences;
  } catch (error) {
    return rejectWithValue(getApiErrorCode(error) ?? 'notification_preferences_update_failed');
  }
});

function resetForNewSession(state: NotificationsState) {
  state.items = [];
  state.unreadCount = 0;
  state.loading = false;
  state.error = null;
  state.revision += 1;
  state.preferences = null;
  state.preferencesLoading = false;
  state.preferencesError = null;
}

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchNotifications.fulfilled,
        (state, action: PayloadAction<ListResponse & { revisionAtStart: number }>) => {
          // A mark-read/mark-all-read committed after this request started but before it
          // resolved — its snapshot may predate that commit, so it's dropped entirely
          // (loading included: if a fresh fetch that same mark triggers is still in
          // flight, this stale response must not flip loading back to false under it).
          // The caller that triggered the mark also dispatches a follow-up fetch of its
          // own once it lands, so nothing from this snapshot is permanently lost.
          if (action.payload.revisionAtStart !== state.revision) return;
          state.loading = false;
          state.items = action.payload.notifications;
          state.unreadCount = action.payload.unread_count;
        },
      )
      .addCase(
        fetchNotifications.rejected,
        (
          state,
          action: PayloadAction<{ message: string; revisionAtStart: number } | undefined>,
        ) => {
          if (!action.payload || action.payload.revisionAtStart !== state.revision) return;
          state.loading = false;
          state.error = action.payload.message;
        },
      )
      .addCase(
        markNotificationRead.fulfilled,
        (state, action: PayloadAction<{ id: string; revisionAtStart: number }>) => {
          // Stale relative to a session reset that happened while this request was in
          // flight — a no-op, including the revision bump: bumping it here would discard
          // the new session's own in-flight fetch for no reason.
          if (action.payload.revisionAtStart !== state.revision) return;
          const item = state.items.find((entry) => entry.id === action.payload.id);
          if (item && !item.read) {
            item.read = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.revision += 1;
        },
      )
      .addCase(
        markAllNotificationsRead.fulfilled,
        (state, action: PayloadAction<{ revisionAtStart: number }>) => {
          if (action.payload.revisionAtStart !== state.revision) return;
          state.items.forEach((item) => {
            item.read = true;
          });
          state.unreadCount = 0;
          state.revision += 1;
        },
      )
      .addCase(fetchNotificationPreferences.pending, (state) => {
        state.preferencesLoading = true;
        state.preferencesError = null;
      })
      .addCase(fetchNotificationPreferences.fulfilled, (state, action) => {
        state.preferencesLoading = false;
        state.preferences = action.payload;
      })
      .addCase(fetchNotificationPreferences.rejected, (state, action) => {
        state.preferencesLoading = false;
        state.preferencesError = action.payload ?? 'notification_preferences_fetch_failed';
      })
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
        state.preferencesError = null;
      })
      .addCase(updateNotificationPreferences.rejected, (state, action) => {
        state.preferencesError = action.payload ?? 'notification_preferences_update_failed';
      })
      // Every path that ends the session — explicit logout, a forced logout after a
      // password change or account deletion, and the silent auth-reset a failed token
      // refresh triggers — must drop this account's notifications immediately. Otherwise
      // a soft logout leaves the previous user's feed mounted for whoever logs in next,
      // and the revision bump (not a reset to a fixed value) guarantees an in-flight
      // fetch from the old session can never match again and apply its stale data.
      .addCase(logout.fulfilled, resetForNewSession)
      .addCase(resetAuthState, resetForNewSession)
      .addCase(changePassword.fulfilled, resetForNewSession)
      .addCase(deleteAccount.fulfilled, resetForNewSession)
      .addCase(fetchCurrentUser.rejected, resetForNewSession);
  },
});

export const selectNotifications = (state: { notifications?: NotificationsState }) =>
  state.notifications ?? initialState;

export default notificationsSlice.reducer;
