// Ref: docs/llm-provider-guide.md §8

import { LlmTransientError, LlmRateLimitError } from "./provider";

const DEFAULT_MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

/**
 * Retry wrapper with exponential backoff for transient LLM errors.
 * Respects retryAfterMs on rate-limit responses.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = DEFAULT_MAX_ATTEMPTS
): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (err instanceof LlmRateLimitError) {
        if (attempt < maxAttempts) {
          await sleep(err.retryAfterMs);
          continue;
        }
      } else if (err instanceof LlmTransientError) {
        if (attempt < maxAttempts) {
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
          continue;
        }
      } else {
        // Fatal or unknown — don't retry
        throw err;
      }
    }
  }

  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
