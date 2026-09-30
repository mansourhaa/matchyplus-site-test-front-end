import { LoginForm } from '@/features/auth/components/login-form';
import { Suspense } from 'react';

export default function ConnexionPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
