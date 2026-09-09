'use client';

import { AuthenticatedProfileAvatar } from '@/components/matchy/authenticated-profile-image';
import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import { fetchInbox, selectMessaging } from '@/features/messaging/store/messaging-slice';
import { Loader2, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ConversationsInbox() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const messaging = useAppSelector(selectMessaging);

  useEffect(() => {
    void dispatch(fetchInbox());
  }, [dispatch]);

  return (
    <div className="h-full overflow-y-auto" style={{ background: matchyBrand.bg }}>
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 md:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold" style={{ color: matchyBrand.textDark }}>
            {t('chat.inboxTitle')}
          </h1>
        </div>

        {messaging.inboxLoading && messaging.inbox.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin" color={matchyBrand.blue} />
          </div>
        ) : messaging.inbox.length === 0 ? (
          <p className="py-16 text-center text-sm font-medium text-[#64748B]">
            {t('chat.emptyInbox')}
          </p>
        ) : (
          <div className="space-y-2">
            {messaging.inbox.map((row) => {
              const name = row.peer?.name || t('chat.title');
              const preview =
                row.last_message?.message_type === 'VOICE'
                  ? t('chat.voicePreview')
                  : row.last_message?.content || t('chat.noMessages');
              return (
                <button
                  key={row.conversation_id}
                  type="button"
                  onClick={() => router.push(`/chat/${row.conversation_id}`)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left"
                  style={{ border: `1px solid ${matchyBrand.border}` }}
                >
                  <AuthenticatedProfileAvatar
                    image={row.peer?.image}
                    name={name}
                    sizeClassName="h-12 w-12"
                    roundedClassName="rounded-full"
                    textClassName="text-sm font-bold text-white"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-bold" style={{ color: matchyBrand.textDark }}>
                        {name}
                      </p>
                      {row.unread_count > 0 && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                          style={{ background: matchyBrand.blue }}
                        >
                          {row.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#777]">{preview}</p>
                  </div>
                  <MessageCircle size={16} color={matchyBrand.blue} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
