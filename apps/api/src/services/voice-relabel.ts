import { VideoAnalysisLocale } from './video-analysis.js';

/** Text fields the voice service can rewrite in another page language. */
export const RELABEL_FIELDS = [
  'first_name',
  'last_name',
  'profession',
  'city',
  'bio',
  'years_experience',
  'availability',
] as const;
export type RelabelField = (typeof RELABEL_FIELDS)[number];

export type RelabelOption = { value: string; label?: string };

export type RelabelRequest = {
  values: Partial<Record<RelabelField, string>>;
  uiLocale: VideoAnalysisLocale;
  serviceId?: string | null;
  aiFields?: RelabelField[];
  /** One-click proposals shown under the fields, rewritten in the new language too. */
  suggestions?: Partial<Record<RelabelField, RelabelOption[]>>;
};

export type RelabelledField = { value: string | null; review: boolean };

export type RelabelResponse = {
  fields: Partial<Record<RelabelField, RelabelledField>>;
  suggestions: Partial<Record<RelabelField, RelabelOption[]>>;
  serviceId: string | null;
};

const DEFAULT_VOICE_AI_URL = 'http://localhost:8001';
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
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl.replace(/\/$/, '')}/relabel`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          values: request.values,
          uiLocale: request.uiLocale,
          serviceId: request.serviceId ?? null,
          aiFields: request.aiFields ?? [],
          suggestions: request.suggestions ?? {},
        }),
        signal: AbortSignal.timeout(RELABEL_TIMEOUT_MS),
      });
    } catch {
      throw unavailable('voice service unreachable');
    }
    if (!response.ok) {
      throw unavailable(`voice service answered ${response.status}`);
    }

    const body = (await response.json()) as {
      fields?: Record<string, { value?: unknown; review?: unknown }>;
      suggestions?: Record<string, { value?: unknown; label?: unknown }[]>;
      serviceId?: unknown;
    };
    const fields: RelabelResponse['fields'] = {};
    for (const key of RELABEL_FIELDS) {
      const field = body.fields?.[key];
      if (!field) continue;
      fields[key] = {
        value: typeof field.value === 'string' && field.value.trim() ? field.value : null,
        review: field.review === true,
      };
    }
    const suggestions: RelabelResponse['suggestions'] = {};
    for (const key of RELABEL_FIELDS) {
      const options = (body.suggestions?.[key] ?? [])
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
      serviceId: typeof body.serviceId === 'string' ? body.serviceId : null,
    };
  }
}
