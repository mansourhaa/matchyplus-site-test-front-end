'use client';

import { StubScreen } from '@/components/matchy/stub-screen';

export default function AddPhonePage() {
  return (
    <StubScreen
      title="Phone number"
      description="Add a phone number to strengthen account recovery."
    >
      <input
        disabled
        type="tel"
        placeholder="+216 …"
        className="mt-4 w-full rounded-xl border border-[#E0E0E0] bg-[#F5F7FA] px-3 py-2.5 text-sm opacity-70"
      />
    </StubScreen>
  );
}
