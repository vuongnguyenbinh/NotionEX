/**
 * Rate limiter for Notion API requests
 * Enforces 350ms minimum interval between requests (2.8 req/s, under 3 req/s limit)
 */

type QueuedTask<T> = {
  fn: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

export class NotionRateLimiter {
  private queue: QueuedTask<unknown>[] = []
  private processing = false
  private lastRequestTime = 0
  private readonly MIN_INTERVAL = 350 // ms between requests

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject } as QueuedTask<unknown>)
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return
    this.processing = true

    while (this.queue.length > 0) {
      const task = this.queue.shift()!

      // Wait for rate limit interval
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTime
      if (timeSinceLastRequest < this.MIN_INTERVAL) {
        await this.sleep(this.MIN_INTERVAL - timeSinceLastRequest)
      }

      this.lastRequestTime = Date.now()

      try {
        const result = await task.fn()
        task.resolve(result)
      } catch (error) {
        // Handle 429 rate limit response
        if (this.isRateLimitError(error)) {
          const retryAfter = this.getRetryAfter(error)
          console.warn(`Rate limited. Retrying after ${retryAfter}ms`)

          // Re-queue the task after waiting
          await this.sleep(retryAfter)
          this.queue.unshift(task)
        } else {
          task.reject(error)
        }
      }
    }

    this.processing = false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private isRateLimitError(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      'status' in error &&
      (error as { status: number }).status === 429
    )
  }

  private getRetryAfter(error: unknown): number {
    if (
      error !== null &&
      typeof error === 'object' &&
      'headers' in error &&
      typeof (error as { headers: Record<string, string> }).headers === 'object'
    ) {
      const retryAfter = (error as { headers: Record<string, string> }).headers['retry-after']
      if (retryAfter) {
        return parseInt(retryAfter, 10) * 1000
      }
    }
    return 1000 // Default 1 second
  }

  /**
   * Get queue length for status display
   */
  get queueLength(): number {
    return this.queue.length
  }

  /**
   * Check if currently processing
   */
  get isProcessing(): boolean {
    return this.processing
  }
}

// Singleton instance
export const rateLimiter = new NotionRateLimiter()
