import { OAuthCallback } from '@/components/auth/oauth-callback';
import { Suspense } from 'react';

export default function OAuthCallbackPage() {
  return (
    <Suspense>
      <OAuthCallback />
    </Suspense>
  );
}
