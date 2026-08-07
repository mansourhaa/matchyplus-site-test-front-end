/**
 * Errors carrying an HTTP status for `plugins/error-handler`.
 * Without `statusCode` the handler falls back to 500.
 */

type HttpError = Error & { statusCode?: number; code?: string };

function httpError(statusCode: number, message: string, code?: string): HttpError {
  const error: HttpError = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

/** The request itself is malformed or breaks a rule of the domain. */
export function badRequest(message: string, code?: string): HttpError {
  return httpError(400, message, code);
}

/** The row does not exist, or the caller may not know whether it does. */
export function notFound(message: string, code?: string): HttpError {
  return httpError(404, message, code);
}

/** The caller is authenticated but not allowed to do this. */
export function forbidden(message: string, code?: string): HttpError {
  return httpError(403, message, code);
}

/** The request clashes with something that already exists. */
export function conflict(message: string, code?: string): HttpError {
  return httpError(409, message, code);
}

/** The caller exceeded a product quota (e.g. daily right swipes). */
export function tooManyRequests(message: string, code?: string): HttpError {
  return httpError(429, message, code);
}

export function insufficientPrivileges(): Error & { statusCode?: number } {
  return forbidden('insufficient privileges');
}
