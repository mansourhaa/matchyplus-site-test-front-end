import { api, getApiErrorCode } from '@/lib/api';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { NotificationItem } from '../types';

type NotificationsState = {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
};

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,
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
        state.items = action.payload.notifications;
        state.unreadCount = action.payload.unread_count;
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
      });
  },
});

export const selectNotifications = (state: { notifications: NotificationsState }) =>
  state.notifications;

export default notificationsSlice.reducer;
