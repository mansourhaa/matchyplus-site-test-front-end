import { Coffee, type LucideIcon, Phone, Video } from 'lucide-react';

import type { UserPlan, UserStatus } from './types';

export const PLAN_LABEL: Record<UserPlan, string> = {
  FREE: 'Gratuit',
  PREMIUM: 'Premium',
  PREMIUM_PLUS: 'Premium+',
};

export const PLAN_COLOR: Record<UserPlan, string> = {
  FREE: '#888',
  PREMIUM: '#2F76BB',
  PREMIUM_PLUS: '#F5A623',
};

export const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  BANNED: 'Banni',
};

export const STATUS_COLOR: Record<UserStatus, string> = {
  ACTIVE: '#61BCA6',
  INACTIVE: '#F5A623',
  BANNED: '#E74C3C',
};

export const CONTACT_ICONS: Record<string, LucideIcon> = {
  video: Video,
  café: Coffee,
  call: Phone,
};

export const CONTACT_COLORS: Record<string, string> = {
  video: '#2F76BB',
  café: '#61BCA6',
  call: '#F5A623',
};

export const CONTACT_LABELS: Record<string, string> = {
  video: 'Vidéo',
  café: 'Café',
  call: 'Téléphone',
};
