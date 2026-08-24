import { OAuthProfile } from './google-oauth.js';

// LinkedIn's OpenID Connect userinfo endpoint (Sign In with LinkedIn using OpenID Connect).
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

export async function fetchLinkedInProfile(accessToken: string): Promise<OAuthProfile> {
  const response = await fetch(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('oauth_profile_fetch_failed');
  }

  const data = (await response.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (!data.sub) {
    throw new Error('oauth_profile_fetch_failed');
  }

  return {
    id: data.sub,
    email: data.email ?? null,
    emailVerified: Boolean(data.email_verified),
    name: data.name ?? null,
  };
}
