'use client';

import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { fetchCurrentUser, selectAuth } from '@/features/auth/store/auth-slice';
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
import { useEffect, useState } from 'react';

import { EducationStep } from './education-step';
import { ExperienceStep } from './experience-step';
import { IdentityStep } from './identity-step';
import { InterestsStep } from './interests-step';
import { LocationStep } from './location-step';
import { WelcomeStep } from './welcome-step';

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isAuthenticated, sessionChecked } = useAppSelector(selectAuth);
  const { profile, loading } = useAppSelector(selectOnboarding);

  const [justRegistered, setJustRegistered] = useState(false);

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

  // If profile type shrinks the order (PROVIDER) and user is on a removed step, bounce forward.
  useEffect(() => {
    if (!hasValidatedSession || justRegistered) return;
    if (requestedStep && !isValidOnboardingStep(requestedStep, profileType)) {
      router.replace(buildStepUrl('location'));
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
    // After identity, prefer the profileType from the patch so INDIVIDUAL gets exp/edu.
    const nextType =
      patch.profileType ?? (profileType as ProfileType | null) ?? ('INDIVIDUAL' as ProfileType);
    const next = getNextStep(step, nextType);
    if (next) router.push(buildStepUrl(next));
    return true;
  };

  const finishOnboarding = async () => {
    setJustRegistered(false);
    const result = await dispatch(completeOnboarding());
    if (!completeOnboarding.fulfilled.match(result)) return false;

    await dispatch(fetchCurrentUser());
    router.push(resolvePostAuthDestination(nextParam, true));
    router.refresh();
    return true;
  };

  const stepNumber = getStepNumber(step, profileType);
  const totalSteps = order.filter((s) => s !== 'welcome').length;
  // Welcome has no progress bar; other steps count without welcome.
  const progressTotal = Math.max(1, totalSteps);
  const progressNumber = step === 'welcome' ? progressTotal : getStepNumber(step, profileType);

  switch (step) {
    case 'identity':
      return (
        <IdentityStep
          profile={hasValidatedSession ? profile : null}
          stepNumber={progressNumber}
          totalSteps={progressTotal}
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
          stepNumber={progressNumber}
          totalSteps={progressTotal}
          loading={loading}
          onNext={goToNextStep}
          onBack={goBack}
        />
      );
    case 'experience':
      return (
        <ExperienceStep
          profile={profile}
          stepNumber={progressNumber}
          totalSteps={progressTotal}
          loading={loading}
          onNext={goToNextStep}
          onBack={goBack}
        />
      );
    case 'education':
      return (
        <EducationStep
          profile={profile}
          stepNumber={progressNumber}
          totalSteps={progressTotal}
          loading={loading}
          onNext={goToNextStep}
          onBack={goBack}
        />
      );
    case 'location':
      return (
        <LocationStep
          profile={profile}
          stepNumber={progressNumber}
          totalSteps={progressTotal}
          loading={loading}
          onFinish={goToNextStep}
          onBack={goBack}
        />
      );
    case 'welcome':
      return <WelcomeStep loading={loading} onAccept={finishOnboarding} />;
    default:
      return null;
  }
}
