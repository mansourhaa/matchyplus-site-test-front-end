'use client';

import { StubScreen } from '@/components/matchy/stub-screen';
import { useI18n } from '@/features/i18n/i18n-provider';
import { QrCode } from 'lucide-react';

export default function QrCodePage() {
  const { t } = useI18n();
  return (
    <StubScreen
      title={t('settings.qrCode')}
      description="Share your Matchy+ profile with a QR code."
    >
      <div className="mx-auto mt-6 flex h-40 w-40 items-center justify-center rounded-3xl bg-[#F5F7FA]">
        <QrCode size={72} color="#2F76BB" />
      </div>
    </StubScreen>
  );
}
