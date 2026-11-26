import { API_URL } from './constants';

/**
 * POST a form to the API (`${API_URL}${path}`), e.g. the contact and partner forms. True only
 * when the API answers 2xx: a form shows "sent" only when the message really arrived, and an
 * error otherwise (network down, API error, rate limit).
 */
export async function postToApi(path: string, body: unknown): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}
