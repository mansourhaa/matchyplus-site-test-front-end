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
import { useEffect } from 'react';

import { EducationStep } from './education-step';
import { ExperienceStep } from './experience-step';
import { IdentityStep } from './identity-step';
import { InterestsStep } from './interests-step';
import { LocationStep } from './location-step';

const VALID_STEPS: OnboardingStep[] = [
  'identity',
  'interests',
  'experience',
  'education',
  'location',
];

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { profile, loading } = useAppSelector(selectOnboarding);
  const { accessToken } = useAppSelector(selectAuth);
  const isAuthenticated = Boolean(accessToken);

  const requestedStep = searchParams.get('step');
  const step: OnboardingStep = VALID_STEPS.includes(requestedStep as OnboardingStep)
    ? (requestedStep as OnboardingStep)
    : 'identity';
  const nextParam = searchParams.get('next');
  const profileType = profile?.profile_type;

  useEffect(() => {
    // A brand-new "Créer un compte" visitor has no token yet — GET /users/me/profile
    // would just 401. The identity step renders in account-bootstrap mode instead.
    if (isAuthenticated) {
      dispatch(fetchOnboardingProfile());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (profile?.onboardingCompleted) {
      router.replace(resolvePostAuthDestination(nextParam, true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.onboardingCompleted]);

  // A PROVIDER profile can't be on experience/education — mirrors the old app's
  // Inscription3/Inscription4 self-redirect-to-the-next-valid-step guard.
  useEffect(() => {
    const order = getStepOrder(profileType);
    if (!order.includes(step)) {
      router.replace(`/onboarding?step=${order[order.length - 1]}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, profileType]);

  const buildStepUrl = (target: OnboardingStep) => {
    const query = new URLSearchParams({ step: target });
    if (nextParam) query.set('next', nextParam);
    return `/onboarding?${query.toString()}`;
  };

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

    const nextProfileType = patch.profileType ?? profileType;
    const next = getNextStep(step, nextProfileType);
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

  const skipStep = () => {
    const next = getNextStep(step, profileType);
    if (next) router.push(buildStepUrl(next));
  };

  const stepNumber = getStepNumber(step, profileType);
  const totalSteps = getStepOrder(profileType).length;

  switch (step) {
    case 'identity':
      return (
        <IdentityStep
          profile={profile}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          loading={loading}
          isAuthenticated={isAuthenticated}
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
    case 'experience':
      return (
        <ExperienceStep
          profile={profile}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          loading={loading}
          onNext={goToNextStep}
          onBack={goBack}
          onSkip={skipStep}
        />
      );
    case 'education':
      return (
        <EducationStep
          profile={profile}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          loading={loading}
          onNext={goToNextStep}
          onBack={goBack}
          onSkip={skipStep}
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
