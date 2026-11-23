import {
  changePassword,
  deleteAccount,
  logout,
  resetAuthState,
} from '@/features/auth/store/auth-slice';
import type { Locale } from '@/features/i18n/messages';
import { api, getApiErrorCode } from '@/lib/api';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { OnboardingProfile, OnboardingProfilePatch } from '../types';
import {
  type OnboardingSuggestions,
  type RelabelSource,
  type RelabelledFields,
  type RelabelledProposals,
  type VideoAnalysisResult,
  applyRelabel,
  keepPageScript,
  proposalsForRelabel,
  relabelSourceFromAnalysis,
  suggestionsFromAnalysis,
} from '../video-analysis';

export type VideoAnalysisStatus = 'idle' | 'running' | 'succeeded' | 'failed';

type VideoAnalysisState = {
  /** Thunk request id: a late answer for a removed/replaced video is ignored. */
  requestId: string | null;
  status: VideoAnalysisStatus;
  suggestions: OnboardingSuggestions | null;
  error: string | null;
  /** Page language of `suggestions`. */
  locale?: Locale | null;
  /** Language of the analysis itself, and the AI's own words, for the language switch. */
  analysisLocale?: Locale | null;
  source?: RelabelSource | null;
  /** Suggestions already written per language: going back to a language gives them back. */
  byLocale?: Partial<Record<Locale, OnboardingSuggestions>>;
};

type OnboardingState = {
  loading: boolean;
  error: string | null;
  profile: OnboardingProfile | null;
  /** Optional so stores built without it (tests, preloaded state) stay valid. */
  videoAnalysis?: VideoAnalysisState;
};

const initialVideoAnalysis: VideoAnalysisState = {
  requestId: null,
  status: 'idle',
  suggestions: null,
  error: null,
};

const initialState: OnboardingState = {
  loading: false,
  error: null,
  profile: null,
  videoAnalysis: initialVideoAnalysis,
};

type VideoAnalysisJob = {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  result: VideoAnalysisResult | null;
  error: string | null;
};

const VIDEO_ANALYSIS_POLL_MS = 2000;
// ~2 minutes: the first analysis after a restart also loads the speech models.
const VIDEO_ANALYSIS_MAX_POLLS = 60;
const TERMINAL_JOB_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Same catch-and-rethrow-a-stable-code pattern as authSlice's loginPhone/registerPhone —
// without it, action.error.message on rejection is axios's generic "Request failed with
// status code ..." instead of the API's actual error code (e.g. onboarding_incomplete).
export const fetchOnboardingProfile = createAsyncThunk('onboarding/fetchProfile', async () => {
  try {
    const response = await api.get<OnboardingProfile>('/users/me/profile', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorCode(error) ?? 'onboarding_fetch_failed');
  }
});

export const updateOnboardingProfile = createAsyncThunk(
  'onboarding/updateProfile',
  async (patch: OnboardingProfilePatch) => {
    try {
      const response = await api.patch<OnboardingProfile>('/users/me/profile', patch);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorCode(error) ?? 'onboarding_update_failed');
    }
  },
);

export const completeOnboarding = createAsyncThunk('onboarding/complete', async () => {
  try {
    const response = await api.post<OnboardingProfile>('/users/me/profile/complete');
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorCode(error) ?? 'onboarding_complete_failed');
  }
});

// Sends the video just recorded to the AI before the SMS check (no account needed), then
// polls until the worker is done. Resolves with the fields the voice service is sure
// about, in the page language; the steps only use them for fields the person left empty.
// The profile video itself is still uploaded after the OTP, as before.
export const analyzeProfileVideo = createAsyncThunk(
  'onboarding/analyzeVideo',
  async ({
    file,
    uiLocale,
  }: {
    file: File;
    uiLocale: Locale;
  }): Promise<{ suggestions: OnboardingSuggestions; source: RelabelSource }> => {
    let job: VideoAnalysisJob;
    try {
      const form = new FormData();
      form.append('uiLocale', uiLocale);
      form.append('video', file);
      const response = await api.post<{ job: VideoAnalysisJob; token: string }>(
        '/onboarding/video-analysis',
        form,
      );
      const { token } = response.data;
      job = response.data.job;
      for (
        let poll = 0;
        poll < VIDEO_ANALYSIS_MAX_POLLS && !TERMINAL_JOB_STATUSES.has(job.status);
        poll += 1
      ) {
        await wait(VIDEO_ANALYSIS_POLL_MS);
        const next = await api.get<{ job: VideoAnalysisJob }>(
          `/onboarding/video-analysis/${encodeURIComponent(job.id)}`,
          { params: { token } },
        );
        job = next.data.job;
      }
    } catch (error) {
      throw new Error(getApiErrorCode(error) ?? 'video_analysis_failed');
    }
    if (job.status !== 'SUCCEEDED' || !job.result?.ok) {
      throw new Error(job.result?.error ?? job.error ?? 'video_analysis_failed');
    }
    return {
      suggestions: suggestionsFromAnalysis(job.result, uiLocale),
      source: relabelSourceFromAnalysis(job.result),
    };
  },
);

type OnboardingRootState = { onboarding?: OnboardingState };

// Page language switch after the analysis: no AI and no new analysis. The voice service
// rewrites the AI's own words with its dictionaries (/onboarding/relabel); codes such as
// the sector, days and languages stay as they are.
export const relabelVideoAnalysis = createAsyncThunk<
  { analysisId: string; locale: Locale; suggestions: OnboardingSuggestions },
  Locale,
  { state: OnboardingRootState }
>(
  'onboarding/relabelVideo',
  async (locale, { getState }) => {
    const analysis = getState().onboarding?.videoAnalysis;
    const original = analysis?.analysisLocale ? analysis.byLocale?.[analysis.analysisLocale] : null;
    if (!analysis?.requestId || !analysis.source || !original) {
      throw new Error('nothing_to_relabel');
    }
    const cached = analysis.byLocale?.[locale];
    if (cached) return { analysisId: analysis.requestId, locale, suggestions: cached };
    try {
      const response = await api.post<{
        fields: RelabelledFields;
        suggestions?: RelabelledProposals;
      }>('/onboarding/relabel', {
        values: analysis.source.values,
        uiLocale: locale,
        serviceId: analysis.source.serviceId,
        aiFields: Object.keys(analysis.source.values),
        suggestions: proposalsForRelabel(original),
      });
      return {
        analysisId: analysis.requestId,
        locale,
        suggestions: applyRelabel(
          original,
          response.data.fields ?? {},
          locale,
          response.data.suggestions ?? {},
        ),
      };
    } catch (error) {
      throw new Error(getApiErrorCode(error) ?? 'relabel_failed');
    }
  },
  {
    condition: (locale, { getState }) => {
      const analysis = getState().onboarding?.videoAnalysis;
      return (
        analysis?.status === 'succeeded' && Boolean(analysis.locale) && analysis.locale !== locale
      );
    },
  },
);

// /inscription is reachable by an anonymous visitor now (identity also collects
// credentials for a fresh phone signup) — without this, a completed profile left over
// from a *previous* session (soft logout via client navigation, no full page reload)
// could bounce a new anonymous signup straight off identity, or pre-fill its fields.
// Deliberately NOT wired to fetchCurrentUser.rejected like notifications' equivalent
// reset: that bootstrap authcheck can still be in flight when a fresh visitor finishes
// phone signup, and a late (correctly stale) rejection must not wipe the profile that
// signup just started building — see the sessionGeneration guard in auth-slice.ts, which
// already prevents that same stale response from clearing the session itself.
function resetForNewSession(state: OnboardingState) {
  state.profile = null;
  state.loading = false;
  state.error = null;
  state.videoAnalysis = initialVideoAnalysis;
}

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    patchOnboardingProfile: (state, action: PayloadAction<Partial<OnboardingProfile>>) => {
      if (state.profile) Object.assign(state.profile, action.payload);
    },
    resetOnboardingDraft: (state) => {
      state.profile = null;
      state.loading = false;
      state.error = null;
      state.videoAnalysis = initialVideoAnalysis;
    },
    clearVideoAnalysis: (state) => {
      state.videoAnalysis = initialVideoAnalysis;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logout.fulfilled, resetForNewSession)
      .addCase(resetAuthState, resetForNewSession)
      .addCase(changePassword.fulfilled, resetForNewSession)
      .addCase(deleteAccount.fulfilled, resetForNewSession)
      .addCase(fetchOnboardingProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchOnboardingProfile.fulfilled,
        (state, action: PayloadAction<OnboardingProfile>) => {
          state.loading = false;
          state.profile = action.payload;
        },
      )
      .addCase(fetchOnboardingProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load profile';
      })
      .addCase(updateOnboardingProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateOnboardingProfile.fulfilled,
        (state, action: PayloadAction<OnboardingProfile>) => {
          state.loading = false;
          state.profile = action.payload;
        },
      )
      .addCase(updateOnboardingProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to save';
      })
      .addCase(analyzeProfileVideo.pending, (state, action) => {
        state.videoAnalysis = {
          requestId: action.meta.requestId,
          status: 'running',
          suggestions: null,
          error: null,
          locale: action.meta.arg.uiLocale,
          analysisLocale: action.meta.arg.uiLocale,
          source: null,
          byLocale: {},
        };
      })
      .addCase(analyzeProfileVideo.fulfilled, (state, action) => {
        if (state.videoAnalysis?.requestId !== action.meta.requestId) return;
        const locale = action.meta.arg.uiLocale;
        state.videoAnalysis.status = 'succeeded';
        state.videoAnalysis.suggestions = action.payload.suggestions;
        state.videoAnalysis.source = action.payload.source;
        state.videoAnalysis.locale = locale;
        state.videoAnalysis.analysisLocale = locale;
        state.videoAnalysis.byLocale = { [locale]: action.payload.suggestions };
      })
      .addCase(relabelVideoAnalysis.rejected, (state, action) => {
        // Voice service unreachable: no other language for the AI values, but never
        // leave the page with text in the wrong alphabet.
        const analysis = state.videoAnalysis;
        const original = analysis?.analysisLocale && analysis.byLocale?.[analysis.analysisLocale];
        if (!analysis || analysis.status !== 'succeeded' || !original) return;
        analysis.suggestions = keepPageScript(original, action.meta.arg);
        analysis.locale = action.meta.arg;
      })
      .addCase(relabelVideoAnalysis.fulfilled, (state, action) => {
        const analysis = state.videoAnalysis;
        if (!analysis || analysis.requestId !== action.payload.analysisId) return;
        analysis.suggestions = action.payload.suggestions;
        analysis.locale = action.payload.locale;
        analysis.byLocale = {
          ...analysis.byLocale,
          [action.payload.locale]: action.payload.suggestions,
        };
      })
      .addCase(analyzeProfileVideo.rejected, (state, action) => {
        if (state.videoAnalysis?.requestId !== action.meta.requestId) return;
        state.videoAnalysis.status = 'failed';
        state.videoAnalysis.error = action.error.message || 'video_analysis_failed';
      })
      .addCase(completeOnboarding.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeOnboarding.fulfilled, (state, action: PayloadAction<OnboardingProfile>) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(completeOnboarding.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to complete onboarding';
      });
  },
});

export const { patchOnboardingProfile, resetOnboardingDraft, clearVideoAnalysis } =
  onboardingSlice.actions;
export const selectOnboarding = (state: { onboarding?: OnboardingState }) =>
  state.onboarding ?? initialState;
export const selectVideoAnalysis = (state: { onboarding?: OnboardingState }) =>
  state.onboarding?.videoAnalysis ?? initialVideoAnalysis;

export default onboardingSlice.reducer;
