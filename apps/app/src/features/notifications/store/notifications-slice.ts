import { api, getApiErrorCode } from '@/lib/api';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { NotificationItem } from '../types';

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
};

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,
  revision: 0,
};

type ListResponse = {
  notifications: NotificationItem[];
  unread_count: number;
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (_: void, { getState }) => {
    const revisionAtStart = (getState() as { notifications: NotificationsState }).notifications
      .revision;
    try {
      const response = await api.get<ListResponse>('/notifications');
      return { ...response.data, revisionAtStart };
    } catch (error) {
      throw new Error(getApiErrorCode(error) ?? 'notifications_fetch_failed');
    }
  },
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      return id;
    } catch (error) {
      throw new Error(getApiErrorCode(error) ?? 'notification_mark_read_failed');
    }
  },
);

export const markAllNotificationsRead = createAsyncThunk('notifications/markAllRead', async () => {
  try {
    await api.post('/notifications/read-all');
  } catch (error) {
    throw new Error(getApiErrorCode(error) ?? 'notifications_mark_all_read_failed');
  }
});

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
          state.loading = false;
          // A mark-read/mark-all-read committed after this request started but before it
          // resolved — its snapshot may predate that commit, so it's dropped rather than
          // trusted. The next fetch (e.g. the one a realtime push triggers) will capture
          // the current revision and apply cleanly.
          if (action.payload.revisionAtStart !== state.revision) return;
          state.items = action.payload.notifications;
          state.unreadCount = action.payload.unread_count;
        },
      )
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'notifications_fetch_failed';
      })
      .addCase(markNotificationRead.fulfilled, (state, action: PayloadAction<string>) => {
        const item = state.items.find((entry) => entry.id === action.payload);
        if (item && !item.read) {
          item.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.revision += 1;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach((item) => {
          item.read = true;
        });
        state.unreadCount = 0;
        state.revision += 1;
      });
  },
});

export const selectNotifications = (state: { notifications: NotificationsState }) =>
  state.notifications;

export default notificationsSlice.reducer;
