import type { OnboardingStep, ProfileType } from './types';

// PROVIDER ("Employeur") profiles skip experience/education, matching the old app's
// self-redirecting Inscription3/Inscription4 guards. Default to the full order before
// profile_type is chosen (identity step itself decides it, same as the old app's
// default "Employé" toggle state).
const INDIVIDUAL_ORDER: OnboardingStep[] = [
  'identity',
  'interests',
  'experience',
  'education',
  'location',
];
const PROVIDER_ORDER: OnboardingStep[] = ['identity', 'interests', 'location'];

export function getStepOrder(profileType: ProfileType | null | undefined): OnboardingStep[] {
  return profileType === 'PROVIDER' ? PROVIDER_ORDER : INDIVIDUAL_ORDER;
}

export function getStepNumber(
  step: OnboardingStep,
  profileType: ProfileType | null | undefined,
): number {
  return getStepOrder(profileType).indexOf(step) + 1;
}

export function getNextStep(
  step: OnboardingStep,
  profileType: ProfileType | null | undefined,
): OnboardingStep | null {
  const order = getStepOrder(profileType);
  return order[order.indexOf(step) + 1] ?? null;
}

export function getPreviousStep(
  step: OnboardingStep,
  profileType: ProfileType | null | undefined,
): OnboardingStep | null {
  const order = getStepOrder(profileType);
  const index = order.indexOf(step);
  return index > 0 ? order[index - 1] : null;
}
