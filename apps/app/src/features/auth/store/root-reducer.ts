import matchingReducer from '@/features/matching/store/matching-slice';
import { combineReducers } from '@reduxjs/toolkit';

import authReducer from './auth-slice';

const rootReducer = combineReducers({
  auth: authReducer,
  matching: matchingReducer,
});

export default rootReducer;
