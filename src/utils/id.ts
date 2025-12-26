/**
 * Generate a UUID v4 string
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Generate a short 8-character ID
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10)
}
