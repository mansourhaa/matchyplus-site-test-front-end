'use client';

import { StubScreen } from '@/components/matchy/stub-screen';

export default function EmailPage() {
  return (
    <StubScreen
      title="Email"
      description="Update the email on your account when security APIs ship."
    >
      <input
        disabled
        type="email"
        placeholder="you@example.com"
        className="mt-4 w-full rounded-xl border border-[#E0E0E0] bg-[#F5F7FA] px-3 py-2.5 text-sm opacity-70"
      />
    </StubScreen>
  );
}
