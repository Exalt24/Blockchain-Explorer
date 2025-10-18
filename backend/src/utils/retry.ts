export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoff?: 'linear' | 'exponential';
  onRetry?: (attempt: number, error: Error) => void;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, delayMs, backoff = 'exponential', onRetry } = options;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      const delay = backoff === 'exponential' 
        ? delayMs * Math.pow(2, attempt - 1)
        : delayMs * attempt;

      await sleep(delay);
    }
  }

  throw lastError!;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class RetryableError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'RetryableError';
  }
}