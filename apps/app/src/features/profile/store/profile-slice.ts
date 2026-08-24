import {
  changePassword,
  deleteAccount,
  fetchCurrentUser,
  logout,
  resetAuthState,
} from '@/features/auth/store/auth-slice';
import { api, getApiErrorCode } from '@/lib/api';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { MediaUploadResult, PublicProfile, RatingResult } from '../types';

type ProfileState = {
  viewedProfile: PublicProfile | null;
  viewedProfileLoading: boolean;
  viewedProfileError: string | null;
  mediaUploading: boolean;
  mediaError: string | null;
};

const initialState: ProfileState = {
  viewedProfile: null,
  viewedProfileLoading: false,
  viewedProfileError: null,
  mediaUploading: false,
  mediaError: null,
};

function resetForNewSession(state: ProfileState) {
  Object.assign(state, initialState);
}

// Same catch-and-rethrow-a-stable-code pattern as onboardingSlice/authSlice — otherwise
// action.error.message on rejection is axios's generic "Request failed with status code
// ..." instead of the API's actual error code (e.g. photo_too_large, blocked).
export const fetchPublicProfile = createAsyncThunk(
  'profile/fetchPublic',
  async (userId: string) => {
    try {
      const response = await api.get<PublicProfile>(`/profiles/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorCode(error) ?? 'profile_fetch_failed');
    }
  },
);

// Fire-and-forget: the caller doesn't need the result, so there's no loading/error state
// for this one. A failure here (e.g. the profile no longer exists) shouldn't block the
// viewer from seeing the page they're already looking at.
export const notifyProfileView = createAsyncThunk('profile/notifyView', async (userId: string) => {
  await api.post(`/profiles/${userId}/view`);
});

export const uploadProfilePhoto = createAsyncThunk('profile/uploadPhoto', async (file: File) => {
  try {
    const form = new FormData();
    form.append('photo', file);
    const response = await api.post<MediaUploadResult>('/users/me/profile/photo', form);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorCode(error) ?? 'photo_upload_failed');
  }
});

export const deleteProfilePhoto = createAsyncThunk('profile/deletePhoto', async () => {
  try {
    const response = await api.delete<MediaUploadResult>('/users/me/profile/photo');
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorCode(error) ?? 'photo_delete_failed');
  }
});

export const uploadProfileVideo = createAsyncThunk('profile/uploadVideo', async (file: File) => {
  try {
    const form = new FormData();
    form.append('video', file);
    const response = await api.post<MediaUploadResult>('/users/me/profile/video', form);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorCode(error) ?? 'video_upload_failed');
  }
});

export const deleteProfileVideo = createAsyncThunk('profile/deleteVideo', async () => {
  try {
    const response = await api.delete<MediaUploadResult>('/users/me/profile/video');
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorCode(error) ?? 'video_delete_failed');
  }
});

// Only allowed between matched users, one rating per pair — the API enforces both and
// rejects a second attempt with 'already_rated', which the caller handles explicitly
// rather than treating it as a generic failure.
export const rateProfile = createAsyncThunk(
  'profile/rate',
  async ({ userId, value }: { userId: string; value: number }) => {
    try {
      const response = await api.post<RatingResult>(`/profiles/${userId}/rating`, {
        rating: value,
      });
      return { userId, ...response.data };
    } catch (error) {
      throw new Error(getApiErrorCode(error) ?? 'rating_failed');
    }
  },
);

export const reportProfile = createAsyncThunk(
  'profile/report',
  async ({ userId, reason, details }: { userId: string; reason: string; details?: string }) => {
    try {
      const response = await api.post<{ reportId: string; status: string; message: string }>(
        `/reports/profiles/${userId}`,
        { reason, details },
      );
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorCode(error) ?? 'report_failed');
    }
  },
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublicProfile.pending, (state) => {
        state.viewedProfileLoading = true;
        state.viewedProfileError = null;
      })
      .addCase(fetchPublicProfile.fulfilled, (state, action: PayloadAction<PublicProfile>) => {
        state.viewedProfileLoading = false;
        state.viewedProfile = action.payload;
      })
      .addCase(fetchPublicProfile.rejected, (state, action) => {
        state.viewedProfileLoading = false;
        state.viewedProfileError = action.error.message || 'profile_fetch_failed';
      })
      .addCase(uploadProfilePhoto.pending, (state) => {
        state.mediaUploading = true;
        state.mediaError = null;
      })
      .addCase(uploadProfilePhoto.fulfilled, (state) => {
        state.mediaUploading = false;
      })
      .addCase(uploadProfilePhoto.rejected, (state, action) => {
        state.mediaUploading = false;
        state.mediaError = action.error.message || 'photo_upload_failed';
      })
      .addCase(deleteProfilePhoto.pending, (state) => {
        state.mediaUploading = true;
        state.mediaError = null;
      })
      .addCase(deleteProfilePhoto.fulfilled, (state) => {
        state.mediaUploading = false;
      })
      .addCase(deleteProfilePhoto.rejected, (state, action) => {
        state.mediaUploading = false;
        state.mediaError = action.error.message || 'photo_delete_failed';
      })
      .addCase(uploadProfileVideo.pending, (state) => {
        state.mediaUploading = true;
        state.mediaError = null;
      })
      .addCase(uploadProfileVideo.fulfilled, (state) => {
        state.mediaUploading = false;
      })
      .addCase(uploadProfileVideo.rejected, (state, action) => {
        state.mediaUploading = false;
        state.mediaError = action.error.message || 'video_upload_failed';
      })
      .addCase(deleteProfileVideo.pending, (state) => {
        state.mediaUploading = true;
        state.mediaError = null;
      })
      .addCase(deleteProfileVideo.fulfilled, (state) => {
        state.mediaUploading = false;
      })
      .addCase(deleteProfileVideo.rejected, (state, action) => {
        state.mediaUploading = false;
        state.mediaError = action.error.message || 'video_delete_failed';
      })
      .addCase(rateProfile.fulfilled, (state, action) => {
        if (state.viewedProfile && state.viewedProfile.id === action.payload.userId) {
          state.viewedProfile.rating = action.payload.rating;
          state.viewedProfile.reviews = action.payload.reviews;
          // Without this, reopening the same cached profile shows the star picker again
          // until another submit attempt bounces off the API with already_rated.
          state.viewedProfile.viewer_has_rated = true;
        }
      })
      .addCase(logout.fulfilled, resetForNewSession)
      .addCase(resetAuthState, resetForNewSession)
      .addCase(changePassword.fulfilled, resetForNewSession)
      .addCase(deleteAccount.fulfilled, resetForNewSession)
      .addCase(fetchCurrentUser.rejected, resetForNewSession);
  },
});

export const selectProfile = (state: { profile: ProfileState }) => state.profile;

export default profileSlice.reducer;
