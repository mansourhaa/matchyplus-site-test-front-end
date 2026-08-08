import { api, getApiErrorCode } from '@/lib/api';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { IdentityVerificationJob, IdentityVerificationStatusResponse } from '../types';

type IdentityVerificationState = {
  job: IdentityVerificationJob | null;
  identityVerified: boolean;
  submitting: boolean;
  polling: boolean;
  error: string | null;
};

const initialState: IdentityVerificationState = {
  job: null,
  identityVerified: false,
  submitting: false,
  polling: false,
  error: null,
};

export const submitIdentitySelfie = createAsyncThunk(
  'identityVerification/submit',
  async (selfie: Blob) => {
    try {
      const form = new FormData();
      form.append('selfie', selfie, 'selfie.jpg');
      const response = await api.post<{ job: IdentityVerificationJob }>(
        '/users/me/identity-verification',
        form,
      );
      return response.data.job;
    } catch (error) {
      throw new Error(getApiErrorCode(error) ?? 'identity_verification_submit_failed');
    }
  },
);

export const fetchIdentityVerificationStatus = createAsyncThunk(
  'identityVerification/fetchStatus',
  async (jobId: string) => {
    try {
      const response = await api.get<IdentityVerificationStatusResponse>(
        `/users/me/identity-verification/${jobId}`,
      );
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorCode(error) ?? 'identity_verification_status_failed');
    }
  },
);

const identityVerificationSlice = createSlice({
  name: 'identityVerification',
  initialState,
  reducers: {
    resetIdentityVerification: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitIdentitySelfie.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(
        submitIdentitySelfie.fulfilled,
        (state, action: PayloadAction<IdentityVerificationJob>) => {
          state.submitting = false;
          state.job = action.payload;
        },
      )
      .addCase(submitIdentitySelfie.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.error.message || "Échec de l'envoi du selfie";
      })
      .addCase(fetchIdentityVerificationStatus.pending, (state) => {
        state.polling = true;
      })
      .addCase(
        fetchIdentityVerificationStatus.fulfilled,
        (state, action: PayloadAction<IdentityVerificationStatusResponse>) => {
          state.polling = false;
          state.job = action.payload.job;
          state.identityVerified = action.payload.identityVerified;
        },
      )
      .addCase(fetchIdentityVerificationStatus.rejected, (state, action) => {
        state.polling = false;
        state.error = action.error.message || 'Échec de la vérification du statut';
      });
  },
});

export const { resetIdentityVerification } = identityVerificationSlice.actions;

export const selectIdentityVerification = (state: {
  identityVerification: IdentityVerificationState;
}) => state.identityVerification;

export default identityVerificationSlice.reducer;
