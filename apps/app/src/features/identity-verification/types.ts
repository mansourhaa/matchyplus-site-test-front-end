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

/** `job` is null when the user has never submitted a selfie. */
export type LatestIdentityVerificationResponse = {
  job: IdentityVerificationJob | null;
  identityVerified: boolean;
};
