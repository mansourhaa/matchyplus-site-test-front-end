import type { OnboardingStep } from './types';

// Employé and Employeur now use the exact same short flow in the legacy source of
// truth (matchy-plus-legacy's getRegistrationStepMeta) — experience/education steps
// are dead code, unreachable by either profile type. No branching by profile type.
const ORDER: OnboardingStep[] = ['identity', 'interests', 'location'];

export function getStepOrder(): OnboardingStep[] {
  return ORDER;
}

export function getStepNumber(step: OnboardingStep): number {
  return ORDER.indexOf(step) + 1;
}

export function getNextStep(step: OnboardingStep): OnboardingStep | null {
  return ORDER[ORDER.indexOf(step) + 1] ?? null;
}

export function getPreviousStep(step: OnboardingStep): OnboardingStep | null {
  const index = ORDER.indexOf(step);
  return index > 0 ? ORDER[index - 1] : null;
}
