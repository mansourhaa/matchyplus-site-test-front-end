'use client';

import { QrCodeView } from '@/features/profile/components/qr-code-view';

export default function QrCodePage() {
  return (
    <div className="h-full overflow-y-auto bg-[#F5F7FA] px-4 py-4 pb-8 md:px-8">
      <QrCodeView />
    </div>
  );
}
