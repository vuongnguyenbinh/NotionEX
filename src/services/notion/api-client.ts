/**
 * Notion API client with rate limiting
 * Uses fetch API (no external SDK needed for simple operations)
 */

import { rateLimiter } from './rate-limiter'
import { getSettings } from '@/db/operations/settings-operations'

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

interface NotionProperty {
  type: string
  [key: string]: unknown
}

interface NotionPage {
  id: string
  created_time: string
  last_edited_time: string
  archived: boolean
  properties: Record<string, NotionProperty>
}

interface NotionResponse<T> {
  object: string
  results?: T[]
  next_cursor?: string | null
  has_more?: boolean
}

export interface NotionError {
  status: number
  code: string
  message: string
  headers?: Record<string, string>
}

class NotionApiClient {
  private async getCredentials() {
    const settings = await getSettings()
    if (!settings.notionToken || !settings.notionDatabaseId) {
      throw new Error('Notion credentials not configured')
    }
    return {
      token: settings.notionToken,
      databaseId: settings.notionDatabaseId,
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const { token } = await this.getCredentials()

    const response = await fetch(`${NOTION_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error: NotionError = {
        status: response.status,
        code: 'unknown',
        message: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      }

      try {
        const body = await response.json()
        error.code = body.code || 'unknown'
        error.message = body.message || response.statusText
      } catch {
        // Ignore JSON parse errors
      }

      throw error
    }

    return response.json()
  }

  /**
   * Query database for all items
   */
  async queryDatabase(
    filter?: Record<string, unknown>,
    startCursor?: string
  ): Promise<NotionResponse<NotionPage>> {
    const { databaseId } = await this.getCredentials()

    return rateLimiter.execute(() =>
      this.request<NotionResponse<NotionPage>>(`/databases/${databaseId}/query`, {
        method: 'POST',
        body: JSON.stringify({
          filter,
          start_cursor: startCursor,
          page_size: 100,
        }),
      })
    )
  }

  /**
   * Get all pages from database (handles pagination)
   * @param filter Optional filter object
   */
  async getAllPages(filter?: Record<string, unknown>): Promise<NotionPage[]> {
    const allPages: NotionPage[] = []
    let hasMore = true
    let startCursor: string | undefined

    while (hasMore) {
      const response = await this.queryDatabase(filter, startCursor)
      if (response.results) {
        allPages.push(...response.results)
      }
      hasMore = response.has_more || false
      startCursor = response.next_cursor || undefined
    }

    return allPages
  }

  /**
   * Get pages modified after a specific timestamp (delta sync)
   * Uses Notion's last_edited_time filter for efficient incremental sync
   * @param lastSyncAt Timestamp in milliseconds
   */
  async getModifiedPagesSince(lastSyncAt: number): Promise<NotionPage[]> {
    const isoDate = new Date(lastSyncAt).toISOString()
    const filter = {
      timestamp: 'last_edited_time',
      last_edited_time: {
        after: isoDate,
      },
    }
    return this.getAllPages(filter)
  }

  /**
   * Create a new page in the database
   */
  async createPage(properties: Record<string, unknown>): Promise<NotionPage> {
    const { databaseId } = await this.getCredentials()

    return rateLimiter.execute(() =>
      this.request<NotionPage>('/pages', {
        method: 'POST',
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties,
        }),
      })
    )
  }

  /**
   * Update an existing page
   */
  async updatePage(
    pageId: string,
    properties: Record<string, unknown>
  ): Promise<NotionPage> {
    return rateLimiter.execute(() =>
      this.request<NotionPage>(`/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties }),
      })
    )
  }

  /**
   * Archive (soft delete) a page
   */
  async archivePage(pageId: string): Promise<NotionPage> {
    return rateLimiter.execute(() =>
      this.request<NotionPage>(`/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ archived: true }),
      })
    )
  }

  /**
   * Test connection to Notion API
   */
  async testConnection(): Promise<boolean> {
    try {
      const { databaseId } = await this.getCredentials()
      await rateLimiter.execute(() =>
        this.request(`/databases/${databaseId}`)
      )
      return true
    } catch {
      return false
    }
  }
}

// Singleton instance
export const notionClient = new NotionApiClient()
