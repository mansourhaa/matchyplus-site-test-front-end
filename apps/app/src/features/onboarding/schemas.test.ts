import { describe, expect, it } from 'vitest';

import { identityStepSchema, interestsStepSchema, locationStepSchema } from './schemas';

describe('identityStepSchema', () => {
  it('requires a name, job, and profile type', () => {
    expect(
      identityStepSchema.safeParse({
        name: 'Jane Doe',
        job: 'Électricien',
        profileType: 'INDIVIDUAL',
      }).success,
    ).toBe(true);
  });

  it('rejects a missing job', () => {
    expect(
      identityStepSchema.safeParse({ name: 'Jane Doe', job: '', profileType: 'INDIVIDUAL' })
        .success,
    ).toBe(false);
  });

  // Regression: every constraint here must carry an explicit message, or a failure
  // falls back to Zod's raw technical wording (e.g. "Too small: expected string to
  // have >=1 characters") leaking straight to the user instead of friendly copy.
  it('rejects a missing name with a friendly message, not a raw Zod error', () => {
    const result = identityStepSchema.safeParse({
      name: '',
      job: 'Électricien',
      profileType: 'INDIVIDUAL',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Le nom est obligatoire.');
    }
  });

  it('rejects bio over 250 characters', () => {
    expect(
      identityStepSchema.safeParse({
        name: 'Jane Doe',
        job: 'Électricien',
        bio: 'a'.repeat(251),
        profileType: 'INDIVIDUAL',
      }).success,
    ).toBe(false);
  });
});

describe('interestsStepSchema', () => {
  const base = {
    interests: ['Bricolage'],
    selectedGoals: ['Trouver un job'],
    offerService: false,
  };

  it('accepts a valid selection without a service offer', () => {
    expect(interestsStepSchema.safeParse(base).success).toBe(true);
  });

  it('rejects more than 5 interests', () => {
    expect(
      interestsStepSchema.safeParse({
        ...base,
        interests: ['a', 'b', 'c', 'd', 'e', 'f'],
      }).success,
    ).toBe(false);
  });

  it('rejects no goals selected', () => {
    expect(interestsStepSchema.safeParse({ ...base, selectedGoals: [] }).success).toBe(false);
  });

  it('rejects no interests or goals with friendly messages, not raw Zod errors', () => {
    const noInterests = interestsStepSchema.safeParse({ ...base, interests: [] });
    expect(noInterests.success).toBe(false);
    if (!noInterests.success) {
      expect(noInterests.error.issues[0]?.message).toBe('Ajoutez au moins un centre d’intérêt.');
    }

    const noGoals = interestsStepSchema.safeParse({ ...base, selectedGoals: [] });
    expect(noGoals.success).toBe(false);
    if (!noGoals.success) {
      expect(noGoals.error.issues[0]?.message).toBe('Sélectionnez au moins un objectif.');
    }
  });

  it('requires serviceType and price when offerService is true', () => {
    expect(interestsStepSchema.safeParse({ ...base, offerService: true }).success).toBe(false);
    expect(
      interestsStepSchema.safeParse({
        ...base,
        offerService: true,
        serviceType: 'Chauffeur / Transport',
        price: '40',
      }).success,
    ).toBe(true);
  });

  it('rejects a zero or negative price when offering a service', () => {
    expect(
      interestsStepSchema.safeParse({
        ...base,
        offerService: true,
        serviceType: 'Chauffeur / Transport',
        price: '0',
      }).success,
    ).toBe(false);
  });
});

describe('locationStepSchema', () => {
  it('does not require availability when not offering a service', () => {
    expect(locationStepSchema.safeParse({ offerService: false }).success).toBe(true);
  });

  it('requires at least one availability day when offering a service', () => {
    expect(locationStepSchema.safeParse({ offerService: true }).success).toBe(false);
    expect(
      locationStepSchema.safeParse({ offerService: true, availabilityDays: ['Lun'] }).success,
    ).toBe(true);
  });
});
