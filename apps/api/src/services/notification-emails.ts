import { PrismaClient } from '@saas-boilerplate/types';

import {
  NotificationEmailKind,
  NotificationEmailOptions,
  NotificationEmailPayload,
} from '../types/notification-emails.js';
import { EmailService } from './email.js';

/**
 * Business layer for notification emails, ported from the reference project's
 * `notificationEmailService.js`. It decides *whether* an email may be sent — SMTP configured,
 * the recipient has an address, and their `notify_email` preference is on — and *what* it says
 * (the four event kinds), then delegates the actual delivery to {@link EmailService}.
 *
 * Delivery is deliberately best-effort at the call sites (fire-and-forget with a logged warning),
 * exactly as in the reference: a mail failure must never break the action that triggered it.
 */

type NotificationEmailsServiceDeps = {
  prisma: PrismaClient;
  /** Injected so tests can supply a fake and never touch a real SMTP server. */
  emailService?: EmailService;
};

/**
 * Base URL for email CTAs. Precedence: `APP_URL` → `FRONTEND_URL` → `PUBLIC_APP_URL`.
 * Falls back to the Next.js app port in this monorepo (not the legacy Vite `:5173`).
 */
function frontendBaseUrl(): string {
  const candidates = [process.env.APP_URL, process.env.FRONTEND_URL, process.env.PUBLIC_APP_URL];
  for (const candidate of candidates) {
    const value = String(candidate || '')
      .trim()
      .replace(/\/+$/, '');
    if (value) return value;
  }
  return 'http://localhost:3000';
}

export function buildNotificationEmailPayload({
  kind,
  actorName,
  extraText,
}: NotificationEmailOptions): NotificationEmailPayload {
  const baseUrl = frontendBaseUrl();

  switch (kind) {
    case 'message':
      return {
        subject: 'Nouveau message sur Matchy+',
        title: 'Nouveau message',
        body: `${actorName || "Quelqu'un"} vous a envoyé un message sur Matchy+.`,
        actionLabel: 'Ouvrir la messagerie',
        // App inbox lives under /matches (there is no /messages page).
        actionUrl: `${baseUrl}/matches`,
      };
    case 'match':
      return {
        subject: 'Nouveau match sur Matchy+',
        title: 'Nouveau match',
        body: `${actorName || 'Un contact'} a créé un nouveau match avec vous sur Matchy+.`,
        actionLabel: 'Voir les matches',
        actionUrl: `${baseUrl}/matches`,
      };
    case 'match_request':
      return {
        subject: 'Nouvelle demande de match sur Matchy+',
        title: 'Demande de match',
        body: `${actorName || "Quelqu'un"} vous a envoyé une demande de match sur Matchy+.`,
        actionLabel: 'Ouvrir la découverte',
        actionUrl: `${baseUrl}/discover`,
      };
    case 'profile_view':
      return {
        subject: 'Vue de profil sur Matchy+',
        title: 'Vue de profil',
        body: "Quelqu'un a consulté votre profil sur Matchy+.",
        actionLabel: 'Ouvrir les notifications',
        actionUrl: `${baseUrl}/notifications`,
      };
    case 'new_profile':
    default:
      return {
        subject: 'Nouveau profil sur Matchy+',
        title: 'Nouveau profil',
        body: extraText || `${actorName || 'Un utilisateur'} a rejoint Matchy+.`,
        actionLabel: 'Ouvrir les notifications',
        actionUrl: `${baseUrl}/notifications`,
      };
  }
}

export class NotificationEmailsService {
  private readonly prisma: PrismaClient;
  private readonly emailService: EmailService;

  constructor(deps: NotificationEmailsServiceDeps) {
    this.prisma = deps.prisma;
    this.emailService = deps.emailService ?? new EmailService();
  }

  /** Whether the user opted in to email notifications. Read-only; never mutates the preference. */
  async isNotificationEmailEnabledForUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notify_email: true },
    });
    return Boolean(user?.notify_email);
  }

  /**
   * Send the email for `kind` to `userId`, but only when SMTP is configured, the user exists
   * with an address, and their `notify_email` preference is on. Returns whether an email was
   * actually sent, mirroring the reference's boolean return.
   */
  async sendNotificationEmailToUser(
    userId: string,
    options: NotificationEmailOptions,
  ): Promise<boolean> {
    if (!this.emailService.hasSmtpConfig()) return false;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, notify_email: true },
    });

    if (!user || !user.email || !user.notify_email) return false;

    const payload = buildNotificationEmailPayload({
      kind: options.kind,
      actorName: options.actorName,
      extraText: options.extraText,
    });

    await this.emailService.sendNotificationEmail({
      to: user.email,
      subject: payload.subject,
      title: payload.title,
      body: payload.body,
      actionLabel: payload.actionLabel,
      actionUrl: payload.actionUrl,
    });

    return true;
  }
}

export type { NotificationEmailKind };
