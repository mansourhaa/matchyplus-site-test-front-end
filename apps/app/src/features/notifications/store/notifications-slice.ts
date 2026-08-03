import { api, getApiErrorCode } from '@/lib/api';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { NotificationItem } from '../types';

type NotificationsState = {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  // Set when markAllNotificationsRead commits. A slower, already-in-flight fetch can
  // resolve afterwards with a snapshot taken before that commit — this timestamp lets
  // the merge below force any such stale-but-unread row to read, even one this client
  // has never seen locally before (e.g. a view that landed just ahead of the mark-all).
  markAllReadAt: string | null;
};

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,
  markAllReadAt: null,
};

type ListResponse = {
  notifications: NotificationItem[];
  unread_count: number;
};

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => {
  try {
    const response = await api.get<ListResponse>('/notifications');
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorCode(error) ?? 'notifications_fetch_failed');
  }
});

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
      .addCase(fetchNotifications.fulfilled, (state, action: PayloadAction<ListResponse>) => {
        state.loading = false;
        // A refetch triggered by a realtime push can land after a locally-applied
        // mark-read/mark-all-read, but reflect a server snapshot taken before that commit —
        // without this merge, that stale response would flip items back to unread. An item
        // already known read locally stays read; one covered by a mark-all (its created_at
        // predates markAllReadAt) is forced read too, even if this client never had it
        // locally — otherwise a view that landed just ahead of the mark-all could resurface
        // as unread. unreadCount comes from the server's total count (accurate beyond the
        // paginated `items` page), only adjusted for exactly the rows this merge forced.
        const locallyReadIds = new Set(
          state.items.filter((item) => item.read).map((item) => item.id),
        );
        let forcedReadCount = 0;
        state.items = action.payload.notifications.map((item) => {
          if (item.read) return item;
          const coveredByMarkAll =
            state.markAllReadAt !== null && item.created_at <= state.markAllReadAt;
          if (locallyReadIds.has(item.id) || coveredByMarkAll) {
            forcedReadCount += 1;
            return { ...item, read: true };
          }
          return item;
        });
        state.unreadCount = Math.max(0, action.payload.unread_count - forcedReadCount);
      })
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
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach((item) => {
          item.read = true;
        });
        state.unreadCount = 0;
        state.markAllReadAt = new Date().toISOString();
      });
  },
});

export const selectNotifications = (state: { notifications: NotificationsState }) =>
  state.notifications;

export default notificationsSlice.reducer;
