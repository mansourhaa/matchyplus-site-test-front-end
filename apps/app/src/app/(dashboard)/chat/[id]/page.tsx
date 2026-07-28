'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import { selectMatching } from '@/features/matching/store/matching-slice';
import { toast } from '@/lib/toast';
import { Send } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function ChatPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const matching = useAppSelector(selectMatching);
  const match = matching.matches.find((m) => m.match_id === params.id);
  const name = match?.profile?.name || t('chat.title');
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: matchyBrand.bg }}>
      <div
        className="flex items-center gap-3 px-4 py-3 md:px-6"
        style={{ background: 'white', borderBottom: `1px solid ${matchyBrand.border}` }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white"
          style={{ background: matchyBrand.gradient135 }}
        >
          {match?.profile?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={match.profile.image} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold" style={{ color: matchyBrand.textDark }}>
            {name}
          </p>
          <p className="text-xs text-[#888]">{t('settings.comingSoon')}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="max-w-sm text-sm leading-relaxed text-[#777]">{t('chat.empty')}</p>
      </div>

      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: 'white', borderTop: `1px solid ${matchyBrand.border}` }}
      >
        <input
          disabled
          placeholder={t('chat.placeholder')}
          className="flex-1 rounded-2xl px-4 py-3 text-sm opacity-70"
          style={{ background: matchyBrand.bg, border: `1px solid ${matchyBrand.border}` }}
        />
        <button
          type="button"
          onClick={() => toast.message(t('settings.comingSoon'))}
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
          style={{ background: matchyBrand.gradient }}
          aria-label={t('chat.send')}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
