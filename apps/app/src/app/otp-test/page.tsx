import { OtpTestForm } from '@/features/auth/components/otp-test-form';
import { notFound } from 'next/navigation';

// Dev-only harness for manually exercising /otp/send and /otp/verify — not part of the
// shipped product login flow (see components/auth/login-form.tsx for that).
export default function OtpTestPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <OtpTestForm />;
}
