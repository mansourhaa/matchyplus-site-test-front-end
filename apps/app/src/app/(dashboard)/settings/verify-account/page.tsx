'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { VerifyAccountScreen } from '@/features/identity-verification/components/verify-account-screen';

export default function VerifyAccountPage() {
  return (
    <div
      className="flex min-h-full w-full items-center justify-center overflow-y-auto px-4 py-8 md:px-8"
      style={{ background: matchyBrand.bg }}
    >
      <VerifyAccountScreen />
    </div>
  );
}
