/**
 * Simple per-provider request throttle.
 *
 * Ensures a minimum interval between consecutive requests from the same
 * provider instance. Concurrent callers queue up; each waits for the
 * previous to finish before proceeding.
 *
 * Usage:
 *   private limiter = new RateLimiter(200); // 200 ms between requests
 *
 *   private async request(path: string): Promise<Response> {
 *     await this.limiter.throttle();
 *     return fetch(...);
 *   }
 */
export class RateLimiter {
  private queue: Promise<void> = Promise.resolve();
  private lastCompleted = 0;

  constructor(private readonly minIntervalMs: number) {}

  /**
   * Wait until the minimum interval since the last request has elapsed,
   * then resolve. Calls are serialised: if two requests arrive simultaneously
   * the second waits for the first's interval to pass.
   */
  throttle(): Promise<void> {
    this.queue = this.queue.then(() => this.wait());
    return this.queue;
  }

  private wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCompleted;
    const delay = Math.max(0, this.minIntervalMs - elapsed);
    return new Promise((resolve) =>
      setTimeout(() => {
        this.lastCompleted = Date.now();
        resolve();
      }, delay),
    );
  }
}
