import { z } from 'zod';

// Profession is only required for "Offering" (INDIVIDUAL) profiles — optional
// for "Looking for" (PROVIDER), matching the old app's Inscription1.
export const identityStepSchema = z
  .object({
    name: z.string().trim().min(1, 'Le nom est obligatoire.'),
    job: z.string().trim().optional(),
    bio: z.string().max(250).optional(),
    image: z.string().optional(),
    profileType: z.enum(['INDIVIDUAL', 'PROVIDER']),
  })
  .refine((data) => data.profileType !== 'INDIVIDUAL' || Boolean(data.job?.trim()), {
    message: 'La profession est obligatoire.',
    path: ['job'],
  });

export const interestsStepSchema = z
  .object({
    interests: z
      .array(z.string())
      .min(1, 'Ajoutez au moins un centre d’intérêt.')
      .max(5, 'Vous pouvez ajouter jusqu’à 5 centres d’intérêt.'),
    selectedGoals: z.array(z.string()).min(1, 'Sélectionnez au moins un objectif.'),
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

export const locationStepSchema = z.object({
  city: z.string().trim().optional(),
  offerService: z.boolean().optional(),
  availabilityDays: z.array(z.string()).optional(),
  availabilityHours: z.array(z.string()).optional(),
  contactModes: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
});

export type IdentityStepSchema = z.infer<typeof identityStepSchema>;
export type InterestsStepSchema = z.infer<typeof interestsStepSchema>;
export type LocationStepSchema = z.infer<typeof locationStepSchema>;
