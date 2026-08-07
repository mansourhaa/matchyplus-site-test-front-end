import { OAuthCallback } from '@/features/auth/components/oauth-callback';
import { Suspense } from 'react';

export default function OAuthCallbackPage() {
  return (
    <Suspense>
      <OAuthCallback />
    </Suspense>
  );
}
