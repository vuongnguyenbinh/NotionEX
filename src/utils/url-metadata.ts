/**
 * Utility to fetch metadata from URLs
 * Extracts title, description, and other Open Graph data
 */

export interface UrlMetadata {
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
}

/**
 * Fetch metadata from a URL by parsing the HTML
 * Uses background script to avoid CORS issues
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  try {
    // Send message to background script to fetch metadata
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_URL_METADATA',
      url,
    })

    if (response?.success) {
      return response.metadata
    }

    // Fallback: extract from URL itself
    return extractFromUrl(url)
  } catch (error) {
    console.error('Failed to fetch URL metadata:', error)
    return extractFromUrl(url)
  }
}

/**
 * Extract basic info from URL when fetch fails
 */
function extractFromUrl(url: string): UrlMetadata {
  try {
    const parsedUrl = new URL(url)
    // Use hostname as title fallback
    const hostname = parsedUrl.hostname.replace('www.', '')
    // Capitalize first letter
    const title = hostname.charAt(0).toUpperCase() + hostname.slice(1)

    return {
      title,
      description: null,
      image: null,
      siteName: hostname,
    }
  } catch {
    return {
      title: null,
      description: null,
      image: null,
      siteName: null,
    }
  }
}

/**
 * Parse HTML string to extract metadata
 * Used by background script
 */
export function parseHtmlMetadata(html: string, url: string): UrlMetadata {
  // Use DOMParser to parse HTML
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Extract title
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
  const twitterTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content')
  const titleTag = doc.querySelector('title')?.textContent
  const title = ogTitle || twitterTitle || titleTag || null

  // Extract description
  const ogDescription = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')
  const twitterDescription = doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content')
  const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content')
  const description = ogDescription || twitterDescription || metaDescription || null

  // Extract image
  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
  const twitterImage = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
  let image = ogImage || twitterImage || null

  // Make relative image URLs absolute
  if (image && !image.startsWith('http')) {
    try {
      image = new URL(image, url).href
    } catch {
      image = null
    }
  }

  // Extract site name
  const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')
  const siteName = ogSiteName || null

  return { title, description, image, siteName }
}
