import type { OnboardingStep, ProfileType } from './types';

/** Numbered onboarding steps: 1. identity → 2. interests → 3. location prefs. */
const NUMBERED_STEPS: OnboardingStep[] = ['identity', 'interests', 'location'];

/** Full step navigation sequence including the post-step welcome / rules screen. */
const FULL_STEP_SEQUENCE: OnboardingStep[] = ['identity', 'interests', 'location', 'welcome'];

export function getStepOrder(_profileType?: ProfileType | null): OnboardingStep[] {
  return NUMBERED_STEPS;
}

export function getTotalSteps(_profileType?: ProfileType | null): number {
  return NUMBERED_STEPS.length;
}

export function getStepNumber(step: OnboardingStep, profileType?: ProfileType | null): number {
  const index = NUMBERED_STEPS.indexOf(step);
  return index >= 0 ? index + 1 : NUMBERED_STEPS.length;
}

export function getNextStep(
  step: OnboardingStep,
  _profileType?: ProfileType | null,
): OnboardingStep | null {
  const index = FULL_STEP_SEQUENCE.indexOf(step);
  return index >= 0 && index < FULL_STEP_SEQUENCE.length - 1 ? FULL_STEP_SEQUENCE[index + 1] : null;
}

export function getPreviousStep(
  step: OnboardingStep,
  _profileType?: ProfileType | null,
): OnboardingStep | null {
  const index = FULL_STEP_SEQUENCE.indexOf(step);
  return index > 0 ? FULL_STEP_SEQUENCE[index - 1] : null;
}

export function isValidOnboardingStep(
  step: string | null,
  _profileType?: ProfileType | null,
): step is OnboardingStep {
  if (!step) return false;
  return FULL_STEP_SEQUENCE.includes(step as OnboardingStep);
}
