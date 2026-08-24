import adminAnalyticsReducer from '@/features/admin-analytics/store/admin-analytics-slice';
import adminAuthReducer from '@/features/admin-auth/store/admin-auth-slice';
import adminPlansReducer from '@/features/admin-plans/store/admin-plans-slice';
import adminReportsReducer from '@/features/admin-reports/store/admin-reports-slice';
import adminUsersReducer from '@/features/admin-users/store/admin-users-slice';
import { combineReducers } from '@reduxjs/toolkit';

// The admin app only carries the admin slices; the main app keeps its own store.
const rootReducer = combineReducers({
  adminAuth: adminAuthReducer,
  adminUsers: adminUsersReducer,
  adminPlans: adminPlansReducer,
  adminAnalytics: adminAnalyticsReducer,
  adminReports: adminReportsReducer,
});

export default rootReducer;
