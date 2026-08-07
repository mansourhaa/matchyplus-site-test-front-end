'use client';

import { AccountProfileView } from '@/components/matchy/settings/account-profile-view';
import { Suspense } from 'react';

export default function AccountProfilePage() {
  return (
    <Suspense fallback={null}>
      <AccountProfileView />
    </Suspense>
  );
}
