import { describe, expect, it } from 'vitest';

import { getNextStep, getStepOrder, isValidOnboardingStep } from './step-order';

describe('getStepOrder', () => {
  it('uses the same 2-step path for INDIVIDUAL and PROVIDER', () => {
    expect(getStepOrder('INDIVIDUAL')).toEqual(['identity', 'interests']);
    expect(getStepOrder('PROVIDER')).toEqual(['identity', 'interests']);
  });

  it('defaults to the 2-step path when profile type is unknown', () => {
    expect(getStepOrder(null)).toEqual(['identity', 'interests']);
  });
});

describe('getNextStep', () => {
  it('ends after interests (location is handled on /home)', () => {
    expect(getNextStep('interests', 'PROVIDER')).toBeNull();
    expect(getNextStep('interests', 'INDIVIDUAL')).toBeNull();
  });
});

describe('isValidOnboardingStep', () => {
  it('rejects removed experience/education/location/welcome steps', () => {
    expect(isValidOnboardingStep('experience', 'INDIVIDUAL')).toBe(false);
    expect(isValidOnboardingStep('education', 'INDIVIDUAL')).toBe(false);
    expect(isValidOnboardingStep('location', 'INDIVIDUAL')).toBe(false);
    expect(isValidOnboardingStep('welcome', 'INDIVIDUAL')).toBe(false);
    expect(isValidOnboardingStep('interests', 'INDIVIDUAL')).toBe(true);
  });
});
