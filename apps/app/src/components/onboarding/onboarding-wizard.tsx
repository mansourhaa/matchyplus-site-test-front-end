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
import { useEffect, useRef } from 'react';

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
  const { isAuthenticated } = useAppSelector(selectAuth);
  const { profile, loading } = useAppSelector(selectOnboarding);

  const requestedStep = searchParams.get('step');
  // A brand-new visitor has no session yet, so only the identity step (which also
  // collects credentials for them) is reachable — any other requested step would just
  // render a form whose save always 401s. Ignore ?step= entirely until authenticated.
  const step: OnboardingStep =
    isAuthenticated && VALID_STEPS.includes(requestedStep as OnboardingStep)
      ? (requestedStep as OnboardingStep)
      : 'identity';
  const nextParam = searchParams.get('next');

  // Set by IdentityStep the instant registerPhone succeeds, before it saves the
  // identity patch — tells the effect below to skip its fetch for that specific
  // unauthenticated -> authenticated transition (see the fetchOnboardingProfile call
  // below).
  const justRegisteredRef = useRef(false);

  useEffect(() => {
    // A brand-new visitor has no session yet — fetching their profile would just 401.
    // And right after they register, skip this fetch entirely: there's no prior
    // progress to resume for an account that didn't exist a moment ago, and identity's
    // own save (about to follow) is the authoritative data — a GET racing that save
    // could resolve after it and overwrite the just-saved fields with the still-empty
    // brand-new profile.
    if (isAuthenticated && !justRegisteredRef.current) dispatch(fetchOnboardingProfile());
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (profile?.onboardingCompleted) {
      router.replace(resolvePostAuthDestination(nextParam, true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.onboardingCompleted]);

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

    const next = getNextStep(step);
    if (next) router.push(buildStepUrl(next));
    return true;
  };

  const finishOnboarding = async (patch: OnboardingProfilePatch) => {
    const saved = await saveStep(patch);
    if (!saved) return false;

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
          profile={profile}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          loading={loading}
          isAuthenticated={isAuthenticated}
          onRegistered={() => {
            justRegisteredRef.current = true;
          }}
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
