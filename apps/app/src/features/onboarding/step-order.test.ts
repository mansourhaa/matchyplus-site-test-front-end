import { describe, expect, it } from 'vitest';

import { getNextStep, getStepOrder, isValidOnboardingStep } from './step-order';

describe('getStepOrder', () => {
  it('uses the same 3-step path for INDIVIDUAL and PROVIDER', () => {
    expect(getStepOrder('INDIVIDUAL')).toEqual(['identity', 'interests', 'location']);
    expect(getStepOrder('PROVIDER')).toEqual(['identity', 'interests', 'location']);
  });

  it('defaults to the 3-step path when profile type is unknown', () => {
    expect(getStepOrder(null)).toEqual(['identity', 'interests', 'location']);
  });
});

describe('getNextStep', () => {
  it('routes interests to location for both profile types', () => {
    expect(getNextStep('interests', 'PROVIDER')).toBe('location');
    expect(getNextStep('interests', 'INDIVIDUAL')).toBe('location');
  });

  it('ends after location (no welcome)', () => {
    expect(getNextStep('location', 'INDIVIDUAL')).toBeNull();
    expect(getNextStep('location', 'PROVIDER')).toBeNull();
  });
});

describe('isValidOnboardingStep', () => {
  it('rejects removed experience/education/welcome steps', () => {
    expect(isValidOnboardingStep('experience', 'INDIVIDUAL')).toBe(false);
    expect(isValidOnboardingStep('education', 'INDIVIDUAL')).toBe(false);
    expect(isValidOnboardingStep('welcome', 'INDIVIDUAL')).toBe(false);
    expect(isValidOnboardingStep('location', 'INDIVIDUAL')).toBe(true);
  });
});
