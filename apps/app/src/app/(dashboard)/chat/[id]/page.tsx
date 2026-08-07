'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { ChatThread } from '@/components/messaging/chat-thread';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useParams } from 'next/navigation';

export default function ChatPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const conversationId = params.id;

  if (!conversationId) {
    return (
      <div
        className="flex h-full items-center justify-center px-6 text-center text-sm text-[#777]"
        style={{ background: matchyBrand.bg }}
      >
        {t('chat.empty')}
      </div>
    );
  }

  return <ChatThread conversationId={conversationId} />;
}
