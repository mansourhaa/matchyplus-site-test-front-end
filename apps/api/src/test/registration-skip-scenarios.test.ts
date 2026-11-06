import { describe, expect, it } from 'vitest';
import { ProfileType } from '@saas-boilerplate/types';
import { OnboardingService } from '../services/onboarding.js';
import { computeMatchScore, ScoringProfile } from '../utils/matching-score.js';

describe('Registration & Onboarding Skip Scenarios', () => {
  // Mock Prisma client for testing OnboardingService validation rules
  function createMockOnboardingPrisma(userData: any) {
    return {
      user: {
        findUniqueOrThrow: async () => userData,
        update: async ({ data }: any) => ({
          ...userData,
          ...data,
          onboardingCompleted: Boolean(data.onboarding_completed_at),
        }),
      },
    } as any;
  }

  describe('Valid Step Skip Scenarios (Authorized by System Rules)', () => {
    it('Scenario 1: Pure Client skipping offer_service, experiences, educations, video and bio', async () => {
      // Individual hiring services: offer_service=false, so service_type & price are skipped.
      // Experiences, educations, video, bio are skippable via "Passer".
      const userData = {
        name: 'Mariem Jaziri',
        job: "Architecte d'intérieur",
        auth_provider: 'phone',
        image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
        profile_type: ProfileType.INDIVIDUAL,
        interests: ['livraison', 'aide ménagère'],
        selected_goals: ['demander un service'],
        offer_service: false,
        service_type: null, // Skipped
        price: null, // Skipped
        video: null, // Skipped
        bio: null, // Skipped
        experiences: null, // Skipped
        educations: null, // Skipped
      };

      const service = new OnboardingService({ prisma: createMockOnboardingPrisma(userData) });
      const result = await service.completeOnboarding({ userId: 'u1' });
      expect(result.onboardingCompleted).toBe(true);
    });

    it('Scenario 2: Provider / Employer skipping individual Job title', async () => {
      // For PROVIDER (Employeur), job title is optional/skippable.
      const userData = {
        name: 'Moncef Nettoyage Pro',
        job: null, // Skipped job title
        auth_provider: 'phone',
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
        profile_type: ProfileType.PROVIDER,
        interests: ['nettoyage', 'aide ménagère'],
        selected_goals: ['proposer mes services'],
        offer_service: true,
        service_type: 'Service à domicile',
        price: '20 DT',
        video: null, // Skipped
        experiences: null, // Skipped
        educations: null, // Skipped
      };

      const service = new OnboardingService({ prisma: createMockOnboardingPrisma(userData) });
      const result = await service.completeOnboarding({ userId: 'u2' });
      expect(result.onboardingCompleted).toBe(true);
    });

    it('Scenario 3: Google OAuth user skipping photo upload', async () => {
      // For OAuth accounts (Google / LinkedIn), photo upload is skippable at onboarding.
      const userData = {
        name: 'Tarek Bouazizi',
        job: 'Développeur Mobile',
        auth_provider: 'google', // OAuth
        image: null, // Skipped photo upload
        profile_type: ProfileType.INDIVIDUAL,
        interests: ['Flutter', 'Mobile'],
        selected_goals: ['trouver un job'],
        offer_service: true,
        service_type: 'Développement mobile',
        price: '50 DT',
        video: null, // Skipped
      };

      const service = new OnboardingService({ prisma: createMockOnboardingPrisma(userData) });
      const result = await service.completeOnboarding({ userId: 'u3' });
      expect(result.onboardingCompleted).toBe(true);
    });

    it('Scenario 4: Craftsman skipping fixed availability days and education', async () => {
      // Flexible on-call craftsman with no fixed days calendar.
      const userData = {
        name: 'Walid Plombier',
        job: 'Plombier',
        auth_provider: 'phone',
        image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e',
        profile_type: ProfileType.PROVIDER,
        interests: ['plomberie', 'dépannage'],
        selected_goals: ['proposer mes services'],
        offer_service: true,
        service_type: 'Jardinage / Bricolage',
        price: '30 DT',
        availability_days: [], // Skipped fixed schedule
        educations: [], // Skipped
      };

      const service = new OnboardingService({ prisma: createMockOnboardingPrisma(userData) });
      const result = await service.completeOnboarding({ userId: 'u4' });
      expect(result.onboardingCompleted).toBe(true);
    });

    it('Scenario 5: Power user with 100% complete profile (no skips)', async () => {
      const userData = {
        name: 'Ines Mansouri',
        job: 'Consultante Marketing Digital',
        auth_provider: 'phone',
        image: 'https://images.unsplash.com/photo-1573496799652-408c2ac9fe98',
        profile_type: ProfileType.PROVIDER,
        interests: ['Marketing', 'Growth'],
        selected_goals: ['proposer mes services'],
        offer_service: true,
        service_type: 'Services & missions / Consulting',
        price: '80 DT',
        video: '/uploads/videos/ines.mp4',
        bio: '10 ans d’expérience',
        experiences: [{ title: 'Senior Consultant' }],
        educations: [{ degree: 'Master' }],
      };

      const service = new OnboardingService({ prisma: createMockOnboardingPrisma(userData) });
      const result = await service.completeOnboarding({ userId: 'u5' });
      expect(result.onboardingCompleted).toBe(true);
    });
  });

  describe('Invalid Step Skips (Must be rejected by OnboardingService)', () => {
    it('rejects an INDIVIDUAL who skips job title', async () => {
      const userData = {
        name: 'Ahmed Test',
        job: null, // Invalid: job is required for INDIVIDUAL
        auth_provider: 'phone',
        image: 'photo.jpg',
        profile_type: ProfileType.INDIVIDUAL,
        interests: ['Tech'],
        selected_goals: ['trouver un job'],
        offer_service: false,
      };

      const service = new OnboardingService({ prisma: createMockOnboardingPrisma(userData) });
      await expect(service.completeOnboarding({ userId: 'err1' })).rejects.toThrow(
        'onboarding_incomplete',
      );
    });

    it('rejects a phone-signup user who skips photo upload', async () => {
      const userData = {
        name: 'Sami Test',
        job: 'Chauffeur',
        auth_provider: 'phone',
        image: null, // Invalid: phone accounts must have a photo
        profile_type: ProfileType.INDIVIDUAL,
        interests: ['Transport'],
        selected_goals: ['proposer mes services'],
        offer_service: false,
      };

      const service = new OnboardingService({ prisma: createMockOnboardingPrisma(userData) });
      await expect(service.completeOnboarding({ userId: 'err2' })).rejects.toThrow(
        'onboarding_incomplete',
      );
    });

    it('rejects a user with offer_service=true who skips service_type or price', async () => {
      const userData = {
        name: 'Fatima Test',
        job: 'Aide ménagère',
        auth_provider: 'phone',
        image: 'photo.jpg',
        profile_type: ProfileType.PROVIDER,
        interests: ['Ménage'],
        selected_goals: ['proposer mes services'],
        offer_service: true,
        service_type: null, // Invalid: required when offer_service=true
        price: null,
      };

      const service = new OnboardingService({ prisma: createMockOnboardingPrisma(userData) });
      await expect(service.completeOnboarding({ userId: 'err3' })).rejects.toThrow(
        'onboarding_incomplete',
      );
    });

    it('rejects a user who skips interests or goals', async () => {
      const userData = {
        name: 'Nadia Test',
        job: 'Designer',
        auth_provider: 'phone',
        image: 'photo.jpg',
        profile_type: ProfileType.INDIVIDUAL,
        interests: [], // Invalid: at least 1 interest required
        selected_goals: [], // Invalid: at least 1 goal required
        offer_service: false,
      };

      const service = new OnboardingService({ prisma: createMockOnboardingPrisma(userData) });
      await expect(service.completeOnboarding({ userId: 'err4' })).rejects.toThrow(
        'onboarding_incomplete',
      );
    });
  });

  describe('Discovery Matching Engine Behavior on Mocked Skip Profiles', () => {
    it('matches a client who skipped offer_service with delivery and cleaning providers', () => {
      // Client (Mariem Jaziri) who skipped offer_service, experiences, educations
      const client: ScoringProfile = {
        id: 'mariem-client',
        profile_type: 'INDIVIDUAL',
        job: "Architecte d'intérieur",
        activity_sector: 'Services Professionnels',
        interests: ['livraison', 'aide ménagère'],
        goals: ['demander un service', 'trouver un prestataire'],
        languages: ['fr', 'ar'],
      };

      // Provider (Sami Ben Amor) who skipped education and bio
      const deliveryCourier: ScoringProfile = {
        id: 'sami-driver',
        profile_type: 'PROVIDER',
        job: 'Chauffeur livreur',
        service_type: 'Chauffeur / Transport',
        activity_sector: 'Transport, Logistique & Mobilité',
        interests: ['livraison', 'coursier'],
        goals: ['proposer mes services'],
        languages: ['fr', 'ar'],
        rating: 4.9,
        reviews: 38,
      };

      // Provider (Moncef Nettoyage) who skipped job title
      const cleaningAgency: ScoringProfile = {
        id: 'moncef-clean',
        profile_type: 'PROVIDER',
        job: null, // Skipped job title
        service_type: 'Service à domicile',
        activity_sector: 'Services Locaux & Artisanat',
        interests: ['nettoyage', 'aide ménagère'],
        goals: ['proposer mes services'],
        languages: ['fr', 'ar'],
        rating: 4.8,
        reviews: 19,
      };

      const courierScore = computeMatchScore(client, deliveryCourier, 3);
      const cleanerScore = computeMatchScore(client, cleaningAgency, 4);

      // Both should match into Group 1 with high confidence despite field omissions
      expect(courierScore.matchGroup).toBe(1);
      expect(courierScore.confidence).toBe('high');
      expect(courierScore.finalScore).toBeGreaterThanOrEqual(80);

      expect(cleanerScore.matchGroup).toBe(1);
      expect(cleanerScore.confidence).toBe('high');
      expect(cleanerScore.finalScore).toBeGreaterThanOrEqual(80);
    });

    it('correctly matches OAuth user who skipped photo upload with fallback avatar scoring', () => {
      const employer: ScoringProfile = {
        id: 'employer',
        profile_type: 'PROVIDER',
        job: 'Directeur Technique',
        activity_sector: 'tech_digital',
        interests: ['Flutter', 'Mobile'],
        goals: ["recruter quelqu'un"],
      };

      // Candidate Tarek Bouazizi (OAuth, image: null)
      const oauthCandidate: ScoringProfile = {
        id: 'tarek-oauth',
        profile_type: 'INDIVIDUAL',
        job: 'Développeur Mobile',
        activity_sector: 'tech_digital',
        interests: ['Flutter', 'Mobile'],
        goals: ['trouver un job'],
        image: null, // Skipped photo
        rating: 4.6,
      };

      const score = computeMatchScore(employer, oauthCandidate, 2);
      expect(score.matchGroup).toBe(1);
      expect(score.finalScore).toBeGreaterThanOrEqual(80);
    });
  });
});
