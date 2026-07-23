import { combineReducers } from '@reduxjs/toolkit';

import authReducer from './auth-slice';

// The admin slices moved with the admin dashboard into apps/admin, which has its own store.
const rootReducer = combineReducers({
  auth: authReducer,
});

export default rootReducer;
