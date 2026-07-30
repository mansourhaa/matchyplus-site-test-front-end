'use client';

import { PublicProfileView } from '@/components/profile/public-profile-view';
import { useParams } from 'next/navigation';

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="h-full overflow-y-auto">
      <PublicProfileView userId={params.id} />
    </div>
  );
}
