'use client';

import { AuthenticatedProfileAvatar } from '@/components/matchy/authenticated-profile-image';
import { useI18n } from '@/features/i18n/i18n-provider';
import { generateIcebreakers, getShortDisplayName } from '@/features/messaging/lib/icebreakers';
import type { ConversationPeer } from '@/features/messaging/types';
import { useMemo } from 'react';

type ChatIcebreakersProps = {
  peer: ConversationPeer | null | undefined;
  onSelect: (message: string) => void;
  disabled?: boolean;
};

export function ChatIcebreakers({ peer, onSelect, disabled = false }: ChatIcebreakersProps) {
  const { t, locale, dir } = useI18n();

  const displayName = useMemo(
    () => getShortDisplayName(peer?.name) || peer?.name || '',
    [peer?.name],
  );
  const suggestions = useMemo(() => generateIcebreakers(peer, locale), [peer, locale]);

  const title = displayName
    ? t('chat.icebreakers.title', { name: displayName })
    : t('chat.icebreakers.fallbackTitle');

  return (
    <div
      dir={dir}
      className="mx-auto flex w-full max-w-lg flex-col items-center justify-center px-4 py-6 text-center"
    >
      {/* Peer Avatar with Teal Ring */}
      <div className="relative mb-4 flex items-center justify-center">
        <div className="rounded-full p-1 shadow-sm" style={{ border: '3px solid #61BCA6' }}>
          <AuthenticatedProfileAvatar
            image={peer?.image}
            name={peer?.name || 'Matchy'}
            sizeClassName="h-20 w-20 sm:h-24 sm:w-24"
            roundedClassName="rounded-full"
            textClassName="text-xl sm:text-2xl font-bold text-white"
          />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-base font-extrabold tracking-tight text-[#1E293B] sm:text-lg">{title}</h2>

      {/* Subtitle */}
      <p className="mt-1 text-xs font-medium text-[#64748B] sm:text-sm">
        {t('chat.icebreakers.subtitle')}
      </p>

      {/* Message Recommendation Pill Buttons */}
      <div className="mt-6 w-full max-w-md space-y-3">
        {suggestions.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item.text)}
            className="w-full rounded-full bg-white px-5 py-3 text-center text-xs font-semibold text-[#2F76BB] transition-all duration-150 hover:border-[#2F76BB] hover:bg-[#F4F9FF] hover:shadow-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:py-3.5 sm:text-[13px]"
            style={{
              border: '1.5px solid #D6E8FA',
              boxShadow: '0 2px 8px rgba(47, 118, 187, 0.04)',
            }}
          >
            {item.text}
          </button>
        ))}
      </div>
    </div>
  );
}
