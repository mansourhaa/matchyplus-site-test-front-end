import type { Locale } from '@/features/i18n/messages';
import type { ConversationPeer } from '@/features/messaging/types';

export type IcebreakerItem = {
  id: string;
  category: 'services' | 'availability' | 'rates' | 'collab' | 'greeting';
  text: string;
};

export function getShortDisplayName(fullName?: string | null): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!;
  const first = parts[0]!;
  const lastInitial = parts[parts.length - 1]!.charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

export function getFirstName(fullName?: string | null): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const first = trimmed.split(/\s+/)[0];
  return first || trimmed;
}

export function generateIcebreakers(
  peer: ConversationPeer | null | undefined,
  locale: Locale = 'fr',
): IcebreakerItem[] {
  const name = getFirstName(peer?.name);
  const targetName = name || (locale === 'en' ? 'there' : '');

  if (locale === 'en') {
    return [
      {
        id: 'services',
        category: 'services',
        text: targetName
          ? `Hi ${targetName}, I'm interested in your services 😊`
          : "Hi, I'm interested in your services 😊",
      },
      {
        id: 'availability',
        category: 'availability',
        text: 'What is your availability this week?',
      },
      {
        id: 'rates',
        category: 'rates',
        text: 'Could you give me more details about your rates?',
      },
    ];
  }

  if (locale === 'ar') {
    return [
      {
        id: 'services',
        category: 'services',
        text: targetName
          ? `مرحباً ${targetName}، أنا مهتم بخدماتك 😊`
          : 'مرحباً، أنا مهتم بخدماتك 😊',
      },
      {
        id: 'availability',
        category: 'availability',
        text: 'ما هي أوقات تواجدك هذا الأسبوع؟',
      },
      {
        id: 'rates',
        category: 'rates',
        text: 'هل يمكنك إعطائي تفاصيل أكثر عن أسعارك؟',
      },
    ];
  }

  // Default French
  return [
    {
      id: 'services',
      category: 'services',
      text: targetName
        ? `Bonjour ${targetName}, je suis intéressé(e) par vos services 😊`
        : 'Bonjour, je suis intéressé(e) par vos services 😊',
    },
    {
      id: 'availability',
      category: 'availability',
      text: 'Quelles sont vos disponibilités cette semaine ?',
    },
    {
      id: 'rates',
      category: 'rates',
      text: 'Pouvez-vous me donner plus de détails sur vos tarifs ?',
    },
  ];
}
