'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { PhoneLinkSection } from '@/features/auth/components/account-settings';

export default function AddPhonePage() {
  return (
    <div className="h-full overflow-y-auto" style={{ background: matchyBrand.bg }}>
      <div className="w-full space-y-3 px-4 py-6 md:px-8">
        <PhoneLinkSection />
      </div>
    </div>
  );
}
