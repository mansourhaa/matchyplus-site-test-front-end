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
  job: null,
  bio: null,
  image: null,
  city: null,
  profile_type: null,
  offer_service: false,
  service_type: null,
  sector: null,
  price: null,
  interests: [] as string[],
  selected_goals: [] as string[],
  experience: null,
  experiences: null,
  education_level: null,
  educations: null,
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
        educationLevel: 'Licence (Bac+3)',
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
          education_level: 'Licence (Bac+3)',
          availability_days: ['Lun', 'Mar'],
          availability_hours: ['morning'],
          contact_modes: ['whatsapp'],
        },
        select: expect.any(Object),
      });
    });
  });

  describe('completeOnboarding', () => {
    it('rejects when job is missing', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        job: null,
        interests: ['Bricolage'],
        offer_service: false,
        service_type: null,
        price: null,
      });

      await expect(service.completeOnboarding({ userId: 'user-1' })).rejects.toThrow(
        'onboarding_incomplete',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects when there are no interests', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        job: 'Électricien',
        interests: [],
        offer_service: false,
        service_type: null,
        price: null,
      });

      await expect(service.completeOnboarding({ userId: 'user-1' })).rejects.toThrow(
        'onboarding_incomplete',
      );
    });

    it('rejects a service offer missing service_type/price', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        job: 'Électricien',
        interests: ['Bricolage'],
        offer_service: true,
        service_type: null,
        price: null,
      });

      await expect(service.completeOnboarding({ userId: 'user-1' })).rejects.toThrow(
        'onboarding_incomplete',
      );
    });

    it('stamps onboarding_completed_at once job + interests (+ service details) are present', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        job: 'Électricien',
        interests: ['Bricolage'],
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
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        job: 'Électricien',
        interests: ['Bricolage'],
        offer_service: false,
        service_type: null,
        price: null,
      });
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
