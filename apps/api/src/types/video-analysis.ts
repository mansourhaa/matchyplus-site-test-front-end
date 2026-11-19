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
