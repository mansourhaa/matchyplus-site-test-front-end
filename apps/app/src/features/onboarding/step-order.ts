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

// The full user-facing flow is credentials (RegisterForm, always step 1) followed by
// this 3-step wizard — kept in one place so the two screens never disagree on numbering
// (RegisterForm previously said "Étape 1 sur 4" while the wizard separately said "sur 3").
export const TOTAL_FLOW_STEPS = ORDER.length + 1;

export function getFlowStepNumber(step: OnboardingStep): number {
  return getStepNumber(step) + 1;
}
