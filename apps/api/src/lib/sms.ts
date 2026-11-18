import { config } from '../config.js';

export interface SmsClient {
  sendSms(phone: string, message: string): Promise<void>;
}

const TUNISIESMS_API_URL = 'https://api.l2t.io/tn/v0/api/api.aspx';

// TunisieSMS's documented response is a JSON array (`[{ status_code, ... }]`), but the
// live endpoint has been observed returning XML instead (`<status_code>200</status_code>` or `<status>200</status>`)
// for the same successful send — extract the code from whichever shape comes back
// rather than assuming one.
function extractStatusCode(rawText: string): number | null {
  try {
    const parsed = JSON.parse(rawText);
    const value = Array.isArray(parsed)
      ? (parsed[0] as { status_code?: number | string })?.status_code
      : (parsed as { status_code?: number | string })?.status_code;
    if (value !== undefined && value !== null) {
      return Number(value);
    }
  } catch {
    // Not JSON — fall through to the XML shape below.
  }

  const xmlMatch = rawText.match(/<status_code>\s*(\d+)\s*<\/status_code>/i);
  if (xmlMatch) return Number(xmlMatch[1]);

  const altXmlMatch = rawText.match(/<status>\s*(\d+)\s*<\/status>/i);
  if (altXmlMatch) return Number(altXmlMatch[1]);

  return null;
}

function createRealSmsClient(): SmsClient {
  return {
    async sendSms(phone, message) {
      let cleanMobile = phone.replace(/\D/g, '');
      if (cleanMobile.length === 8) {
        cleanMobile = `216${cleanMobile}`;
      }
      const sender = (config.tunisieSmsSender || 'Matchy plus').slice(0, 11);

      console.log(`[SMS:TUNISIESMS] Dispatching SMS to ${cleanMobile} (sender: "${sender}")...`);

      const queryString = [
        `fct=sms`,
        `key=${encodeURIComponent(config.tunisieSmsKey as string)}`,
        `mobile=${encodeURIComponent(cleanMobile)}`,
        `sms=${encodeURIComponent(message)}`,
        `sender=${encodeURIComponent(sender)}`,
      ].join('&');

      let response: Response;
      try {
        response = await fetch(`${TUNISIESMS_API_URL}?${queryString}`);
      } catch (err) {
        console.error('[SMS:TUNISIESMS] Network fetch error communicating with SMS gateway:', err);
        throw new Error('sms_delivery_failed');
      }

      if (!response.ok) {
        console.error(`[SMS:TUNISIESMS] Gateway HTTP error: status=${response.status}`);
        throw new Error('sms_delivery_failed');
      }

      const rawText = await response.text();
      const statusCode = extractStatusCode(rawText);
      console.log(`[SMS:TUNISIESMS] Gateway response status_code=${statusCode}`);

      if (statusCode !== 200) {
        console.error(`[SMS:TUNISIESMS] Non-200 response from gateway: ${rawText}`);
        throw new Error('sms_delivery_failed');
      }
    },
  };
}

// Called once at plugin registration time (see plugins/sms.ts) — the check must be eager
// so a missing config always yields the stub client, never a half-configured real one.
function isTunisieSmsConfigured(): boolean {
  return Boolean(config.tunisieSmsKey);
}

function createDisabledSmsClient(): SmsClient {
  return {
    async sendSms(phone, message) {
      console.log(`[SMS:DISABLED] Mobile: ${phone} | Message: ${message}`);
    },
  };
}

function createUnconfiguredSmsClient(): SmsClient {
  return {
    async sendSms() {
      throw new Error('sms_service_not_configured');
    },
  };
}

export function createSmsClient(): SmsClient {
  const realClient = createRealSmsClient();
  const disabledClient = createDisabledSmsClient();
  const unconfiguredClient = createUnconfiguredSmsClient();

  return {
    async sendSms(phone, message) {
      const isDisabled = /^(1|true|yes|on)$/i.test(
        String(process.env.DISABLE_SMS ?? config.disableSms ?? ''),
      );
      const isDev = (process.env.NODE_ENV ?? config.nodeEnv) === 'development';
      if (isDisabled || isDev) {
        return disabledClient.sendSms(phone, message);
      }
      if (!isTunisieSmsConfigured()) {
        return unconfiguredClient.sendSms(phone, message);
      }
      return realClient.sendSms(phone, message);
    },
  };
}
