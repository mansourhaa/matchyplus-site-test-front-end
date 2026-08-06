'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** FullStack: email is managed via Google/LinkedIn on account-profile. */
export default function EmailPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/account-profile');
  }, [router]);
  return null;
}
