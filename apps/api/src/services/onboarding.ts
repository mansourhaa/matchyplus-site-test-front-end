import { Prisma, PrismaClient } from '@saas-boilerplate/types';

import {
  CompleteOnboardingPayload,
  GetOnboardingProfilePayload,
  UpdateOnboardingProfilePayload,
} from '../types/onboarding.js';
import { AbstractServiceOptions } from '../types/services.js';
import { isStoredMediaPath } from '../utils/media-storage.js';

// Never select password/tokens/verification codes — same convention as
// AuthenticationService.authCheck().
const PROFILE_SELECT = {
  id: true,
  name: true,
  // Read-only: lets the identity step know whether the account went through phone
  // signup (photo required, matching the old app's Inscription1) or OAuth (no phone
  // ever collected, so no photo requirement) — never accepted back via updateProfile.
  auth_provider: true,
  job: true,
  bio: true,
  image: true,
  // Read-only here too: video is only ever written via ProfileService's upload/delete
  // endpoints (apps/api/src/routes/v1/users/actions.ts's /me/profile/video), never
  // accepted back through this service's updateProfile.
  video: true,
  city: true,
  profile_type: true,
  offer_service: true,
  service_type: true,
  price: true,
  interests: true,
  selected_goals: true,
  availability_days: true,
  availability_hours: true,
  contact_modes: true,
  languages: true,
  experience: true,
  sector: true,
  education_level: true,
  experiences: true,
  educations: true,
  rating: true,
  reviews: true,
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

    // `image` may be a legacy base64 data URL, but must never be an arbitrary
    // `/uploads/photos/...` path unless it's the caller's own current value — otherwise a
    // member could claim another member's stored photo path here (this endpoint has none
    // of the ownership/upload bookkeeping that ProfileService.uploadPhoto has), and a
    // later upload/delete through that pipeline would then remove the real owner's file.
    if (fields.image !== undefined && isStoredMediaPath(fields.image, 'photos')) {
      const current = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { image: true },
      });
      if (current.image !== fields.image) {
        throw new Error('foreign_photo_path');
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (fields.name !== undefined) data.name = fields.name;
    if (fields.job !== undefined) data.job = fields.job;
    if (fields.bio !== undefined) data.bio = fields.bio;
    if (fields.image !== undefined) data.image = fields.image;
    if (fields.city !== undefined) data.city = fields.city;
    if (fields.profileType !== undefined) data.profile_type = fields.profileType;
    if (fields.offerService !== undefined) data.offer_service = fields.offerService;
    if (fields.serviceType !== undefined) data.service_type = fields.serviceType;
    if (fields.price !== undefined) data.price = fields.price;
    if (fields.interests !== undefined) data.interests = fields.interests;
    if (fields.selectedGoals !== undefined) data.selected_goals = fields.selectedGoals;
    if (fields.availabilityDays !== undefined) data.availability_days = fields.availabilityDays;
    if (fields.availabilityHours !== undefined) data.availability_hours = fields.availabilityHours;
    if (fields.contactModes !== undefined) data.contact_modes = fields.contactModes;
    if (fields.languages !== undefined) data.languages = fields.languages;
    if (fields.experience !== undefined) data.experience = fields.experience;
    if (fields.sector !== undefined) data.sector = fields.sector;
    if (fields.educationLevel !== undefined) data.education_level = fields.educationLevel;
    if (fields.experiences !== undefined) data.experiences = fields.experiences;
    if (fields.educations !== undefined) data.educations = fields.educations;

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
   * This is the one authoritative rule — server-side, since UI validation on the wizard
   * is not a substitute for it: `profile_type` and a non-empty `name` are always required
   * (a null profile_type must never silently skip the INDIVIDUAL job rule below); at
   * least one interest and one goal are always required; `job` is only required for an
   * INDIVIDUAL ("Employé") profile — a PROVIDER ("Employeur") profile leaves it optional,
   * matching the old app's Inscription1 ("facultatif" label on profession for Employeur);
   * a phone-signup account (`auth_provider === 'phone'`) must have a photo, matching
   * Inscription1's phone photo requirement; service_type/price are only required when the
   * user opted into offering a service. Experience and education are always optional/
   * skippable, matching the old app's "Passer" behavior on those two steps.
   */
  async completeOnboarding(payload: CompleteOnboardingPayload) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.userId },
      select: {
        name: true,
        job: true,
        auth_provider: true,
        image: true,
        profile_type: true,
        interests: true,
        selected_goals: true,
        offer_service: true,
        service_type: true,
        price: true,
      },
    });

    const hasProfileType = user.profile_type !== null;
    const hasName = Boolean(user.name?.trim());
    const hasIdentity = user.profile_type !== 'INDIVIDUAL' || Boolean(user.job?.trim());
    const hasInterest = user.interests.length > 0;
    const hasGoals = user.selected_goals.length > 0;
    const hasServiceDetails = !user.offer_service || Boolean(user.service_type && user.price);
    const hasPhoto = user.auth_provider !== 'phone' || Boolean(user.image);

    if (
      !hasProfileType ||
      !hasName ||
      !hasIdentity ||
      !hasInterest ||
      !hasGoals ||
      !hasServiceDetails ||
      !hasPhoto
    ) {
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
