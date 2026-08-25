'use client';

import { AdminAddUserModal } from '@/components/admin/admin-add-user-modal';
import { AdminAnalyticsSection } from '@/components/admin/admin-analytics-section';
import { AdminDashboardSection } from '@/components/admin/admin-dashboard-section';
import { AdminPlansSection } from '@/components/admin/admin-plans-section';
import { AdminReportsSection } from '@/components/admin/admin-reports-section';
import { AdminSettingsSection } from '@/components/admin/admin-settings-section';
import { AdminSubscriptionsSection } from '@/components/admin/admin-subscriptions-section';
import { AdminUserDetail } from '@/components/admin/admin-user-detail';
import { AdminUsersSection } from '@/components/admin/admin-users-section';
import { ConfirmDeletePopup } from '@/components/admin/confirm-delete-popup';
import {
  fetchAdminAnalytics,
  selectAdminAnalytics,
} from '@/features/admin-analytics/store/admin-analytics-slice';
import { useAdminProactiveRefresh } from '@/features/admin-auth/hooks/use-admin-proactive-refresh';
import { ROLE_LABELS } from '@/features/admin-auth/schemas';
import { adminLogout, selectAdminAuth } from '@/features/admin-auth/store/admin-auth-slice';
import {
  fetchAdminPlans,
  selectAdminPlans,
  updateAdminPlan,
} from '@/features/admin-plans/store/admin-plans-slice';
import type { AdminPlan, AdminPlanUpdate } from '@/features/admin-plans/types';
import {
  fetchAdminReports,
  selectAdminReports,
  selectPendingReportCount,
  selectReportsByReportedUser,
  setReportStatusFilter,
  updateAdminReportStatus,
} from '@/features/admin-reports/store/admin-reports-slice';
import type { ReportStatus } from '@/features/admin-reports/types';
import {
  deleteAdminUser,
  fetchAdminStats,
  fetchAdminUserById,
  fetchAdminUsers,
  selectAdminUsers,
  selectUser,
  setFilters,
  updateAdminUser,
  updateAdminUserStatus,
} from '@/features/admin-users/store/admin-users-slice';
import type { AdminManagedUser, AdminUserUpdate } from '@/features/admin-users/types';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import {
  BarChart2,
  Bell,
  ChevronDown,
  CreditCard,
  Flag,
  Home,
  LogOut,
  type LucideIcon,
  Package,
  Settings,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type AdminSection =
  | 'dashboard'
  | 'users'
  | 'user-detail'
  | 'subscriptions'
  | 'plans'
  | 'analytics'
  | 'reports'
  | 'settings';

type NavKey = Exclude<AdminSection, 'user-detail'>;

/**
 * Minutes since `loginAt`, ticking every 30s so the header pill stays roughly live without a
 * full re-render loop. Null when the session was restored from storage rather than a fresh
 * login this tab (`loginAt` isn't persisted) — the pill just doesn't render in that case
 * rather than showing a fabricated duration.
 */
function useConnectedMinutes(loginAt: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!loginAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [loginAt]);

  if (!loginAt) return null;
  return Math.max(0, Math.floor((now - new Date(loginAt).getTime()) / 60_000));
}

const NAV_ITEMS: { key: NavKey; icon: LucideIcon; label: string }[] = [
  { key: 'dashboard', icon: Home, label: 'Tableau de bord' },
  { key: 'users', icon: Users, label: 'Utilisateurs' },
  { key: 'reports', icon: Flag, label: 'Signalements' },
  { key: 'subscriptions', icon: CreditCard, label: 'Abonnements' },
  { key: 'plans', icon: Package, label: 'Gestion Forfaits' },
  { key: 'analytics', icon: BarChart2, label: 'Analytiques' },
  { key: 'settings', icon: Settings, label: 'Paramètres' },
];

export function AdminPanel() {
  useAdminProactiveRefresh();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { admin, loginAt } = useAppSelector(selectAdminAuth);
  const connectedMinutes = useConnectedMinutes(loginAt);
  const { users, stats, selectedUser, loadingUsers, error, filters } =
    useAppSelector(selectAdminUsers);
  const {
    plans,
    saving: savingPlan,
    savedAt,
    error: plansError,
  } = useAppSelector(selectAdminPlans);
  const { analytics, error: analyticsError } = useAppSelector(selectAdminAnalytics);
  const {
    statusFilter: reportFilter,
    loading: loadingReports,
    error: reportsError,
  } = useAppSelector(selectAdminReports);
  const reportGroups = useAppSelector(selectReportsByReportedUser);
  const pendingReportCount = useAppSelector(selectPendingReportCount);

  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [previousSection, setPreviousSection] = useState<AdminSection>('users');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userToDelete, setUserToDelete] = useState<AdminManagedUser | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);

  useEffect(() => {
    void dispatch(fetchAdminStats());
    void dispatch(fetchAdminPlans());
    void dispatch(fetchAdminAnalytics());
  }, [dispatch]);

  useEffect(() => {
    void dispatch(fetchAdminReports(reportFilter));
  }, [dispatch, reportFilter]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void dispatch(fetchAdminUsers(filters));
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [dispatch, filters]);

  const handleLogout = () => {
    dispatch(adminLogout());
    router.push('/admin/login');
    router.refresh();
  };

  const handleSavePlan = async (id: AdminPlan['id'], changes: AdminPlanUpdate) => {
    const result = await dispatch(updateAdminPlan({ id, changes }));
    if (!updateAdminPlan.fulfilled.match(result)) return false;

    // A plan's price feeds the estimated revenue, so refresh what depends on it.
    void dispatch(fetchAdminAnalytics());
    return true;
  };

  const openUserDetail = (user: AdminManagedUser, from: AdminSection) => {
    dispatch(selectUser(user));
    setPreviousSection(from);
    setActiveSection('user-detail');
    void dispatch(fetchAdminUserById(user.id));
  };

  const closeUserDetail = () => {
    dispatch(selectUser(null));
    setActiveSection(previousSection);
  };

  const handleSave = async (changes: AdminUserUpdate) => {
    if (!selectedUser || Object.keys(changes).length === 0) return;
    await dispatch(updateAdminUser({ id: selectedUser.id, changes }));
    void dispatch(fetchAdminStats());
  };

  const handleChangeStatus = async (status: AdminManagedUser['status']) => {
    if (!selectedUser) return;
    await dispatch(updateAdminUserStatus({ id: selectedUser.id, status }));
    void dispatch(fetchAdminStats());
  };

  const handleDelete = async (id: string) => {
    const result = await dispatch(deleteAdminUser(id));

    // On failure the slice surfaces the error banner, so keep the admin where they are.
    if (!deleteAdminUser.fulfilled.match(result)) return;

    void dispatch(fetchAdminStats());
    setUserToDelete(null);
    if (selectedUser?.id === id) {
      setActiveSection(previousSection);
    }
  };

  const handleSetReportStatus = (id: string, status: ReportStatus) => {
    void dispatch(updateAdminReportStatus({ id, status }));
  };

  // Acting on a report: ban (or reactivate) the reported user, then refresh the reports so their
  // header status and any dependent stats reflect the change — this closes the "admin agit" loop.
  const handleBanReported = async (reportedId: string, next: AdminManagedUser['status']) => {
    await dispatch(updateAdminUserStatus({ id: reportedId, status: next }));
    void dispatch(fetchAdminReports(reportFilter));
    void dispatch(fetchAdminStats());
  };

  const headerTitle =
    activeSection === 'user-detail' && selectedUser
      ? selectedUser.name
      : NAV_ITEMS.find((item) => item.key === activeSection)?.label;

  return (
    <div className="flex min-h-screen" style={{ background: '#F5F7FA' }}>
      <div
        className="flex shrink-0 flex-col transition-all duration-300"
        style={{
          width: sidebarOpen ? '230px' : '68px',
          background: 'linear-gradient(180deg, #1a5fa0 0%, #2F76BB 60%, #61BCA6 100%)',
          minHeight: '100vh',
        }}
      >
        <div
          className="flex shrink-0 flex-col gap-1 px-4 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sidebarOpen ? '/logo-matchy-white.svg' : '/icon.svg'}
            alt="Matchy+"
            height={sidebarOpen ? 24 : 28}
            style={{
              height: sidebarOpen ? 24 : 28,
              width: sidebarOpen ? 'auto' : 28,
              objectFit: 'contain',
              alignSelf: sidebarOpen ? 'flex-start' : 'center',
            }}
          />
          {sidebarOpen && (
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Admin Panel</p>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
            const isActive =
              activeSection === key || (activeSection === 'user-detail' && key === 'users');
            const badge = key === 'reports' ? pendingReportCount : 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveSection(key);
                  dispatch(selectUser(null));
                }}
                className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.22)' : 'transparent',
                  color: 'white',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                }}
              >
                <span className="relative">
                  <Icon size={20} />
                  {badge > 0 && !sidebarOpen && (
                    <span
                      className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1"
                      style={{ background: '#E74C3C', fontSize: '9px', fontWeight: 800 }}
                    >
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                {sidebarOpen && (
                  <>
                    <span style={{ fontSize: '14px', fontWeight: isActive ? 700 : 500 }}>
                      {label}
                    </span>
                    {badge > 0 && (
                      <span
                        className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5"
                        style={{ background: '#E74C3C', fontSize: '11px', fontWeight: 800 }}
                      >
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        <div className="space-y-2 px-3 pb-5">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
            aria-label="Réduire le menu"
          >
            <ChevronDown
              size={18}
              style={{
                transform: sidebarOpen ? 'rotate(90deg)' : 'rotate(-90deg)',
                transition: 'transform 0.3s',
              }}
            />
            {sidebarOpen && <span style={{ fontSize: '13px' }}>Réduire</span>}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5"
            style={{
              background: 'rgba(231,76,60,0.2)',
              color: 'rgba(255,255,255,0.8)',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
            }}
          >
            <LogOut size={18} />
            {sidebarOpen && <span style={{ fontSize: '13px' }}>Déconnexion</span>}
          </button>
        </div>
      </div>

      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <div
          className="flex shrink-0 items-center justify-between px-6 py-4"
          style={{ background: 'white', borderBottom: '1px solid #F0F0F0' }}
        >
          <div>
            <p style={{ fontSize: '20px', fontWeight: 800, color: '#1A1A2E' }}>{headerTitle}</p>
            <p style={{ fontSize: '12px', color: '#888' }}>
              {activeSection === 'user-detail' && selectedUser ? (
                <span>
                  <button
                    type="button"
                    onClick={closeUserDetail}
                    className="cursor-pointer underline hover:text-[#2F76BB]"
                    style={{ background: 'none', border: 'none', padding: 0 }}
                  >
                    Utilisateurs
                  </button>{' '}
                  › {selectedUser.name}
                </span>
              ) : (
                `Matchy+ · ${new Date().toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}`
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {connectedMinutes !== null && (
              <span
                className="rounded-full px-2.5 py-1"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#E8F7F3',
                  color: '#61BCA6',
                }}
              >
                Connecté depuis {connectedMinutes}min
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setActiveSection('reports');
                dispatch(selectUser(null));
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: '#F5F7FA' }}
              aria-label="Notifications"
            >
              <Bell size={18} color="#555" />
              {pendingReportCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1"
                  style={{
                    background: '#E74C3C',
                    fontSize: '9px',
                    fontWeight: 800,
                    color: 'white',
                  }}
                >
                  {pendingReportCount > 9 ? '9+' : pendingReportCount}
                </span>
              )}
            </button>

            <div
              className="flex items-center gap-2 rounded-xl px-3 py-1.5"
              style={{ background: '#F5F7FA' }}
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: 'linear-gradient(135deg, #2F76BB, #61BCA6)' }}
              >
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'white' }}>
                  {admin?.name?.charAt(0) ?? 'A'}
                </span>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#353535' }}>
                  {admin?.name ?? 'admin'}
                </p>
                <p style={{ fontSize: '10px', color: '#888' }}>
                  {admin?.role ? (ROLE_LABELS[admin.role] ?? 'Admin') : 'Admin'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {(error ?? plansError ?? analyticsError ?? reportsError) && (
            <p
              className="mb-4 rounded-xl px-4 py-3"
              style={{
                background: '#FFF0F0',
                border: '1px solid #FFCCCC',
                color: '#E74C3C',
                fontSize: '13px',
              }}
            >
              {error ?? plansError ?? analyticsError ?? reportsError}
            </p>
          )}

          {activeSection === 'dashboard' && (
            <AdminDashboardSection
              stats={stats}
              analytics={analytics}
              users={users}
              onSelectUser={(user) => openUserDetail(user, 'dashboard')}
              onSeeAll={() => setActiveSection('users')}
            />
          )}

          {activeSection === 'users' && (
            <AdminUsersSection
              users={users}
              filters={filters}
              loading={loadingUsers}
              onFiltersChange={(changes) => dispatch(setFilters(changes))}
              onOpenUser={(user) => openUserDetail(user, 'users')}
              onDeleteUser={(user) => setUserToDelete(user)}
              onAddUser={() => setAddUserOpen(true)}
            />
          )}

          {activeSection === 'subscriptions' && (
            <AdminSubscriptionsSection stats={stats} plans={plans} analytics={analytics} />
          )}

          {activeSection === 'plans' && (
            <AdminPlansSection
              plans={plans}
              saving={savingPlan}
              savedAt={savedAt}
              onSave={handleSavePlan}
            />
          )}

          {activeSection === 'analytics' && <AdminAnalyticsSection analytics={analytics} />}

          {activeSection === 'reports' && (
            <AdminReportsSection
              groups={reportGroups}
              statusFilter={reportFilter}
              loading={loadingReports}
              onFilterChange={(status) => dispatch(setReportStatusFilter(status))}
              onSetStatus={handleSetReportStatus}
              onBanReported={handleBanReported}
            />
          )}

          {activeSection === 'settings' && (
            <AdminSettingsSection admin={admin} onLogout={handleLogout} />
          )}

          {activeSection === 'user-detail' && selectedUser && (
            <AdminUserDetail
              user={selectedUser}
              onClose={closeUserDetail}
              onSave={handleSave}
              onChangeStatus={handleChangeStatus}
              onDelete={() => handleDelete(selectedUser.id)}
            />
          )}
        </div>
      </div>

      <ConfirmDeletePopup
        isOpen={!!userToDelete}
        userName={userToDelete?.name ?? ''}
        onConfirm={() => {
          if (userToDelete) void handleDelete(userToDelete.id);
        }}
        onCancel={() => setUserToDelete(null)}
      />

      <AdminAddUserModal
        isOpen={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onCreated={() => void dispatch(fetchAdminStats())}
      />
    </div>
  );
}
