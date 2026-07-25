import onboardingReducer from '@/features/onboarding/store/onboarding-slice';
import { combineReducers } from '@reduxjs/toolkit';

import authReducer from './auth-slice';

// The admin slices moved with the admin dashboard into apps/admin, which has its own store.
const rootReducer = combineReducers({
  auth: authReducer,
  onboarding: onboardingReducer,
});

export default rootReducer;
