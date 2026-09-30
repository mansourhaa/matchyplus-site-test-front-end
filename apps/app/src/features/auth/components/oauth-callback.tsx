'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch } from '@/features/auth/hooks';
import { exchangeOAuthCode } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
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
function oauthErrorMessage(code: string, t: (key: string) => string): string {
  switch (code) {
    case 'access_denied':
      return t('oauthCallback.errorAccessDenied');
    case 'oauth_invalid_state':
      return t('oauthCallback.errorInvalidState');
    case 'oauth_token_exchange_failed':
      return t('oauthCallback.errorTokenExchangeFailed');
    case 'oauth_email_unverified':
      return t('oauthCallback.errorEmailUnverified');
    case 'oauth_link_conflict':
      return t('oauthCallback.errorLinkConflict');
    case 'oauth_link_email_mismatch':
      return t('oauthCallback.errorLinkEmailMismatch');
    case 'oauth_provider_not_configured':
      return t('oauthCallback.errorProviderNotConfigured');
    case 'oauth_profile_fetch_failed':
      return t('oauthCallback.errorProfileFetchFailed');
    case 'account_banned':
      return t('oauthCallback.errorAccountBanned');
    case 'account_inactive':
      return t('oauthCallback.errorAccountInactive');
    default:
      return t('oauthCallback.errorGeneric');
  }
}

export function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function run() {
      const oauthError = searchParams.get('error');
      if (oauthError) {
        setError(oauthErrorMessage(oauthError, t));
        return;
      }

      const code = searchParams.get('code');
      if (!code) {
        setError(t('oauthCallback.errorCodeMissing'));
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
          // exchangeOAuthCode re-throws the API's own code as action.error.message (see
          // auth-slice.ts) — branch on it the same way oauthError above does, instead of
          // always showing the generic "try again" message regardless of the real reason
          // (e.g. a banned account, which retrying can never fix).
          setError(oauthErrorMessage(result.error.message ?? '', t));
        }
      } catch {
        setError(t('oauthCallback.errorLoginFailed'));
      }
    }

    void run();
  }, [dispatch, router, searchParams, t]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6">
      {error ? (
        <>
          <p className="text-center" style={{ fontSize: '14px', color: '#E24E59' }}>
            {error}
          </p>
          <Link
            href="/connexion"
            className="rounded-2xl px-5 py-2.5 text-white"
            style={{
              background: matchyBrand.gradient,
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            {t('oauthCallback.backToLogin')}
          </Link>
        </>
      ) : (
        <>
          <Loader2 size={28} className="animate-spin" color="#2F76BB" />
          <p style={{ fontSize: '14px', color: '#888' }}>{t('oauthCallback.signingIn')}</p>
        </>
      )}
    </div>
  );
}
