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

  async sendContactMessage(input: {
    type?: 'contact' | 'partner' | 'custom';
    name: string;
    email: string;
    phone?: string;
    requestText?: string;
    message?: string;
    activity?: string;
    city?: string;
    subject?: string;
  }): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
    try {
      const destination = process.env.CONTACT_EMAIL || 'Contact@matchyplus.com';
      const isPartner = input.type === 'partner';
      const subject =
        input.subject ||
        (isPartner
          ? `[Partenaire Matchy+] Demande de ${input.name}`
          : `[Contact Matchy+] Nouveau message de ${input.name}`);

      const headerTitle = isPartner
        ? 'Nouvelle demande de partenariat Matchy+'
        : 'Nouveau message de contact Matchy+';
      const headerColor = isPartner ? '#49b8ad' : '#2d79be';

      const senderName = escapeHtml(input.name);
      const senderEmail = escapeHtml(input.email);
      const senderPhone = escapeHtml(input.phone || 'Non spécifié');
      const contentText = escapeHtml(
        input.requestText || input.message || 'Aucun message fourni.',
      ).replace(/\n/g, '<br/>');

      const extraRows: string[] = [];
      if (input.activity) {
        extraRows.push(`
          <tr>
            <td style="padding:10px 14px;font-weight:bold;color:#4b5563;background:#f9fafb;width:160px;border-bottom:1px solid #e5e7eb;">Domaine / Métier</td>
            <td style="padding:10px 14px;color:#111827;border-bottom:1px solid #e5e7eb;">${escapeHtml(input.activity)}</td>
          </tr>
        `);
      }
      if (input.city) {
        extraRows.push(`
          <tr>
            <td style="padding:10px 14px;font-weight:bold;color:#4b5563;background:#f9fafb;width:160px;border-bottom:1px solid #e5e7eb;">Ville / Région</td>
            <td style="padding:10px 14px;color:#111827;border-bottom:1px solid #e5e7eb;">${escapeHtml(input.city)}</td>
          </tr>
        `);
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(headerTitle)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:620px;margin:30px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg, ${headerColor}, #27344a);padding:28px 24px;color:#ffffff;text-align:center;">
      <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;">Matchy+</div>
      <div style="font-size:16px;font-weight:600;margin-top:6px;opacity:0.95;">${escapeHtml(headerTitle)}</div>
    </div>
    <div style="padding:28px 24px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:10px 14px;font-weight:bold;color:#4b5563;background:#f9fafb;width:160px;border-bottom:1px solid #e5e7eb;">Nom & Prénom</td>
          <td style="padding:10px 14px;color:#111827;font-weight:600;border-bottom:1px solid #e5e7eb;">${senderName}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:bold;color:#4b5563;background:#f9fafb;width:160px;border-bottom:1px solid #e5e7eb;">E-mail</td>
          <td style="padding:10px 14px;color:#111827;border-bottom:1px solid #e5e7eb;">
            <a href="mailto:${senderEmail}" style="color:#2d79be;text-decoration:none;font-weight:600;">${senderEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:bold;color:#4b5563;background:#f9fafb;width:160px;border-bottom:1px solid #e5e7eb;">Téléphone</td>
          <td style="padding:10px 14px;color:#111827;border-bottom:1px solid #e5e7eb;">
            <a href="tel:${senderPhone}" style="color:#2d79be;text-decoration:none;">${senderPhone}</a>
          </td>
        </tr>
        ${extraRows.join('')}
      </table>
      <div style="margin-top:20px;">
        <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;margin-bottom:8px;">
          ${isPartner ? 'Détails de la demande :' : 'Message :'}
        </div>
        <div style="background:#f9fafb;padding:16px 18px;border-radius:10px;border:1px solid #e5e7eb;font-size:14px;line-height:1.6;color:#1f2937;">
          ${contentText}
        </div>
      </div>
      <div style="margin-top:28px;text-align:center;">
        <a href="mailto:${senderEmail}?subject=Re: ${encodeURIComponent(headerTitle)}" style="display:inline-block;background:${headerColor};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
          Répondre directement
        </a>
      </div>
    </div>
    <div style="background:#f9fafb;padding:16px 24px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
      Cet e-mail a été envoyé depuis le formulaire Matchy+ vers ${destination}.
    </div>
  </div>
</body>
</html>
      `.trim();

      const text = `${subject}\n\nNom: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone || 'N/A'}\n\nMessage:\n${input.requestText || input.message || 'N/A'}`;

      if (!hasSmtpConfig()) {
        return { success: true, simulated: true };
      }

      const from = buildFromHeader();
      if (!from) {
        throw new Error('SMTP_FROM must contain a valid email address.');
      }

      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from,
        to: destination,
        replyTo: `"${input.name}" <${input.email}>`,
        subject,
        text,
        html,
      });

      return { success: true, messageId: info.messageId };
    } catch (err) {
      throw err;
    }
  }
}
