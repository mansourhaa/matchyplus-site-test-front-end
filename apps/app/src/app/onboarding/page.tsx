import { OnboardingWizard } from '@/features/onboarding/components/onboarding-wizard';
import { Suspense } from 'react';

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingWizard />
    </Suspense>
  );
}
