export interface OAuthProfile {
  id: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
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
