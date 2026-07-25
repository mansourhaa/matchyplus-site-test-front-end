import { z } from 'zod';

export const identityStepSchema = z.object({
  name: z.string().trim().min(1),
  job: z.string().trim().min(1),
  bio: z.string().max(250).optional(),
  image: z.string().optional(),
  profileType: z.enum(['INDIVIDUAL', 'PROVIDER']),
});

export const interestsStepSchema = z
  .object({
    interests: z.array(z.string()).min(1).max(5),
    selectedGoals: z.array(z.string()).min(1),
    offerService: z.boolean(),
    serviceType: z.string().trim().optional(),
    price: z.string().trim().optional(),
  })
  .refine((data) => !data.offerService || Boolean(data.serviceType), {
    message: 'Le type de service est obligatoire quand l’offre de service est activée.',
    path: ['serviceType'],
  })
  .refine((data) => !data.offerService || Boolean(data.price && Number(data.price) > 0), {
    message: 'Le prix est obligatoire et doit être supérieur à 0.',
    path: ['price'],
  });

const workExperienceSchema = z.object({
  title: z.string().trim().min(1),
  company: z.string().trim().min(1),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
});

export const experienceStepSchema = z.object({
  experience: z.string().optional(),
  sector: z.string().optional(),
  experiences: z.array(workExperienceSchema).optional(),
});

const educationSchema = z.object({
  school: z.string().trim().min(1),
  degree: z.string().optional(),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  result: z.string().optional(),
});

export const educationStepSchema = z.object({
  educationLevel: z.string().optional(),
  educations: z.array(educationSchema).optional(),
});

export const locationStepSchema = z
  .object({
    city: z.string().trim().optional(),
    offerService: z.boolean(),
    availabilityDays: z.array(z.string()).optional(),
    availabilityHours: z.array(z.string()).optional(),
    contactModes: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
  })
  .refine((data) => !data.offerService || (data.availabilityDays?.length ?? 0) > 0, {
    message: 'Sélectionnez au moins un jour.',
    path: ['availabilityDays'],
  });

export type IdentityStepSchema = z.infer<typeof identityStepSchema>;
export type InterestsStepSchema = z.infer<typeof interestsStepSchema>;
export type ExperienceStepSchema = z.infer<typeof experienceStepSchema>;
export type EducationStepSchema = z.infer<typeof educationStepSchema>;
export type LocationStepSchema = z.infer<typeof locationStepSchema>;
