import { config } from '../config.js';

export interface SmsClient {
  sendSms(phone: string, message: string): Promise<void>;
}

const TUNISIESMS_API_URL = 'https://api.l2t.io/tn/v0/api/api.aspx';

// TunisieSMS's documented response is a JSON array (`[{ status_code, ... }]`), but the
// live endpoint has been observed returning XML instead (`<status_code>200</status_code>`)
// for the same successful send — extract the code from whichever shape comes back
// rather than assuming one.
function extractStatusCode(rawText: string): number | null {
  try {
    const parsed = JSON.parse(rawText) as Array<{ status_code?: number | string }>;
    const value = parsed?.[0]?.status_code;
    if (value !== undefined) {
      return Number(value);
    }
  } catch {
    // Not JSON — fall through to the XML shape below.
  }

  const xmlMatch = rawText.match(/<status_code>\s*(\d+)\s*<\/status_code>/i);
  return xmlMatch ? Number(xmlMatch[1]) : null;
}

function createRealSmsClient(): SmsClient {
  return {
    async sendSms(phone, message) {
      const params = new URLSearchParams({
        fct: 'sms',
        key: config.tunisieSmsKey as string,
        mobile: phone.replace(/\D/g, ''),
        sms: message,
        sender: (config.tunisieSmsSender || 'Matchy plus').slice(0, 11),
      });

      let response: Response;
      try {
        response = await fetch(`${TUNISIESMS_API_URL}?${params.toString()}`);
      } catch {
        // Never log the params or the underlying error — the query string carries the
        // API key and the OTP text.
        throw new Error('sms_delivery_failed');
      }

      if (!response.ok) {
        throw new Error('sms_delivery_failed');
      }

      const rawText = await response.text();
      if (extractStatusCode(rawText) !== 200) {
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

function createUnconfiguredSmsClient(): SmsClient {
  return {
    async sendSms() {
      throw new Error('sms_service_not_configured');
    },
  };
}

export function createSmsClient(): SmsClient {
  if (!isTunisieSmsConfigured()) {
    return createUnconfiguredSmsClient();
  }

  return createRealSmsClient();
}
