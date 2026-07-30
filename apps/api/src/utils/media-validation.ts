/**
 * Content-sniffing validation for profile photo/video uploads — the declared MIME type
 * from the browser is never trusted alone (it frequently lies, e.g. a WebM file labeled
 * video/mp4), so every upload is checked against its actual magic bytes. Ported from
 * matchy-plus-legacy's backend/src/utils/fileValidation.js, trimmed to only the
 * image/video rules this app actually uses (legacy's audio rules are dropped — no
 * audio-upload feature exists here).
 */

type MagicRule = {
  mime: string;
  exts: string[];
  bytes: number[][];
  kind?: 'ftyp' | 'riff-webp' | 'riff-avi';
};

const MAGIC_RULES: MagicRule[] = [
  { mime: 'image/jpeg', exts: ['.jpg', '.jpeg'], bytes: [[0xff, 0xd8, 0xff]] },
  { mime: 'image/png', exts: ['.png'], bytes: [[0x89, 0x50, 0x4e, 0x47]] },
  { mime: 'image/webp', exts: ['.webp'], bytes: [[0x52, 0x49, 0x46, 0x46]], kind: 'riff-webp' },
  { mime: 'video/mp4', exts: ['.mp4'], bytes: [[0x00, 0x00, 0x00]], kind: 'ftyp' },
  { mime: 'video/quicktime', exts: ['.mov'], bytes: [[0x00, 0x00, 0x00]], kind: 'ftyp' },
  { mime: 'video/webm', exts: ['.webm'], bytes: [[0x1a, 0x45, 0xdf, 0xa3]] },
  { mime: 'video/x-matroska', exts: ['.mkv'], bytes: [[0x1a, 0x45, 0xdf, 0xa3]] },
  { mime: 'video/x-msvideo', exts: ['.avi'], bytes: [[0x52, 0x49, 0x46, 0x46]], kind: 'riff-avi' },
  { mime: 'video/ogg', exts: ['.ogv'], bytes: [[0x4f, 0x67, 0x67, 0x53]] },
  { mime: 'video/3gpp', exts: ['.3gp'], bytes: [[0x00, 0x00, 0x00]], kind: 'ftyp' },
  { mime: 'video/3gpp2', exts: ['.3g2'], bytes: [[0x00, 0x00, 0x00]], kind: 'ftyp' },
];

const FTYP_EXTS = new Set(['.mp4', '.mov', '.3gp', '.3g2']);

export const ALLOWED_PHOTO_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/ogg',
  'video/3gpp',
  'video/3gpp2',
];

export function normalizeMime(mime = ''): string {
  return (String(mime).toLowerCase().split(';')[0] ?? '').trim();
}

function matchesMagic(head: Buffer, signatures: number[][]): boolean {
  return signatures.some((signature) => signature.every((byte, index) => head[index] === byte));
}

function matchesFtyp(head: Buffer): boolean {
  return head.length >= 12 && head.subarray(4, 8).toString('ascii') === 'ftyp';
}

function matchesRiffForm(head: Buffer, form: string): boolean {
  return (
    head.length >= 12 &&
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head.subarray(8, 8 + form.length).toString('ascii') === form
  );
}

function ruleMatchesHead(rule: MagicRule, head: Buffer, ext: string): boolean {
  if (rule.kind === 'riff-avi') return matchesRiffForm(head, 'AVI ');
  if (rule.kind === 'riff-webp') return matchesRiffForm(head, 'WEBP');

  if (matchesMagic(head, rule.bytes)) return true;

  // ISO BMFF containers (mp4/mov/3gp) put a variable-length size before `ftyp` — the
  // fixed byte match above only covers the common zero-padded case, so also accept any
  // ftyp box regardless of leading size bytes.
  if ((rule.kind === 'ftyp' || FTYP_EXTS.has(ext)) && matchesFtyp(head)) return true;

  return false;
}

function sniffAllowedRule(head: Buffer, allowedMimes: string[]): MagicRule | null {
  const allowed = new Set(allowedMimes.map(normalizeMime));
  const matches = MAGIC_RULES.filter(
    (rule) => allowed.has(rule.mime) && ruleMatchesHead(rule, head, rule.exts[0] ?? ''),
  );
  return matches[0] ?? null;
}

export type FileValidationResult =
  { ok: true; ext: string; mime: string } | { ok: false; error: string };

/**
 * Validates an uploaded file's actual bytes against its declared extension/MIME.
 * Accepts the declared type only if the content's magic bytes agree with it; otherwise
 * sniffs the content against every allowed rule (catches a mislabeled-but-legitimate
 * file) before rejecting outright.
 */
export function validateUploadedFile({
  buffer,
  originalname,
  mimetype,
  allowedMimes,
}: {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  allowedMimes: string[];
}): FileValidationResult {
  const ext = (originalname.match(/\.[^./\\]+$/)?.[0] ?? '').toLowerCase();
  const cleanMime = normalizeMime(mimetype);
  const head = buffer.subarray(0, 16);
  const allowed = allowedMimes.map(normalizeMime);

  if (allowed.includes(cleanMime)) {
    const declaredRule = MAGIC_RULES.find((item) => item.mime === cleanMime);
    if (
      declaredRule &&
      (!ext || declaredRule.exts.includes(ext)) &&
      ruleMatchesHead(declaredRule, head, ext)
    ) {
      return { ok: true, ext: ext || (declaredRule.exts[0] ?? ext), mime: cleanMime };
    }
  }

  const sniffed = sniffAllowedRule(head, allowed);
  if (sniffed) {
    const outExt = sniffed.exts.includes(ext) ? ext : (sniffed.exts[0] ?? ext);
    return { ok: true, ext: outExt, mime: sniffed.mime };
  }

  if (!allowed.includes(cleanMime)) {
    return { ok: false, error: 'unsupported_media_type' };
  }

  return { ok: false, error: 'invalid_file_signature' };
}
