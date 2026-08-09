export type IdentityVerificationJobStatus =
  'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export type IdentityVerificationJob = {
  id: string;
  type: string;
  status: IdentityVerificationJobStatus;
  /** `code` mirrors the worker's outcome codes — see verify_identity.py. */
  result: {
    verified?: boolean;
    code?: 'match' | 'mismatch' | 'no_face_detected';
    [key: string]: unknown;
  } | null;
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
