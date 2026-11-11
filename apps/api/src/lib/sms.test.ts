import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('createSmsClient', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('fails closed with sms_service_not_configured when TunisieSMS is unset', async () => {
    vi.resetModules();
    delete process.env.TUNISIESMS_KEY;

    const { createSmsClient } = await import('./sms.js');
    const client = createSmsClient();

    await expect(client.sendSms('+21612345678', 'code 123456')).rejects.toThrow(
      'sms_service_not_configured',
    );
  });

  it('sends via TunisieSMS and succeeds on a JSON status_code 200', async () => {
    vi.resetModules();
    process.env.TUNISIESMS_KEY = 'test-key';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([{ status_code: 200, status_msg: 'ok' }]),
    });
    global.fetch = fetchMock as never;

    const { createSmsClient } = await import('./sms.js');
    const client = createSmsClient();

    await client.sendSms('+216 12 345 678', 'code 123456');

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('https://api.l2t.io/tn/v0/api/api.aspx');
    expect(url).toContain('fct=sms');
    expect(url).toContain('key=test-key');
    expect(url).toContain('mobile=21612345678');
  });

  it('prefixes 8-digit bare numbers with 216 country code', async () => {
    vi.resetModules();
    process.env.TUNISIESMS_KEY = 'test-key';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<response><status>200</status></response>',
    });
    global.fetch = fetchMock as never;

    const { createSmsClient } = await import('./sms.js');
    const client = createSmsClient();

    await client.sendSms('28012646', 'code 123456');

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('mobile=21628012646');
  });

  // The documented TunisieSMS response is a JSON array, but the live endpoint has been
  // observed returning XML for the same successful send — this must succeed too.
  it('sends via TunisieSMS and succeeds on an XML status_code 200', async () => {
    vi.resetModules();
    process.env.TUNISIESMS_KEY = 'test-key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<?xml version="1.0" encoding="UTF-8"?>\n<response><status><status_code>200</status_code></status></response>',
    }) as never;

    const { createSmsClient } = await import('./sms.js');
    const client = createSmsClient();

    await expect(client.sendSms('+21612345678', 'code 123456')).resolves.toBeUndefined();
  });

  it('throws sms_delivery_failed on a non-200 JSON status_code', async () => {
    vi.resetModules();
    process.env.TUNISIESMS_KEY = 'test-key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([{ status_code: 400, status_msg: 'error' }]),
    }) as never;

    const { createSmsClient } = await import('./sms.js');
    const client = createSmsClient();

    await expect(client.sendSms('+21612345678', 'code 123456')).rejects.toThrow(
      'sms_delivery_failed',
    );
  });

  it('throws sms_delivery_failed on a non-200 XML status_code', async () => {
    vi.resetModules();
    process.env.TUNISIESMS_KEY = 'test-key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<response><status><status_code>400</status_code></status></response>',
    }) as never;

    const { createSmsClient } = await import('./sms.js');
    const client = createSmsClient();

    await expect(client.sendSms('+21612345678', 'code 123456')).rejects.toThrow(
      'sms_delivery_failed',
    );
  });

  it('throws sms_delivery_failed when the body is neither valid JSON nor recognizable XML', async () => {
    vi.resetModules();
    process.env.TUNISIESMS_KEY = 'test-key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'not a status response at all',
    }) as never;

    const { createSmsClient } = await import('./sms.js');
    const client = createSmsClient();

    await expect(client.sendSms('+21612345678', 'code 123456')).rejects.toThrow(
      'sms_delivery_failed',
    );
  });

  it('throws sms_delivery_failed when the request itself fails', async () => {
    vi.resetModules();
    process.env.TUNISIESMS_KEY = 'test-key';

    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as never;

    const { createSmsClient } = await import('./sms.js');
    const client = createSmsClient();

    await expect(client.sendSms('+21612345678', 'code 123456')).rejects.toThrow(
      'sms_delivery_failed',
    );
  });
});
