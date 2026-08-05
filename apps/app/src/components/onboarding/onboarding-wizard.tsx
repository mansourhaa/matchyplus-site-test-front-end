'use client';

import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { fetchCurrentUser, selectAuth } from '@/features/auth/store/auth-slice';
import {
  getNextStep,
  getPreviousStep,
  getStepNumber,
  getStepOrder,
} from '@/features/onboarding/step-order';
import {
  completeOnboarding,
  fetchOnboardingProfile,
  selectOnboarding,
  updateOnboardingProfile,
} from '@/features/onboarding/store/onboarding-slice';
import type { OnboardingProfilePatch, OnboardingStep } from '@/features/onboarding/types';
import { resolvePostAuthDestination } from '@/lib/post-auth-routing';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { IdentityStep } from './identity-step';
import { InterestsStep } from './interests-step';
import { LocationStep } from './location-step';

const VALID_STEPS: OnboardingStep[] = ['identity', 'interests', 'location'];

// Reachable by both a brand-new, unauthenticated visitor (identity step also collects
// credentials in that case — see IdentityStep) and an authenticated-but-incomplete user.
export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isAuthenticated, sessionChecked } = useAppSelector(selectAuth);
  const { profile, loading } = useAppSelector(selectOnboarding);

  // Set by IdentityStep the instant it's about to attempt registerPhone, and cleared
  // once the following identity save actually succeeds (see goToNextStep/
  // finishOnboarding below) — never on a failed save, so a stale ?step= can't tear the
  // user away from identity (OTP modal included) while there's still no saved
  // name/photo/job to show elsewhere, or before the save has even been retried
  // successfully.
  const [justRegistered, setJustRegistered] = useState(false);

  // A validated session requires both: isAuthenticated can be true from a redux-persist
  // rehydration before the bootstrap authcheck has actually confirmed the cookie is
  // still valid. Trusting that alone would let an expired persisted session briefly
  // honor a deep-linked later step and hit authenticated APIs that 401.
  const hasValidatedSession = isAuthenticated && sessionChecked;

  const requestedStep = searchParams.get('step');
  // A brand-new visitor (or one whose session hasn't been validated yet) has no
  // confirmed session, so only the identity step (which also collects credentials for a
  // new visitor) is reachable — any other requested step would just render a form whose
  // save always 401s. Ignore ?step= entirely until validated, and keep ignoring it
  // through the brief registered-but-not-yet-saved window too.
  const step: OnboardingStep =
    hasValidatedSession && !justRegistered && VALID_STEPS.includes(requestedStep as OnboardingStep)
      ? (requestedStep as OnboardingStep)
      : 'identity';
  const nextParam = searchParams.get('next');

  useEffect(() => {
    // An unvalidated session has no confirmed profile to fetch — fetching now would
    // just 401 (or, worse, race a not-yet-validated session's stale cookie). And right
    // after registering, skip this fetch entirely: there's no prior progress to resume
    // for an account that didn't exist a moment ago, and identity's own save (about to
    // follow) is the authoritative data — a GET racing that save could resolve after it
    // and overwrite the just-saved fields with the still-empty brand-new profile.
    // Deliberately not depending on `justRegistered` — this should only re-evaluate when
    // auth state itself changes, not again when the guard later clears (which would
    // just re-fetch the same data the save already put in state).
    if (hasValidatedSession && !justRegistered) dispatch(fetchOnboardingProfile());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, hasValidatedSession]);

  useEffect(() => {
    // Also gated on hasValidatedSession: onboarding's own Redux state is only cleared on
    // an explicit logout/resetAuthState (see onboarding-slice's resetForNewSession), not
    // on every render, so a completed profile can still be sitting in memory for a brief
    // moment after a soft (client-navigation) logout. Without this gate, that stale
    // profile could immediately bounce a fresh anonymous visitor off identity.
    if (hasValidatedSession && profile?.onboardingCompleted) {
      router.replace(resolvePostAuthDestination(nextParam, true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidatedSession, profile?.onboardingCompleted]);

  const buildStepUrl = (target: OnboardingStep) => {
    const query = new URLSearchParams({ step: target });
    if (nextParam) query.set('next', nextParam);
    return `/onboarding?${query.toString()}`;
  };

  const goBack = () => {
    const previous = getPreviousStep(step);
    if (previous) router.push(buildStepUrl(previous));
  };

  const saveStep = async (patch: OnboardingProfilePatch) => {
    const result = await dispatch(updateOnboardingProfile(patch));
    return updateOnboardingProfile.fulfilled.match(result);
  };

  const goToNextStep = async (patch: OnboardingProfilePatch) => {
    const saved = await saveStep(patch);
    if (!saved) return false;

    setJustRegistered(false);
    const next = getNextStep(step);
    if (next) router.push(buildStepUrl(next));
    return true;
  };

  const finishOnboarding = async (patch: OnboardingProfilePatch) => {
    const saved = await saveStep(patch);
    if (!saved) return false;

    setJustRegistered(false);
    const result = await dispatch(completeOnboarding());
    if (!completeOnboarding.fulfilled.match(result)) return false;

    await dispatch(fetchCurrentUser());
    router.push(resolvePostAuthDestination(nextParam, true));
    router.refresh();
    return true;
  };

  const stepNumber = getStepNumber(step);
  const totalSteps = getStepOrder().length;

  switch (step) {
    case 'identity':
      return (
        <IdentityStep
          // Not raw `profile` — an anonymous visitor must never see (or have prefilled
          // from) a profile left over from a previous, unrelated session.
          profile={hasValidatedSession ? profile : null}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          loading={loading}
          // Not raw isAuthenticated — redux-persist can rehydrate that as true before
          // sessionChecked confirms it, which would otherwise hide signup credentials,
          // weaken the phone-signup photo rule, and route "Continuer" through the
          // authenticated PATCH save instead of OTP signup for a stale/expired session.
          isAuthenticated={hasValidatedSession}
          onRegistered={() => setJustRegistered(true)}
          onNext={goToNextStep}
        />
      );
    case 'interests':
      return (
        <InterestsStep
          profile={profile}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          loading={loading}
          onNext={goToNextStep}
          onBack={goBack}
        />
      );
    case 'location':
      return (
        <LocationStep
          profile={profile}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          loading={loading}
          onFinish={finishOnboarding}
          onBack={goBack}
        />
      );
    default:
      return null;
  }
}
