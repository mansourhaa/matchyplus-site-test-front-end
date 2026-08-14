'use client';

import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { useI18n } from '@/features/i18n/i18n-provider';
import { ProfileDetailModal } from '@/features/matching/components/profile-detail-modal';
import { fetchPublicProfile, selectProfile } from '@/features/profile/store/profile-slice';
import { useEffect } from 'react';

export function PublicProfileView({ userId }: { userId: string }) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const { viewedProfile, viewedProfileLoading, viewedProfileError } = useAppSelector(selectProfile);

  useEffect(() => {
    dispatch(fetchPublicProfile(userId));
  }, [dispatch, userId]);

  if (viewedProfileLoading && (!viewedProfile || viewedProfile.id !== userId)) {
    return (
      <div className="flex h-full items-center justify-center py-16 text-sm text-[#888]">
        {t('profile.loadingProfile')}
      </div>
    );
  }
  if (viewedProfileError) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-16 text-center text-sm text-[#888]">
        {t('profile.notFound')}
      </div>
    );
  }
  if (!viewedProfile || viewedProfile.id !== userId) return null;

  return (
    <ProfileDetailModal
      profile={{
        ...viewedProfile,
        rating: viewedProfile.rating ?? 0,
      }}
      onClose={() => {
        if (window.history.length > 1) window.history.back();
        else window.location.assign('/home');
      }}
    />
  );
}
