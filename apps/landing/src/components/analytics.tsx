'use client';

import Script from 'next/script';
import { useEffect, useState, useSyncExternalStore } from 'react';

// Public build-time values (see .env.example): a missing one leaves its script unloaded.
const COOKIEYES_SRC = process.env.NEXT_PUBLIC_COOKIEYES_SRC;
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
// The CookieYes account is registered for the public site only: on localhost or staging its
// script throws "website URL has changed", and their traffic would skew the statistics anyway.
const PRODUCTION_HOSTNAMES = ['matchyplus.com', 'www.matchyplus.com'];

// The hostname never changes during a visit, so there is nothing to subscribe to.
const noSubscription = () => () => {};

type CookieYesConsent = { categories: Record<string, boolean> };

declare global {
  interface Window {
    getCkyConsent?: () => CookieYesConsent;
    /** Reopens the CookieYes preferences (footer "Gestion des cookies"). */
    revisitCkyConsent?: () => void;
    clarity?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean;
  }
}

/**
 * CookieYes banner plus the analytics it governs. GA4 and Clarity are only fetched once the
 * visitor accepts the "analytics" category, and are switched off if that consent is withdrawn.
 * Each script has an `id`, so `next/script` loads it once however often this remounts.
 */
export function Analytics() {
  // Known only in the browser, so the server render and hydration both start without scripts.
  const onProductionSite = useSyncExternalStore(
    noSubscription,
    () => PRODUCTION_HOSTNAMES.includes(window.location.hostname),
    () => false,
  );
  // null until analytics consent is first given: nothing is loaded before then.
  const [analytics, setAnalytics] = useState<boolean | null>(null);

  useEffect(() => {
    const update = (granted: boolean) =>
      setAnalytics((previous) => (granted ? true : previous === null ? null : false));
    const readStoredConsent = () => update(window.getCkyConsent?.().categories.analytics === true);
    const onConsentUpdate = (event: Event) =>
      update((event as CustomEvent<{ accepted: string[] }>).detail.accepted.includes('analytics'));

    document.addEventListener('cookieyes_banner_load', readStoredConsent);
    document.addEventListener('cookieyes_consent_update', onConsentUpdate);
    // CookieYes may have finished loading before these listeners were attached.
    readStoredConsent();
    return () => {
      document.removeEventListener('cookieyes_banner_load', readStoredConsent);
      document.removeEventListener('cookieyes_consent_update', onConsentUpdate);
    };
  }, []);

  useEffect(() => {
    if (analytics === null) return;
    if (GA_MEASUREMENT_ID) window[`ga-disable-${GA_MEASUREMENT_ID}`] = !analytics;
    // consent(false) only erases Clarity's cookies; stop() also ends the cookieless recording.
    // Neither tool restarts cleanly in-page (Clarity's start() re-runs its init and warns CL001),
    // so a consent given again after a withdrawal takes effect on the next page load.
    if (analytics) {
      window.clarity?.('consent');
    } else {
      window.clarity?.('consent', false);
      window.clarity?.('stop');
    }
  }, [analytics]);

  if (!onProductionSite) return null;

  return (
    <>
      {COOKIEYES_SRC && <Script id="cookieyes" src={COOKIEYES_SRC} />}
      {analytics !== null && GA_MEASUREMENT_ID && (
        <>
          <Script
            id="ga4"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          />
          <Script id="ga4-init">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
          </Script>
        </>
      )}
      {analytics !== null && CLARITY_PROJECT_ID && (
        <Script id="clarity-init">
          {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
clarity("consent");`}
        </Script>
      )}
    </>
  );
}
