import { describe, expect, it } from 'vitest';

import {
  getNextStep,
  getStepNumber,
  getStepOrder,
  getTotalSteps,
  isValidOnboardingStep,
} from './step-order';

describe('getStepOrder', () => {
  it('uses the same 3-step numbered path for INDIVIDUAL and PROVIDER (welcome is not a numbered step)', () => {
    expect(getStepOrder('INDIVIDUAL')).toEqual(['identity', 'interests', 'location']);
    expect(getStepOrder('PROVIDER')).toEqual(['identity', 'interests', 'location']);
    expect(getTotalSteps('INDIVIDUAL')).toBe(3);
    expect(getTotalSteps('PROVIDER')).toBe(3);
  });

  it('defaults to the 3-step numbered path when profile type is unknown', () => {
    expect(getStepOrder(null)).toEqual(['identity', 'interests', 'location']);
    expect(getTotalSteps(null)).toBe(3);
  });

  it('assigns correct step numbers 1..3 and clamps welcome to total steps without a numbered progression', () => {
    expect(getStepNumber('identity')).toBe(1);
    expect(getStepNumber('interests')).toBe(2);
    expect(getStepNumber('location')).toBe(3);
    expect(getStepNumber('welcome')).toBe(3);
  });
});

describe('getNextStep', () => {
  it('advances from interests to location, and location to welcome, ending after welcome', () => {
    expect(getNextStep('interests', 'PROVIDER')).toBe('location');
    expect(getNextStep('location', 'INDIVIDUAL')).toBe('welcome');
    expect(getNextStep('welcome', 'INDIVIDUAL')).toBeNull();
  });
});

describe('isValidOnboardingStep', () => {
  it('rejects removed experience/education steps while allowing welcome and location', () => {
    expect(isValidOnboardingStep('experience', 'INDIVIDUAL')).toBe(false);
    expect(isValidOnboardingStep('education', 'INDIVIDUAL')).toBe(false);
    expect(isValidOnboardingStep('welcome', 'INDIVIDUAL')).toBe(true);
    expect(isValidOnboardingStep('location', 'INDIVIDUAL')).toBe(true);
    expect(isValidOnboardingStep('interests', 'INDIVIDUAL')).toBe(true);
  });
});
