import { Prisma, PrismaClient } from '@saas-boilerplate/types';

import {
  CompleteOnboardingPayload,
  GetOnboardingProfilePayload,
  UpdateOnboardingProfilePayload,
} from '../types/onboarding.js';
import { AbstractServiceOptions } from '../types/services.js';

// Never select password/tokens/verification codes — same convention as
// AuthenticationService.authCheck().
const PROFILE_SELECT = {
  id: true,
  name: true,
  job: true,
  bio: true,
  image: true,
  city: true,
  profile_type: true,
  offer_service: true,
  service_type: true,
  sector: true,
  price: true,
  interests: true,
  selected_goals: true,
  experience: true,
  experiences: true,
  education_level: true,
  educations: true,
  availability_days: true,
  availability_hours: true,
  contact_modes: true,
  languages: true,
  onboarding_completed_at: true,
} satisfies Prisma.UserSelect;

function toProfileResult(user: Prisma.UserGetPayload<{ select: typeof PROFILE_SELECT }>) {
  const { onboarding_completed_at, ...rest } = user;
  return {
    ...rest,
    onboardingCompleted: Boolean(onboarding_completed_at),
  };
}

export class OnboardingService {
  prisma: PrismaClient;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  async getProfile(payload: GetOnboardingProfilePayload) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.userId },
      select: PROFILE_SELECT,
    });

    return toProfileResult(user);
  }

  async updateProfile(payload: UpdateOnboardingProfilePayload) {
    const { userId, ...fields } = payload;

    const data: Prisma.UserUpdateInput = {};
    if (fields.name !== undefined) data.name = fields.name;
    if (fields.job !== undefined) data.job = fields.job;
    if (fields.bio !== undefined) data.bio = fields.bio;
    if (fields.image !== undefined) data.image = fields.image;
    if (fields.city !== undefined) data.city = fields.city;
    if (fields.profileType !== undefined) data.profile_type = fields.profileType;
    if (fields.offerService !== undefined) data.offer_service = fields.offerService;
    if (fields.serviceType !== undefined) data.service_type = fields.serviceType;
    if (fields.sector !== undefined) data.sector = fields.sector;
    if (fields.price !== undefined) data.price = fields.price;
    if (fields.interests !== undefined) data.interests = fields.interests;
    if (fields.selectedGoals !== undefined) data.selected_goals = fields.selectedGoals;
    if (fields.experience !== undefined) data.experience = fields.experience;
    if (fields.experiences !== undefined) data.experiences = fields.experiences;
    if (fields.educationLevel !== undefined) data.education_level = fields.educationLevel;
    if (fields.educations !== undefined) data.educations = fields.educations;
    if (fields.availabilityDays !== undefined) data.availability_days = fields.availabilityDays;
    if (fields.availabilityHours !== undefined) data.availability_hours = fields.availabilityHours;
    if (fields.contactModes !== undefined) data.contact_modes = fields.contactModes;
    if (fields.languages !== undefined) data.languages = fields.languages;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: PROFILE_SELECT,
    });

    return toProfileResult(user);
  }

  /**
   * The old app had two inconsistent completeness checks (a loose "any of sector/bio/
   * interest" OR, and a separate strict "all 5 steps" check that nothing actually called).
   * This is the one authoritative rule: identity (job) + at least one interest are always
   * required; service_type/price are only required when the user opted into offering a
   * service. Experience and education are always optional/skippable, matching the old
   * app's "Passer" behavior on those two steps.
   */
  async completeOnboarding(payload: CompleteOnboardingPayload) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.userId },
      select: {
        job: true,
        interests: true,
        offer_service: true,
        service_type: true,
        price: true,
      },
    });

    const hasIdentity = Boolean(user.job?.trim());
    const hasInterest = user.interests.length > 0;
    const hasServiceDetails = !user.offer_service || Boolean(user.service_type && user.price);

    if (!hasIdentity || !hasInterest || !hasServiceDetails) {
      throw new Error('onboarding_incomplete');
    }

    const updated = await this.prisma.user.update({
      where: { id: payload.userId },
      data: { onboarding_completed_at: new Date() },
      select: PROFILE_SELECT,
    });

    return toProfileResult(updated);
  }
}
