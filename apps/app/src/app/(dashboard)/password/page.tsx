'use client';

import { StubScreen } from '@/components/matchy/stub-screen';

export default function PasswordPage() {
  return (
    <StubScreen
      title="Password"
      description="Change your password securely. This action is not wired yet."
    >
      <div className="mt-4 space-y-3">
        {['Current password', 'New password', 'Confirm password'].map((label) => (
          <input
            key={label}
            disabled
            type="password"
            placeholder={label}
            className="w-full rounded-xl border border-[#E0E0E0] bg-[#F5F7FA] px-3 py-2.5 text-sm opacity-70"
          />
        ))}
      </div>
    </StubScreen>
  );
}
