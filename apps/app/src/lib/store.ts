import { resetAuthState } from '@/features/auth/store/auth-slice';
import rootReducer from '@/features/auth/store/root-reducer';
import { resetMessagingState } from '@/features/messaging/store/messaging-slice';
import { configureStore } from '@reduxjs/toolkit';
import { persistStore } from 'redux-persist';

import { setAuthFailureHandler } from './auth-events';

// Only `auth` is persisted, via its own nested persistReducer in root-reducer.ts (so a
// field within it can be excluded from persistence) — every other slice here is plain,
// in-memory-only state.
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

// See lib/auth-events.ts — this is the one place that closes the loop between the
// axios interceptor and Redux, kept out of lib/api.ts to avoid a circular import.
setAuthFailureHandler(() => {
  store.dispatch(resetAuthState());
  store.dispatch(resetMessagingState());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
