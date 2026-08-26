'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { VerifyAccountScreen } from '@/features/identity-verification/components/verify-account-screen';

export default function StandaloneVerifyAccountPage() {
  return (
    <div className="h-full overflow-y-auto" style={{ background: matchyBrand.bg }}>
      <VerifyAccountScreen />
    </div>
  );
}
