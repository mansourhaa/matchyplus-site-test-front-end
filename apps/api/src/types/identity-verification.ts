import { MultipartFile } from '@fastify/multipart';

export type SubmitIdentitySelfieBody = {
  selfie?: MultipartFile;
};

export type IdentityVerificationJobParams = {
  jobId: string;
};
