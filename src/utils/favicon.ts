/**
 * Utility to get favicon URL for a website
 */

/**
 * Get favicon URL using Google's favicon service
 * This is reliable and works for most websites
 */
export function getFaviconUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url)
    // Use Google's favicon service - reliable and cached
    return `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=32`
  } catch {
    return null
  }
}

/**
 * Alternative: Get direct favicon from website
 * Falls back to /favicon.ico if available
 */
export function getDirectFaviconUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url)
    return `${parsedUrl.origin}/favicon.ico`
  } catch {
    return null
  }
}
