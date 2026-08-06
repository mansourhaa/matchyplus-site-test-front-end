import { describe, expect, it } from 'vitest';

import { getNextStep, getStepOrder, isValidOnboardingStep } from './step-order';

describe('getStepOrder', () => {
  it('includes experience and education for INDIVIDUAL', () => {
    expect(getStepOrder('INDIVIDUAL')).toEqual([
      'identity',
      'interests',
      'experience',
      'education',
      'location',
      'welcome',
    ]);
  });

  it('skips experience and education for PROVIDER', () => {
    expect(getStepOrder('PROVIDER')).toEqual(['identity', 'interests', 'location', 'welcome']);
  });

  it('defaults to the INDIVIDUAL path when profile type is unknown', () => {
    expect(getStepOrder(null)).toEqual(getStepOrder('INDIVIDUAL'));
  });
});

describe('getNextStep', () => {
  it('routes PROVIDER from interests straight to location', () => {
    expect(getNextStep('interests', 'PROVIDER')).toBe('location');
  });

  it('routes INDIVIDUAL from interests to experience', () => {
    expect(getNextStep('interests', 'INDIVIDUAL')).toBe('experience');
  });

  it('routes location to welcome', () => {
    expect(getNextStep('location', 'INDIVIDUAL')).toBe('welcome');
  });
});

describe('isValidOnboardingStep', () => {
  it('rejects experience for PROVIDER', () => {
    expect(isValidOnboardingStep('experience', 'PROVIDER')).toBe(false);
    expect(isValidOnboardingStep('experience', 'INDIVIDUAL')).toBe(true);
  });
});
