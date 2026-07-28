'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { StubScreen } from '@/components/matchy/stub-screen';
import { useI18n } from '@/features/i18n/i18n-provider';

export default function EditProfilePage() {
  const { t } = useI18n();

  return (
    <StubScreen
      title={t('settings.editProfile')}
      description="Update your public profile when write APIs are available."
    >
      <div className="mt-4 space-y-3">
        {['First name', 'Last name', 'Headline', 'Bio'].map((label) => (
          <div key={label}>
            <label className="mb-1 block text-xs font-bold text-[#888]">{label}</label>
            <input
              disabled
              className="w-full rounded-xl px-3 py-2.5 text-sm opacity-70"
              style={{
                background: matchyBrand.bg,
                border: `1px solid ${matchyBrand.borderStrong}`,
                color: matchyBrand.textDark,
              }}
              placeholder={label}
            />
          </div>
        ))}
      </div>
    </StubScreen>
  );
}
