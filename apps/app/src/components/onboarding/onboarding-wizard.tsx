'use client';

import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { fetchCurrentUser } from '@/features/auth/store/auth-slice';
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
import { useEffect } from 'react';

import { IdentityStep } from './identity-step';
import { InterestsStep } from './interests-step';
import { LocationStep } from './location-step';

const VALID_STEPS: OnboardingStep[] = ['identity', 'interests', 'location'];

// Credentials (phone + password + OTP) happen on /register, before this wizard is ever
// reached — by the time /onboarding renders, a session always already exists.
export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { profile, loading } = useAppSelector(selectOnboarding);

  const requestedStep = searchParams.get('step');
  const step: OnboardingStep = VALID_STEPS.includes(requestedStep as OnboardingStep)
    ? (requestedStep as OnboardingStep)
    : 'identity';
  const nextParam = searchParams.get('next');

  useEffect(() => {
    dispatch(fetchOnboardingProfile());
  }, [dispatch]);

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
