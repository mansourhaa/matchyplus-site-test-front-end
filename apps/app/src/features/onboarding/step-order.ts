import type { OnboardingStep, ProfileType } from './types';

/** Matchy MVP: identity → goals → preferences (location), for both profile types. */
const STEP_ORDER: OnboardingStep[] = ['identity', 'interests', 'location'];

export function getStepOrder(_profileType?: ProfileType | null): OnboardingStep[] {
  return STEP_ORDER;
}

export function getStepNumber(step: OnboardingStep, profileType?: ProfileType | null): number {
  return getStepOrder(profileType).indexOf(step) + 1;
}

export function getNextStep(
  step: OnboardingStep,
  profileType?: ProfileType | null,
): OnboardingStep | null {
  const order = getStepOrder(profileType);
  return order[order.indexOf(step) + 1] ?? null;
}

export function getPreviousStep(
  step: OnboardingStep,
  profileType?: ProfileType | null,
): OnboardingStep | null {
  const order = getStepOrder(profileType);
  const index = order.indexOf(step);
  return index > 0 ? order[index - 1] : null;
}

export function isValidOnboardingStep(
  step: string | null,
  profileType?: ProfileType | null,
): step is OnboardingStep {
  if (!step) return false;
  return getStepOrder(profileType).includes(step as OnboardingStep);
}
