'use client';

import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import {
  fetchCurrentUser,
  markOnboardingCompleted,
  selectAuth,
} from '@/features/auth/store/auth-slice';
import {
  getNextStep,
  getPreviousStep,
  getStepNumber,
  getStepOrder,
  isValidOnboardingStep,
} from '@/features/onboarding/step-order';
import {
  completeOnboarding,
  fetchOnboardingProfile,
  selectOnboarding,
  updateOnboardingProfile,
} from '@/features/onboarding/store/onboarding-slice';
import type {
  OnboardingProfilePatch,
  OnboardingStep,
  ProfileType,
} from '@/features/onboarding/types';
import { resolvePostAuthDestination } from '@/lib/post-auth-routing';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { IdentityStep } from './identity-step';
import { InterestsStep } from './interests-step';
import { LocationStep } from './location-step';

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isAuthenticated, sessionChecked } = useAppSelector(selectAuth);
  const { profile, loading } = useAppSelector(selectOnboarding);

  const [justRegistered, setJustRegistered] = useState(false);
  // Finish owns navigation — skip the "already completed" bounce while that runs so we
  // don't race router.replace from two places after completeOnboarding.fulfilled.
  const finishingRef = useRef(false);

  const hasValidatedSession = isAuthenticated && sessionChecked;
  const profileType: ProfileType | null = profile?.profile_type ?? null;
  const order = getStepOrder(profileType);

  const requestedStep = searchParams.get('step');
  const step: OnboardingStep =
    hasValidatedSession && !justRegistered && isValidOnboardingStep(requestedStep, profileType)
      ? (requestedStep as OnboardingStep)
      : 'identity';
  const nextParam = searchParams.get('next');

  useEffect(() => {
    if (hasValidatedSession && !justRegistered) dispatch(fetchOnboardingProfile());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, hasValidatedSession]);

  useEffect(() => {
    if (finishingRef.current) return;
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

  // Bounce invalid ?step= (e.g. old experience/education/location/welcome bookmarks) to identity.
  useEffect(() => {
    if (!hasValidatedSession || justRegistered) return;
    if (requestedStep && !isValidOnboardingStep(requestedStep, profileType)) {
      const fallback = getStepOrder(profileType)[0] ?? 'identity';
      router.replace(buildStepUrl(fallback));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidatedSession, profileType, requestedStep]);

  const goBack = () => {
    const previous = getPreviousStep(step, profileType);
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
    const nextType =
      patch.profileType ?? (profileType as ProfileType | null) ?? ('INDIVIDUAL' as ProfileType);
    const next = getNextStep(step, nextType);
    if (next) router.push(buildStepUrl(next));
    return true;
  };

  const finishOnboarding = async (patch: OnboardingProfilePatch) => {
    finishingRef.current = true;

    const saved = await saveStep(patch);
    if (!saved) {
      finishingRef.current = false;
      return false;
    }

    setJustRegistered(false);
    const result = await dispatch(completeOnboarding());
    if (!completeOnboarding.fulfilled.match(result)) {
      finishingRef.current = false;
      return false;
    }

    // Unlock dashboard chrome immediately — authcheck can catch up in the background.
    dispatch(markOnboardingCompleted());
    router.replace(resolvePostAuthDestination(nextParam, true));
    void dispatch(fetchCurrentUser());
    return true;
  };

  const stepNumber = getStepNumber(step, profileType);
  const totalSteps = order.length;

  switch (step) {
    case 'identity':
      return (
        <IdentityStep
          profile={hasValidatedSession ? profile : null}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          loading={loading}
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
