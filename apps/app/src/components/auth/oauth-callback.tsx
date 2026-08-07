'use client';

import { useAppDispatch } from '@/features/auth/hooks';
import { exchangeOAuthCode } from '@/features/auth/store/auth-slice';
import { resolvePostAuthDestination } from '@/lib/post-auth-routing';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Landing page for the Google/LinkedIn OAuth redirect (see routes/v1/auth/actions.ts on the
 * backend: the provider callback redirects here with `?code=` or `?error=`). Exchanges the
 * one-time code for real tokens via POST /auth/oauth/exchange, then signs the user in the
 * same way any other login flow does.
 */
export function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function run() {
      const oauthError = searchParams.get('error');
      if (oauthError) {
        setError(
          'La connexion via ce fournisseur a échoué. Réessayez ou utilisez une autre méthode.',
        );
        return;
      }

      const code = searchParams.get('code');
      if (!code) {
        setError('Code de connexion manquant.');
        return;
      }

      try {
        const result = await dispatch(exchangeOAuthCode({ code }));
        if (exchangeOAuthCode.fulfilled.match(result)) {
          router.push(
            resolvePostAuthDestination(
              searchParams.get('next'),
              result.payload.user.onboarding_completed,
            ),
          );
          router.refresh();
        } else {
          setError('La connexion a échoué. Réessayez.');
        }
      } catch {
        setError('La connexion a échoué. Réessayez.');
      }
    }

    void run();
  }, [dispatch, router, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6">
      {error ? (
        <>
          <p className="text-center" style={{ fontSize: '14px', color: '#E24E59' }}>
            {error}
          </p>
          <Link
            href="/login"
            className="rounded-2xl px-5 py-2.5 text-white"
            style={{
              background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            Retour à la connexion
          </Link>
        </>
      ) : (
        <>
          <Loader2 size={28} className="animate-spin" color="#2F76BB" />
          <p style={{ fontSize: '14px', color: '#888' }}>Connexion en cours...</p>
        </>
      )}
    </div>
  );
}
