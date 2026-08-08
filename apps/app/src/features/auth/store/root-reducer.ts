import identityVerificationReducer from '@/features/identity-verification/store/identity-verification-slice';
import matchingReducer from '@/features/matching/store/matching-slice';
import messagingReducer from '@/features/messaging/store/messaging-slice';
import notificationsReducer from '@/features/notifications/store/notifications-slice';
import onboardingReducer from '@/features/onboarding/store/onboarding-slice';
import profileReducer from '@/features/profile/store/profile-slice';
import { combineReducers } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import authReducer from './auth-slice';

// Nested (rather than root-level) persistence for `auth` so `sessionChecked` can be
// blacklisted specifically — it must always start `false` again on the next page load,
// even though the rest of the auth slice (status, user) is deliberately persisted for a
// fast optimistic UI. See the comment on AuthState.sessionChecked.
const authPersistConfig = {
  key: 'auth',
  storage,
  blacklist: ['sessionChecked'],
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  onboarding: onboardingReducer,
  matching: matchingReducer,
  messaging: messagingReducer,
  profile: profileReducer,
  notifications: notificationsReducer,
  identityVerification: identityVerificationReducer,
});

export default rootReducer;
