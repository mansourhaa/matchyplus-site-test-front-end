'use client';

import { useAppSelector } from '@/features/auth/hooks';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { OnboardingPresentation } from '@/features/onboarding/components/onboarding-presentation';
import {
  readStoredIntroSeen,
  setStoredIntroSeen,
  subscribeIntro,
} from '@/features/onboarding/intro-storage';
import { selectOnboarding } from '@/features/onboarding/store/onboarding-slice';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useSyncExternalStore } from 'react';

function OnboardingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, sessionChecked } = useAppSelector(selectAuth);
  const { profile } = useAppSelector(selectOnboarding);

  const introSeen = useSyncExternalStore(subscribeIntro, readStoredIntroSeen, () => false);
  const force = searchParams.get('force') === 'true' || searchParams.get('intro') === 'true';

  useEffect(() => {
    // If authenticated user already completed onboarding, bounce to dashboard
    if (isAuthenticated && sessionChecked && profile?.onboardingCompleted) {
      router.replace('/home');
      return;
    }

    // If already seen intro and not explicitly forced, bounce directly to the inscription form
    if (introSeen && !force) {
      const nextParam = searchParams.get('next');
      const target = nextParam
        ? `/inscription?next=${encodeURIComponent(nextParam)}`
        : '/inscription';
      router.replace(target);
    }
  }, [
    isAuthenticated,
    sessionChecked,
    profile?.onboardingCompleted,
    introSeen,
    force,
    router,
    searchParams,
  ]);

  const handleComplete = () => {
    setStoredIntroSeen(true);
    const nextParam = searchParams.get('next');
    const target = nextParam
      ? `/inscription?next=${encodeURIComponent(nextParam)}`
      : '/inscription';
    router.push(target);
  };

  return <OnboardingPresentation onComplete={handleComplete} />;
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingView />
    </Suspense>
  );
}
