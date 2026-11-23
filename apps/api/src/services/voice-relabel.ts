import {
  RELABEL_FIELDS,
  RelabelOnboardingFieldsBody,
  RelabelOnboardingFieldsResponse,
} from '../types/video-analysis.js';
import { DEFAULT_VOICE_AI_URL, postToVoiceAi } from '../utils/voice-ai-http.js';

export type RelabelRequest = RelabelOnboardingFieldsBody;
export type RelabelResponse = RelabelOnboardingFieldsResponse;

const RELABEL_TIMEOUT_MS = 5000;

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
      // Both addresses at once (VOICE_AI_URL and its localhost twin): at most 5 s in all.
      const reply = await postToVoiceAi(
        this.baseUrl,
        '/relabel',
        body,
        RELABEL_TIMEOUT_MS,
        this.fetchImpl,
      );
      if (!reply) {
        throw unavailable('voice service unreachable');
      }
      if (!reply.ok) {
        throw unavailable(`voice service answered ${reply.status}`);
      }
      // A proxy or a crash can answer plain text or HTML: report it as « unavailable ».
      if (reply.json === undefined) {
        throw unavailable(`voice service answered ${reply.status} without JSON`);
      }
      const data = reply.json as {
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
