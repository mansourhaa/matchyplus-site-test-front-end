'use client';

import { useBootstrapSession } from '../hooks/use-bootstrap-session';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  useBootstrapSession();
  return <>{children}</>;
}
