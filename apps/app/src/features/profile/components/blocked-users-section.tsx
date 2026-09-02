'use client';

import { AuthenticatedProfileAvatar } from '@/components/matchy/authenticated-profile-image';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  fetchBlockedUsers,
  selectProfile,
  unblockProfile,
} from '@/features/profile/store/profile-slice';
import type { BlockedUser } from '@/features/profile/types';
import { toast } from '@/lib/toast';
import { Ban, CheckCircle, Loader2, ShieldCheck, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';

export function BlockedUsersSection() {
  const { t, locale, dir } = useI18n();
  const dispatch = useAppDispatch();
  const { blockedUsers, blockedUsersLoading, unblockingId } = useAppSelector(selectProfile);
  const [confirmTarget, setConfirmTarget] = useState<BlockedUser | null>(null);

  useEffect(() => {
    dispatch(fetchBlockedUsers());
  }, [dispatch]);

  const handleUnblock = async () => {
    if (!confirmTarget) return;
    try {
      await dispatch(unblockProfile(confirmTarget.id)).unwrap();
      toast.success(t('settings.unblockSuccess', { name: confirmTarget.name }));
      setConfirmTarget(null);
    } catch {
      toast.error(t('settings.unblockError'));
    }
  };

  return (
    <section
      className="space-y-4 rounded-3xl border border-[#EAEAEA] bg-white p-6 shadow-sm"
      dir={dir}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-[#DC2626]">
          <UserX size={20} />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-[#1E293B]">
            {t('settings.blockedUsersTitle')}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-[#64748B]">
            {t('settings.blockedUsersSubtitle')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="pt-2">
        {blockedUsersLoading && blockedUsers.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-[#94A3B8]">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <p className="py-4 text-center text-xs font-medium text-[#64748B]">
            {t('settings.blockedUsersEmpty')}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {blockedUsers.map((user) => {
              const role = user.service_type || user.job || user.activity_sector || user.city;
              const isUnblocking = unblockingId === user.id;

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <AuthenticatedProfileAvatar
                      image={user.image}
                      name={user.name}
                      sizeClassName="h-10 w-10 shrink-0"
                      roundedClassName="rounded-full"
                      textClassName="text-sm font-bold text-white"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#1E293B]">{user.name}</p>
                      {role && <p className="truncate text-[11px] text-[#64748B]">{role}</p>}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isUnblocking}
                    onClick={() => setConfirmTarget(user)}
                    className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-[#1E293B] shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isUnblocking ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      t('settings.unblock')
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="animate-in fade-in zoom-in-95 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#2F76BB]">
              <CheckCircle size={28} />
            </div>
            <h3 className="text-center text-base font-extrabold text-[#1E293B]">
              {t('settings.unblockConfirmTitle', { name: confirmTarget.name })}
            </h3>
            <p className="mt-2 text-center text-xs leading-relaxed text-[#64748B]">
              {t('settings.unblockConfirmDesc', { name: confirmTarget.name })}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="flex-1 rounded-2xl py-2.5 text-xs font-bold text-[#64748B] transition-colors hover:bg-slate-100"
                style={{ border: '1px solid #E2E8F0' }}
              >
                {t('common.cancel') || 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleUnblock}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#2F76BB] py-2.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-95"
              >
                {t('settings.unblock')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
