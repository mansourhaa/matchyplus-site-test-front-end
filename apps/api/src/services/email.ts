import { readFileSync } from 'node:fs';
import nodemailer, { Transporter } from 'nodemailer';

/**
 * Low-level SMTP transport for notification emails, ported from the reference project's
 * `emailService.js`. Configuration is read from the environment at the point of use so that
 * SMTP stays entirely optional: with no `SMTP_*` set, `hasSmtpConfig()` is false and callers
 * skip delivery rather than failing. No secret is ever hard-coded here.
 */

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

export type NotificationEmailInput = {
  to: string;
  subject: string;
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
};

/** Memoized across the process, as in the reference: one verified transporter, reused. */
let transporterPromise: Promise<Transporter> | null = null;

/** Test-only hook to reset the memoized transporter between cases. */
export function resetTransporterCache(): void {
  transporterPromise = null;
}

function appName(): string {
  return String(process.env.APP_NAME || 'Matchy+');
}

export function readSmtpConfig(): SmtpConfig {
  const host = String(process.env.SMTP_HOST || '').trim();
  const portRaw = String(process.env.SMTP_PORT || '587').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '');
  const from = String(process.env.SMTP_FROM || '').trim();

  const parsedPort = Number.parseInt(portRaw, 10);
  const port = Number.isFinite(parsedPort) ? parsedPort : 587;
  const secureByPort = port === 465;
  const secure = String(process.env.SMTP_SECURE || '')
    .trim()
    .toLowerCase();

  return {
    host,
    port,
    user,
    pass,
    from,
    secure: secure ? secure === 'true' || secure === '1' || secure === 'yes' : secureByPort,
  };
}

/** Pulls a bare email address out of `SMTP_FROM` (or `SMTP_USER`), accepting `Name <addr>` too. */
export function extractEmailAddress(value: string | undefined | null): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const bracketMatch = raw.match(/<([^<>]+)>/);
  const candidate = String(bracketMatch?.[1] || raw).trim();
  const emailMatch = candidate.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return emailMatch ? emailMatch[0] : null;
}

export function buildFromHeader(): { name: string; address: string } | null {
  const cfg = readSmtpConfig();
  const email = extractEmailAddress(cfg.from) || extractEmailAddress(cfg.user);
  if (!email) return null;

  const displayName = String(
    process.env.SMTP_FROM_NAME || process.env.APP_NAME || 'Matchy+',
  ).trim();
  return { name: displayName, address: email };
}

/** True only when every field required to actually send is present. Callers gate on this. */
export function hasSmtpConfig(): boolean {
  const cfg = readSmtpConfig();
  return Boolean(cfg.host && cfg.port && cfg.user && cfg.pass && buildFromHeader());
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Optional inline logo. Unlike the reference — which hard-coded a path into the frontend
 * package — the path comes from `SMTP_LOGO_PATH`; unset or unreadable yields no attachment,
 * exactly the graceful fallback the reference had when its file was missing.
 */
function loadLogoAttachment() {
  const logoPath = String(process.env.SMTP_LOGO_PATH || '').trim();
  if (!logoPath) return null;
  try {
    return {
      filename: 'logo',
      content: readFileSync(logoPath),
      cid: 'matchy-logo',
    };
  } catch {
    return null;
  }
}

export function buildNotificationEmailHtml({
  title,
  body,
  appName: brand,
}: {
  title: string;
  body: string;
  appName: string;
}): string {
  const safeTitle = escapeHtml(title);
  const safeBodyHtml = escapeHtml(body).replace(/\n/g, '<br/>');

  return `
<div style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border:1px solid #e9eef5;border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(47,118,187,0.08);">
      <div style="background:linear-gradient(135deg,#2F76BB,#61BCA6);padding:22px 24px;color:#ffffff;">
        <div style="display:flex;align-items:center;gap:14px;">
          <img src="cid:matchy-logo" alt="${escapeHtml(brand)}" style="display:block;width:44px;height:auto;" />
          <div style="padding-top:4px;">
            <div style="font-size:22px;font-weight:800;line-height:1.15;margin-top:4px;">${safeTitle}</div>
          </div>
        </div>
      </div>
      <div style="padding:24px;">
        <p style="margin:0;color:#1f2937;font-size:15px;line-height:1.7;">${safeBodyHtml}</p>
        <div style="margin-top:22px;padding-top:18px;border-top:1px solid #eef2f7;color:#6b7280;font-size:12px;line-height:1.6;">
          Vous recevez cet e-mail parce que les notifications par e-mail sont activées sur votre compte ${escapeHtml(brand)}.
        </div>
      </div>
    </div>
  </div>
</div>
  `.trim();
}

async function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const cfg = readSmtpConfig();
      if (!cfg.host || !cfg.user || !cfg.pass) {
        throw new Error(
          'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.',
        );
      }

      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.pass },
      });

      await transporter.verify();
      return transporter;
    })();
  }

  try {
    return await transporterPromise;
  } catch (error) {
    // Reset so a transient failure (e.g. verify) does not poison every later send.
    transporterPromise = null;
    throw error;
  }
}

/**
 * Transport-level send used by the notification business layer. Kept as a class so it matches
 * the project's service convention and can be swapped for a fake in tests without any real SMTP.
 */
export class EmailService {
  hasSmtpConfig(): boolean {
    return hasSmtpConfig();
  }

  async sendNotificationEmail(input: NotificationEmailInput): Promise<void> {
    const from = buildFromHeader();
    if (!from) {
      throw new Error('SMTP_FROM must contain a valid email address.');
    }

    const transporter = await getTransporter();
    const brand = appName();
    const logo = loadLogoAttachment();

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: `${input.title}\n\n${input.body}\n\n${input.actionUrl || ''}`.trim(),
      html: buildNotificationEmailHtml({ title: input.title, body: input.body, appName: brand }),
      attachments: logo ? [logo] : [],
    });
  }
}
