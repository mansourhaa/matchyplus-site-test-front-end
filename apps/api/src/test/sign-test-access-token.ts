import jwt from 'jsonwebtoken';

/** Sign a member access JWT matching production claims (`aud` + `tv`). */
export function signTestAccessToken(
  userId: string,
  extras: {
    email?: string | null;
    phone?: string | null;
    tv?: number;
    audience?: 'member' | 'admin';
  } = {},
) {
  return jwt.sign(
    {
      id: userId,
      email: extras.email ?? null,
      phone: extras.phone ?? null,
      tv: extras.tv ?? 0,
    },
    'test-access-token-secret',
    { audience: extras.audience ?? 'member' },
  );
}
