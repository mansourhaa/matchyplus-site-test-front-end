'use client';

import { ProfileDetailModal } from '@/components/matching/profile-detail-modal';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { fetchPublicProfile, selectProfile } from '@/features/profile/store/profile-slice';
import { useEffect } from 'react';

export function PublicProfileView({ userId }: { userId: string }) {
  const dispatch = useAppDispatch();
  const { viewedProfile, viewedProfileLoading, viewedProfileError } = useAppSelector(selectProfile);

  useEffect(() => {
    dispatch(fetchPublicProfile(userId));
  }, [dispatch, userId]);

  if (viewedProfileLoading && (!viewedProfile || viewedProfile.id !== userId)) {
    return (
      <div className="flex h-full items-center justify-center py-16 text-sm text-[#888]">
        Chargement du profil…
      </div>
    );
  }
  if (viewedProfileError) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-16 text-center text-sm text-[#888]">
        Ce profil est introuvable ou inaccessible.
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
