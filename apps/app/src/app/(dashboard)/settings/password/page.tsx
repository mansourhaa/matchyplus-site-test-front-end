'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { ChangePasswordSection } from '@/features/auth/components/account-settings';

export default function PasswordPage() {
  return (
    <div className="h-full overflow-y-auto" style={{ background: matchyBrand.bg }}>
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-6 md:px-8">
        <ChangePasswordSection />
      </div>
    </div>
  );
}
