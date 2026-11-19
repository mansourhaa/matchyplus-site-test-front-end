import {
  RELABEL_FIELDS,
  RelabelOnboardingFieldsBody,
  RelabelOnboardingFieldsResponse,
} from '../types/video-analysis.js';

export type RelabelRequest = RelabelOnboardingFieldsBody;
export type RelabelResponse = RelabelOnboardingFieldsResponse;

const DEFAULT_VOICE_AI_URL = 'http://localhost:8001';
const RELABEL_TIMEOUT_MS = 5000;

/**
 * `VOICE_AI_URL` is written for the AI worker, which runs in Docker and reaches the voice
 * service through host.docker.internal. The API may run on the host itself (`pnpm dev`),
 * where that name does not always resolve: then localhost is tried too.
 */
function candidateUrls(baseUrl: string): string[] {
  const base = baseUrl.replace(/\/$/, '');
  const onHost = base.replace('://host.docker.internal', '://localhost');
  return onHost === base ? [base] : [base, onHost];
}

function unavailable(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 503 });
}

/**
 * Page-language switch for the fields the AI filled from the onboarding video, without
 * any AI: the voice service rewrites them with its dictionaries and rules (/relabel, under
 * a second). It runs no model, so it is a plain HTTP call and not a worker job.
 */
export class VoiceRelabelService {
  constructor(
    private readonly baseUrl: string = process.env.VOICE_AI_URL || DEFAULT_VOICE_AI_URL,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async relabel(request: RelabelRequest): Promise<RelabelResponse> {
    try {
      const body = JSON.stringify({
        values: request.values,
        uiLocale: request.uiLocale,
        serviceId: request.serviceId ?? null,
        aiFields: request.aiFields ?? [],
        suggestions: request.suggestions ?? {},
      });
      let response: Response | null = null;
      for (const base of candidateUrls(this.baseUrl)) {
        try {
          response = await this.fetchImpl(`${base}/relabel`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body,
            signal: AbortSignal.timeout(RELABEL_TIMEOUT_MS),
          });
          break;
        } catch {
          // Unreachable: try the next address, if any.
        }
      }
      if (!response) {
        throw unavailable('voice service unreachable');
      }
      if (!response.ok) {
        throw unavailable(`voice service answered ${response.status}`);
      }

      // A proxy or a crash can answer plain text or HTML: report it as « unavailable ».
      const data = (await response.json().catch(() => {
        throw unavailable(`voice service answered ${response.status} without JSON`);
      })) as {
        fields?: Record<string, { value?: unknown; review?: unknown }>;
        suggestions?: Record<string, { value?: unknown; label?: unknown }[]>;
        serviceId?: unknown;
      };
      const fields: RelabelResponse['fields'] = {};
      for (const key of RELABEL_FIELDS) {
        const field = data.fields?.[key];
        if (!field) continue;
        fields[key] = {
          value: typeof field.value === 'string' && field.value.trim() ? field.value : null,
          review: field.review === true,
        };
      }
      const suggestions: RelabelResponse['suggestions'] = {};
      for (const key of RELABEL_FIELDS) {
        const options = (data.suggestions?.[key] ?? [])
          .map((option) => ({
            value: typeof option.value === 'string' ? option.value : '',
            label: typeof option.label === 'string' ? option.label : undefined,
          }))
          .filter((option) => option.value || option.label);
        if (options.length) suggestions[key] = options;
      }
      return {
        fields,
        suggestions,
        serviceId: typeof data.serviceId === 'string' ? data.serviceId : null,
      };
    } catch (err) {
      throw err;
    }
  }
}
