import matchingReducer from '@/features/matching/store/matching-slice';
import onboardingReducer from '@/features/onboarding/store/onboarding-slice';
import profileReducer from '@/features/profile/store/profile-slice';
import { combineReducers } from '@reduxjs/toolkit';

import authReducer from './auth-slice';

const rootReducer = combineReducers({
  auth: authReducer,
  onboarding: onboardingReducer,
  matching: matchingReducer,
  profile: profileReducer,
});

export default rootReducer;
