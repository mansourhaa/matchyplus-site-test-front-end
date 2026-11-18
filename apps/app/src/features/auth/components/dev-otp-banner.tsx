'use client';

type DevOtpBannerProps = {
  code: string | null | undefined;
};

/**
 * Displays the generated OTP code inline in development mode so developers can test
 * OTP flows without consuming SMS gateway credits. Never renders outside development.
 */
export function DevOtpBanner({ code }: DevOtpBannerProps) {
  if (process.env.NODE_ENV !== 'development' || !code) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs text-amber-900"
    >
      <span className="font-semibold">DEV OTP</span>
      <code className="rounded bg-amber-100 px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-amber-950">
        {code}
      </code>
    </div>
  );
}
