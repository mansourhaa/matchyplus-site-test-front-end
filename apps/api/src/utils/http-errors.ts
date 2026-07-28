/**
 * Errors carrying an HTTP status for `plugins/error-handler`.
 * Without `statusCode` the handler falls back to 500.
 */

function httpError(statusCode: number, message: string): Error & { statusCode?: number } {
  const error: Error & { statusCode?: number } = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/** The request itself is malformed or breaks a rule of the domain. */
export function badRequest(message: string): Error & { statusCode?: number } {
  return httpError(400, message);
}

/** The row does not exist, or the caller may not know whether it does. */
export function notFound(message: string): Error & { statusCode?: number } {
  return httpError(404, message);
}

/** The caller is authenticated but not allowed to do this. */
export function forbidden(message: string): Error & { statusCode?: number } {
  return httpError(403, message);
}

/** The request clashes with something that already exists. */
export function conflict(message: string): Error & { statusCode?: number } {
  return httpError(409, message);
}

/** The caller exceeded a product quota (e.g. daily right swipes). */
export function tooManyRequests(message: string): Error & { statusCode?: number } {
  return httpError(429, message);
}

export function insufficientPrivileges(): Error & { statusCode?: number } {
  return forbidden('insufficient privileges');
}
