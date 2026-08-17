import { toast } from '@/lib/toast';

/**
 * Standardized client-side error handling helper.
 * Logs the error to console and reports to console/sentry/etc.
 */
export function handleError(error: unknown, context?: string): void {
  // In development, log the error details clearly to console
  console.error(
    `[Error]${context ? ` Context: ${context} |` : ''}`,
    error instanceof Error ? error.message : error,
    error,
  );

  // If there's an error message we want to display to the user, we could show a toast here.
  // But for silent catch blocks, we only log to the console/monitoring system.
}
