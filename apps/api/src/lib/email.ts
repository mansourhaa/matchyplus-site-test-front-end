import { config } from '../config.js';

export interface EmailClient {
  isConfigured(): boolean;
  sendVerificationCode(params: { to: string; code: string; expiresMinutes: number }): Promise<void>;
}

function buildFromHeader(): string | null {
  const from = config.smtpFrom || config.smtpUser;
  if (!from) {
    return null;
  }

  const displayName = config.smtpFromName ?? config.appName;
  return `"${displayName}" <${from}>`;
}

function isConfigured(): boolean {
  return Boolean(
    config.smtpHost && config.smtpPort && config.smtpUser && config.smtpPass && buildFromHeader(),
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transporterPromise: Promise<any> | null = null;

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (!isConfigured()) {
        throw new Error('smtp_not_configured');
      }

      const { default: nodemailer } = await import('nodemailer');
      const port = Number(config.smtpPort);
      const secure = config.smtpSecure ? config.smtpSecure === 'true' : port === 465;

      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port,
        secure,
        auth: { user: config.smtpUser, pass: config.smtpPass },
      });

      await transporter.verify();
      return transporter;
    })().catch((err) => {
      transporterPromise = null;
      throw err;
    });
  }

  return transporterPromise;
}

export function createEmailClient(): EmailClient {
  return {
    isConfigured,

    async sendVerificationCode({ to, code, expiresMinutes }) {
      const from = buildFromHeader();
      if (!from) {
        throw new Error('smtp_not_configured');
      }

      const transporter = await getTransporter();
      const appName = config.appName;

      await transporter.sendMail({
        from,
        to,
        subject: `${appName} - Verification code`,
        text: `${appName} verification code: ${code}\nThis code expires in ${expiresMinutes} minutes.`,
        html: `<p>Your ${appName} verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p><p>This code expires in ${expiresMinutes} minutes.</p>`,
      });
    },
  };
}
