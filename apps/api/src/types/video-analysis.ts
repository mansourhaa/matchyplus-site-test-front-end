import { MultipartFile, MultipartValue } from '@fastify/multipart';

export type StartOnboardingVideoAnalysisBody = {
  video?: MultipartFile;
  uiLocale?: MultipartValue<string>;
};

export type OnboardingVideoAnalysisParams = {
  jobId: string;
};

export type OnboardingVideoAnalysisQuery = {
  token: string;
};

/** Text fields the voice service can rewrite in another page language. */
export const RELABEL_FIELDS = [
  'first_name',
  'last_name',
  'profession',
  'city',
  'bio',
  'years_experience',
  'availability',
] as const;
export type RelabelField = (typeof RELABEL_FIELDS)[number];

export type VideoAnalysisLocale = 'fr' | 'ar' | 'en';

export type RelabelOption = { value: string; label?: string };

export type RelabelOnboardingFieldsBody = {
  values: Partial<Record<RelabelField, string>>;
  uiLocale: VideoAnalysisLocale;
  serviceId?: string | null;
  aiFields?: RelabelField[];
  /** One-click proposals shown under the fields, rewritten in the new language too. */
  suggestions?: Partial<Record<RelabelField, RelabelOption[]>>;
};

export type RelabelledField = { value: string | null; review: boolean };

export type RelabelOnboardingFieldsResponse = {
  fields: Partial<Record<RelabelField, RelabelledField>>;
  suggestions: Partial<Record<RelabelField, RelabelOption[]>>;
  serviceId: string | null;
};
