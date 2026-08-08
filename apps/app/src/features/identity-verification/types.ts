export type IdentityVerificationJobStatus =
  'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export type IdentityVerificationJob = {
  id: string;
  type: string;
  status: IdentityVerificationJobStatus;
  result: { verified?: boolean; [key: string]: unknown } | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IdentityVerificationStatusResponse = {
  job: IdentityVerificationJob;
  identityVerified: boolean;
};
