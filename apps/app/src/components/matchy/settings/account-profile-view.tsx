'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { fetchCurrentUser, selectAuth } from '@/features/auth/store/auth-slice';
import type { AuthUser } from '@/features/auth/types';
import { useI18n } from '@/features/i18n/i18n-provider';
import { PHONE_COUNTRIES } from '@/lib/phone-countries';
import { Check, ChevronRight, Lock, Mail, Phone, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#EA4335"
        d="M9 7.2v3.6h5.1c-.2 1.2-1.5 3.5-5.1 3.5-3.1 0-5.6-2.5-5.6-5.6S5.9 3.1 9 3.1c1.8 0 2.9.7 3.6 1.4l2.4-2.4C13.5.8 11.4 0 9 0 4 0 0 4 0 9s4 9 9 9c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.2-1.5H9z"
      />
    </svg>
  );
}

function LinkedInGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect width="20" height="20" rx="4" fill="#007BB5" />
      <rect x="3" y="8" width="3.5" height="9" fill="white" />
      <circle cx="4.75" cy="5" r="1.75" fill="white" />
      <path
        d="M8.5 17V8h3.3v1.2h.1c.5-.9 1.6-1.5 3-1.5 3.2 0 3.8 2.1 3.8 4.8V17h-3.5v-3.9c0-1-.1-2.2-1.4-2.2-1.4 0-1.6 1.1-1.6 2.1V17H8.5z"
        fill="white"
      />
    </svg>
  );
}

function normalizeProvider(raw: string | undefined | null): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function isSocialProvider(provider: string): boolean {
  return (
    provider === 'google' ||
    provider === 'linkedin' ||
    provider.includes('google') ||
    provider.includes('linkedin')
  );
}

function isPhoneProvider(provider: string): boolean {
  return (
    provider === 'phone' ||
    provider.includes('phone') ||
    provider.includes('otp') ||
    provider === 'local' ||
    provider === 'credentials'
  );
}

/** Phone-auth accounts can change password; social-only accounts cannot. */
function canManagePassword(user: AuthUser | null): boolean {
  const provider = normalizeProvider(user?.auth_provider);
  if (isPhoneProvider(provider)) return true;
  if (isSocialProvider(provider)) return false;
  return Boolean(user?.phone);
}

function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  const match = PHONE_COUNTRIES.find((c) => phone.startsWith(c.dialCode));
  if (!match) return phone;
  const national = phone.slice(match.dialCode.length);
  return `${match.dialCode} ${national}`.trim();
}

function StatusRow({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-3 border-t border-[#F0F0F0] px-4 py-3.5">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: '#F3F6F9' }}
      >
        {icon}
      </div>
      <span
        className="flex-1 text-left"
        style={{ fontSize: 14, fontWeight: 600, color: '#303030' }}
      >
        {label}
      </span>
      <Check size={16} color="#2C9C84" />
    </div>
  );
}

function ActionRow({
  label,
  color,
  bg,
  icon: Icon,
  customIcon,
  href,
  onClick,
  disabled,
}: {
  label: string;
  color: string;
  bg: string;
  icon?: typeof ShieldCheck;
  customIcon?: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const ResolvedIcon = Icon ?? ShieldCheck;
  const content = (
    <>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: bg }}
      >
        {customIcon || <ResolvedIcon size={16} color={color} />}
      </div>
      <span
        className="flex-1 text-left"
        style={{ fontSize: 14, fontWeight: 600, color: '#303030' }}
      >
        {label}
      </span>
      <ChevronRight size={16} color="#C0C0C0" />
    </>
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className="flex w-full items-center gap-3 border-t border-[#F0F0F0] px-4 py-3.5 hover:bg-[#F9FAFC]"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 border-t border-[#F0F0F0] px-4 py-3.5 hover:bg-[#F9FAFC] disabled:opacity-60"
    >
      {content}
    </button>
  );
}

export function AccountProfileView() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(selectAuth);
  const searchParams = useSearchParams();
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    // Only re-probe after an OAuth link round-trip; bootstrap already loaded the user.
    if (!searchParams.get('linked')) return;
    void dispatch(fetchCurrentUser());
  }, [dispatch, searchParams]);

  useEffect(() => {
    const linked = searchParams.get('linked');
    if (!linked) return;
    if (linked === 'google') {
      setBanner(
        locale === 'en'
          ? 'Google account linked successfully.'
          : locale === 'ar'
            ? 'تم ربط حساب Google بنجاح.'
            : 'Compte Google lié avec succès.',
      );
    } else if (linked === 'linkedin') {
      setBanner(
        locale === 'en'
          ? 'LinkedIn account linked successfully.'
          : locale === 'ar'
            ? 'تم ربط حساب LinkedIn بنجاح.'
            : 'Compte LinkedIn lié avec succès.',
      );
    }
  }, [locale, searchParams]);

  const provider = normalizeProvider(user?.auth_provider);
  const isSocial = isSocialProvider(provider);
  const canPassword = canManagePassword(user);
  const googleLinked = Boolean(user?.google_linked || provider === 'google');
  const linkedinLinked = Boolean(user?.linkedin_linked || provider === 'linkedin');
  const formattedPhone = useMemo(() => formatPhoneDisplay(user?.phone), [user?.phone]);

  const authLabel =
    provider === 'google'
      ? locale === 'en'
        ? 'Connected with Google'
        : locale === 'ar'
          ? 'متصل عبر Google'
          : 'Connecté(e) avec Google'
      : provider === 'linkedin'
        ? locale === 'en'
          ? 'Connected with LinkedIn'
          : locale === 'ar'
            ? 'متصل عبر LinkedIn'
            : 'Connecté(e) avec LinkedIn'
        : locale === 'en'
          ? 'Connected with phone number'
          : locale === 'ar'
            ? 'متصل عبر رقم الهاتف'
            : 'Connecté(e) avec un numéro de téléphone';

  const syncLabel =
    provider === 'google' && linkedinLinked
      ? locale === 'en'
        ? 'Also synced with LinkedIn'
        : locale === 'ar'
          ? 'متزامن أيضًا مع LinkedIn'
          : 'Synchronisé aussi avec LinkedIn'
      : provider === 'linkedin' && googleLinked
        ? locale === 'en'
          ? 'Also synced with Google'
          : locale === 'ar'
            ? 'متزامن أيضًا مع Google'
            : 'Synchronisé aussi avec Google'
        : googleLinked && linkedinLinked
          ? locale === 'en'
            ? 'Google and LinkedIn linked'
            : locale === 'ar'
              ? 'Google و LinkedIn مرتبطان'
              : 'Google et LinkedIn liés'
          : null;

  const onLinkSocial = (which: 'google' | 'linkedin') => {
    // Full-page navigation to authenticated link-intent start (sets oauth_link_intent cookie).
    // Do not use login OAuth — that would mint a new session via exchange.
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
    window.location.href = `${base}/auth/oauth/${which}/link`;
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: matchyBrand.bg }}>
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-6 md:px-8">
        <h1 className="text-xl font-extrabold" style={{ color: matchyBrand.textDark }}>
          {t('settings.account')}
        </h1>

        {banner && (
          <div
            className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3"
            style={{ border: '1px solid #C8EDE3' }}
          >
            <Check size={16} color="#2C9C84" />
            <p style={{ fontSize: 13, color: '#2C9C84', fontWeight: 600 }}>{banner}</p>
          </div>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: '1px solid #EEF0F3' }}>
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: '#E8F7F3' }}
            >
              <ShieldCheck size={18} color="#2C9C84" />
            </div>
            <div className="flex-1 px-1">
              <p style={{ fontSize: 12, color: '#7F8A9A', fontWeight: 700 }}>{authLabel}</p>
              <hr className="my-2 h-px border-0 bg-[#F0F0F0]" />
              {syncLabel && (
                <p style={{ fontSize: 11, color: '#2C9C84', fontWeight: 600 }}>{syncLabel}</p>
              )}
              {user?.phone_verified && user.phone && (
                <p style={{ fontSize: 11, color: '#2C9C84', fontWeight: 600, marginTop: 4 }}>
                  {locale === 'en'
                    ? 'Phone verified'
                    : locale === 'ar'
                      ? 'الهاتف مُتحقق'
                      : 'Téléphone vérifié'}
                </p>
              )}
              {user?.email_verified && user.email && (
                <p style={{ fontSize: 11, color: '#2C9C84', fontWeight: 600, marginTop: 2 }}>
                  {locale === 'en'
                    ? 'Email verified'
                    : locale === 'ar'
                      ? 'البريد مُتحقق'
                      : 'E-mail vérifié'}
                </p>
              )}
            </div>
          </div>
        </div>

        {user && (
          <div
            className="overflow-hidden rounded-2xl bg-white"
            style={{ border: '1px solid #EEF0F3' }}
          >
            {user.email && (
              <div className="border-b border-[#F0F0F0] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Mail size={16} color="#2F76BB" />
                  <p style={{ fontSize: 12, color: '#7F8A9A', fontWeight: 700 }}>
                    {locale === 'ar' ? 'البريد الالكتروني' : 'Email'}
                  </p>
                  {user.email_verified && <Check size={14} color="#2C9C84" />}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: '#253044',
                    marginTop: 2,
                    wordBreak: 'break-all',
                  }}
                >
                  {user.email}
                </p>
              </div>
            )}

            {user.phone && (
              <div className="border-b border-[#F0F0F0] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Phone size={16} color="#61BCA6" />
                  <p style={{ fontSize: 12, color: '#7F8A9A', fontWeight: 700 }}>
                    {locale === 'en' ? 'Phone' : locale === 'ar' ? 'رقم الهاتف' : 'Téléphone'}
                  </p>
                  {user.phone_verified && <Check size={14} color="#2C9C84" />}
                </div>
                <p style={{ fontSize: 13, color: '#253044', marginTop: 2 }}>{formattedPhone}</p>
              </div>
            )}

            {isSocial && !user.phone && (
              <ActionRow
                label={
                  locale === 'en'
                    ? 'Add a phone number'
                    : locale === 'ar'
                      ? 'إضافة رقم هاتف'
                      : 'Ajouter un numéro de téléphone'
                }
                color="#61BCA6"
                bg="#E8F7F3"
                icon={Phone}
                href="/settings/add-phone-number"
              />
            )}

            {canPassword && (
              <ActionRow
                label={
                  locale === 'en'
                    ? 'Change password'
                    : locale === 'ar'
                      ? 'تغيير كلمة المرور'
                      : 'Changer le mot de passe'
                }
                color="#2F76BB"
                bg="#E8F0FA"
                icon={Lock}
                href="/settings/password"
              />
            )}

            {!googleLinked ? (
              <ActionRow
                label={
                  locale === 'en'
                    ? 'Link Google account'
                    : locale === 'ar'
                      ? 'ربط حساب Google'
                      : 'Lier un compte Google'
                }
                color="#EA4335"
                bg="#FDECEA"
                customIcon={<GoogleIcon />}
                onClick={() => onLinkSocial('google')}
              />
            ) : (
              <StatusRow
                label={
                  locale === 'en'
                    ? 'Google linked'
                    : locale === 'ar'
                      ? 'Google مرتبط'
                      : 'Google lié'
                }
                icon={<GoogleIcon />}
              />
            )}

            {!linkedinLinked ? (
              <ActionRow
                label={
                  locale === 'en'
                    ? 'Link LinkedIn account'
                    : locale === 'ar'
                      ? 'ربط حساب LinkedIn'
                      : 'Lier un compte LinkedIn'
                }
                color="#007BB5"
                bg="#E8F4FB"
                customIcon={<LinkedInGlyph />}
                onClick={() => onLinkSocial('linkedin')}
              />
            ) : (
              <StatusRow
                label={
                  locale === 'en'
                    ? 'LinkedIn linked'
                    : locale === 'ar'
                      ? 'LinkedIn مرتبط'
                      : 'LinkedIn lié'
                }
                icon={<LinkedInGlyph />}
              />
            )}

            {!user.email && (
              <p className="px-4 py-3" style={{ fontSize: 12, color: '#7F8A9A' }}>
                {locale === 'en'
                  ? 'Email comes from Google or LinkedIn — link one of these accounts to add it.'
                  : locale === 'ar'
                    ? 'البريد يأتي من Google أو LinkedIn — اربط أحد الحسابين لإضافته.'
                    : "L'e-mail provient de Google ou LinkedIn — liez l'un de ces comptes pour l'ajouter."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
