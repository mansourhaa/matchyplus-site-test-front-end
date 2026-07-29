import { describe, expect, it, vi } from 'vitest';

import { OnboardingService } from './onboarding.js';

function createMockPrisma() {
  return {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  };
}

function createService(prisma = createMockPrisma()) {
  const service = new OnboardingService({ prisma: prisma as never });
  return { service, prisma };
}

const baseProfile = {
  id: 'user-1',
  name: 'Jane Doe',
  auth_provider: 'phone',
  job: null,
  bio: null,
  image: null,
  city: null,
  profile_type: null,
  offer_service: false,
  service_type: null,
  price: null,
  interests: [] as string[],
  selected_goals: [] as string[],
  availability_days: [] as string[],
  availability_hours: [] as string[],
  contact_modes: [] as string[],
  languages: [] as string[],
  onboarding_completed_at: null as Date | null,
};

describe('OnboardingService', () => {
  describe('getProfile', () => {
    it('returns a boolean onboardingCompleted derived from the completion timestamp', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...baseProfile,
        onboarding_completed_at: new Date('2026-01-01'),
      });

      const result = await service.getProfile({ userId: 'user-1' });

      expect(result.onboardingCompleted).toBe(true);
      expect(result).not.toHaveProperty('onboarding_completed_at');
    });
  });

  describe('updateProfile', () => {
    it('only sends fields present in the payload (per-step partial save)', async () => {
      const { service, prisma } = createService();
      prisma.user.update.mockResolvedValue(baseProfile);

      await service.updateProfile({ userId: 'user-1', job: 'Électricien', bio: 'Bio text' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { job: 'Électricien', bio: 'Bio text' },
        select: expect.any(Object),
      });
    });

    it('maps camelCase payload keys to their snake_case columns', async () => {
      const { service, prisma } = createService();
      prisma.user.update.mockResolvedValue(baseProfile);

      await service.updateProfile({
        userId: 'user-1',
        profileType: 'PROVIDER',
        offerService: true,
        serviceType: 'Chauffeur / Transport',
        selectedGoals: ['Trouver un job'],
        availabilityDays: ['Lun', 'Mar'],
        availabilityHours: ['morning'],
        contactModes: ['whatsapp'],
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          profile_type: 'PROVIDER',
          offer_service: true,
          service_type: 'Chauffeur / Transport',
          selected_goals: ['Trouver un job'],
          availability_days: ['Lun', 'Mar'],
          availability_hours: ['morning'],
          contact_modes: ['whatsapp'],
        },
        select: expect.any(Object),
      });
    });
  });

  describe('completeOnboarding', () => {
    // Every field required by at least one rule, all satisfied — individual tests below
    // knock out exactly one to prove that rule is enforced.
    const completeIndividual = {
      name: 'Jane Doe',
      job: 'Électricien',
      auth_provider: 'google',
      image: null,
      profile_type: 'INDIVIDUAL',
      interests: ['Bricolage'],
      selected_goals: ['Trouver un job'],
      offer_service: false,
      service_type: null,
      price: null,
    };

    it('rejects when job is missing for an INDIVIDUAL (Employé) profile', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...completeIndividual, job: null });

      await expect(service.completeOnboarding({ userId: 'user-1' })).rejects.toThrow(
        'onboarding_incomplete',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('does not require job for a PROVIDER (Employeur) profile — profession is optional there', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...completeIndividual,
        job: null,
        profile_type: 'PROVIDER',
      });
      prisma.user.update.mockResolvedValue({
        ...baseProfile,
        onboarding_completed_at: new Date('2026-01-01'),
      });

      await expect(service.completeOnboarding({ userId: 'user-1' })).resolves.toMatchObject({
        onboardingCompleted: true,
      });
    });

    it('rejects when profile_type is null, instead of silently skipping the INDIVIDUAL job rule', async () => {
      const { service, prisma } = createService();
      // job is present here — the point is that a null profile_type alone must still
      // block completion (this was the exact bypass: `profile_type !== 'INDIVIDUAL'`
      // was true for null too, so hasIdentity passed without job ever being checked).
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...completeIndividual,
        profile_type: null,
      });

      await expect(service.completeOnboarding({ userId: 'user-1' })).rejects.toThrow(
        'onboarding_incomplete',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects when name is blank', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...completeIndividual, name: '   ' });

      await expect(service.completeOnboarding({ userId: 'user-1' })).rejects.toThrow(
        'onboarding_incomplete',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects when there are no interests', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...completeIndividual, interests: [] });

      await expect(service.completeOnboarding({ userId: 'user-1' })).rejects.toThrow(
        'onboarding_incomplete',
      );
    });

    it('rejects when there are no selected goals', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...completeIndividual,
        selected_goals: [],
      });

      await expect(service.completeOnboarding({ userId: 'user-1' })).rejects.toThrow(
        'onboarding_incomplete',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects a phone-signup account with no photo', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...completeIndividual,
        auth_provider: 'phone',
        image: null,
      });

      await expect(service.completeOnboarding({ userId: 'user-1' })).rejects.toThrow(
        'onboarding_incomplete',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('does not require a photo for an OAuth account', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...completeIndividual,
        auth_provider: 'google',
        image: null,
      });
      prisma.user.update.mockResolvedValue({
        ...baseProfile,
        onboarding_completed_at: new Date('2026-01-01'),
      });

      await expect(service.completeOnboarding({ userId: 'user-1' })).resolves.toMatchObject({
        onboardingCompleted: true,
      });
    });

    it('rejects a service offer missing service_type/price', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...completeIndividual,
        offer_service: true,
        service_type: null,
        price: null,
      });

      await expect(service.completeOnboarding({ userId: 'user-1' })).rejects.toThrow(
        'onboarding_incomplete',
      );
    });

    it('stamps onboarding_completed_at once every rule is satisfied', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...completeIndividual,
        auth_provider: 'phone',
        image: 'data:image/png;base64,abc',
        offer_service: true,
        service_type: 'Chauffeur / Transport',
        price: '40',
      });
      prisma.user.update.mockResolvedValue({
        ...baseProfile,
        onboarding_completed_at: new Date('2026-01-01'),
      });

      const result = await service.completeOnboarding({ userId: 'user-1' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { onboarding_completed_at: expect.any(Date) },
        select: expect.any(Object),
      });
      expect(result.onboardingCompleted).toBe(true);
    });

    it('does not require service_type/price when offer_service is false', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...completeIndividual });
      prisma.user.update.mockResolvedValue({
        ...baseProfile,
        onboarding_completed_at: new Date('2026-01-01'),
      });

      await expect(service.completeOnboarding({ userId: 'user-1' })).resolves.toMatchObject({
        onboardingCompleted: true,
      });
    });
  });
});
