'use client';

import { ThemeProvider } from '@/components/shared/providers/theme-provider';
import { Spinner } from '@/components/shared/spinner';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import { LocationProvider } from '@/features/location/location-context';
import { MatchingRealtimeBridge } from '@/features/matching/components/matching-realtime-bridge';
import { persistor, store } from '@/lib/store';
import type React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

export function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <div className="bg-background flex h-screen items-center justify-center">
            <Spinner />
          </div>
        }
        persistor={persistor}
      >
        <I18nProvider>
          <LocationProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              forcedTheme="light"
              enableSystem={false}
              disableTransitionOnChange
            >
              <MatchingRealtimeBridge />
              {children}
            </ThemeProvider>
          </LocationProvider>
        </I18nProvider>
      </PersistGate>
    </Provider>
  );
}
