/**
 * Sync service for Prompt Library
 * Handles bidirectional synchronization with separate Notion database
 */

import { db } from '@/db/schema'
import { rateLimiter } from './rate-limiter'
import { promptToNotionProperties, notionPageToPrompt, getPromptLocalIdFilter, type ParsedNotionPrompt } from './prompt-transformer'
import { getSettings, updateSettings } from '@/db/operations/settings-operations'
import type { Prompt, PromptSyncQueue, SyncStatus, QueueStatus } from '@/types'

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

export type PromptSyncResult = {
  success: boolean
  created: number
  updated: number
  deleted: number
  errors: string[]
}

class PromptSyncService {
  private isSyncing = false

  get syncing(): boolean {
    return this.isSyncing
  }

  /**
   * Make request to Notion API for prompts database
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const settings = await getSettings()
    if (!settings.notionToken || !settings.promptsDatabaseId) {
      throw new Error('Prompts database not configured')
    }

    const response = await fetch(`${NOTION_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${settings.notionToken}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.message || response.statusText)
    }

    return response.json()
  }

  /**
   * Query prompts database
   */
  private async queryDatabase(
    filter?: Record<string, unknown>,
    startCursor?: string
  ): Promise<{ results: unknown[]; has_more: boolean; next_cursor: string | null }> {
    const settings = await getSettings()
    return rateLimiter.execute(() =>
      this.request(`/databases/${settings.promptsDatabaseId}/query`, {
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
   * Get all pages from prompts database
   */
  private async getAllPages(filter?: Record<string, unknown>): Promise<unknown[]> {
    const allPages: unknown[] = []
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
   * Get pages modified since timestamp (delta sync)
   */
  private async getModifiedPagesSince(lastSyncAt: number): Promise<unknown[]> {
    const isoDate = new Date(lastSyncAt).toISOString()
    const filter = {
      timestamp: 'last_edited_time',
      last_edited_time: { after: isoDate },
    }
    return this.getAllPages(filter)
  }

  /**
   * Create page in prompts database
   */
  private async createPage(properties: Record<string, unknown>): Promise<{ id: string }> {
    const settings = await getSettings()
    return rateLimiter.execute(() =>
      this.request('/pages', {
        method: 'POST',
        body: JSON.stringify({
          parent: { database_id: settings.promptsDatabaseId },
          properties,
        }),
      })
    )
  }

  /**
   * Update page
   */
  private async updatePage(pageId: string, properties: Record<string, unknown>): Promise<void> {
    await rateLimiter.execute(() =>
      this.request(`/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties }),
      })
    )
  }

  /**
   * Archive page
   */
  private async archivePage(pageId: string): Promise<void> {
    await rateLimiter.execute(() =>
      this.request(`/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ archived: true }),
      })
    )
  }

  /**
   * Process sync queue for prompts
   */
  async processQueue(): Promise<PromptSyncResult> {
    if (this.isSyncing) {
      return { success: false, created: 0, updated: 0, deleted: 0, errors: ['Sync already in progress'] }
    }

    this.isSyncing = true
    const result: PromptSyncResult = { success: true, created: 0, updated: 0, deleted: 0, errors: [] }

    try {
      // Check if prompts database is configured
      const settings = await getSettings()
      if (!settings.notionToken || !settings.promptsDatabaseId) {
        console.log('[PromptSync] Prompts database not configured, skipping queue processing')
        return { success: true, created: 0, updated: 0, deleted: 0, errors: [] }
      }

      const pending = await db.promptSyncQueue
        .where('status')
        .equals('queued')
        .sortBy('timestamp')

      console.log(`[PromptSync] Processing ${pending.length} queued items`)

      for (const queueItem of pending) {
        try {
          await this.processQueueItem(queueItem, result)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          result.errors.push(`${queueItem.operation} ${queueItem.promptId}: ${errorMsg}`)
          console.error(`[PromptSync] Error processing item:`, error)

          const retries = (queueItem.retries || 0) + 1
          if (retries >= 3) {
            await db.promptSyncQueue.update(queueItem.id!, { status: 'failed' as QueueStatus, retries })
          } else {
            await db.promptSyncQueue.update(queueItem.id!, { retries })
          }
        }
      }

      // Mark as failed if there were errors
      if (result.errors.length > 0) {
        result.success = false
      }

      await updateSettings({ promptsLastSyncAt: Date.now() })
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      this.isSyncing = false
    }

    return result
  }

  /**
   * Process single queue item
   */
  private async processQueueItem(queueItem: PromptSyncQueue, result: PromptSyncResult): Promise<void> {
    await db.promptSyncQueue.update(queueItem.id!, { status: 'syncing' as QueueStatus })

    const prompt = await db.prompts.get(queueItem.promptId)

    switch (queueItem.operation) {
      case 'create': {
        if (!prompt) {
          await db.promptSyncQueue.delete(queueItem.id!)
          return
        }

        // Check if already exists
        const existing = await this.queryDatabase(getPromptLocalIdFilter(prompt.id))
        if (existing.results && existing.results.length > 0) {
          const notionPage = existing.results[0] as { id: string }
          await db.prompts.update(prompt.id, {
            notionId: notionPage.id,
            syncStatus: 'synced' as SyncStatus,
          })
        } else {
          const properties = promptToNotionProperties(prompt)
          const newPage = await this.createPage(properties)
          await db.prompts.update(prompt.id, {
            notionId: newPage.id,
            syncStatus: 'synced' as SyncStatus,
          })
        }
        result.created++
        break
      }

      case 'update': {
        if (!prompt?.notionId) {
          if (prompt) {
            await db.promptSyncQueue.update(queueItem.id!, { operation: 'create' })
            return this.processQueueItem({ ...queueItem, operation: 'create' }, result)
          }
          await db.promptSyncQueue.delete(queueItem.id!)
          return
        }

        const properties = promptToNotionProperties(prompt)
        await this.updatePage(prompt.notionId, properties)
        await db.prompts.update(prompt.id, { syncStatus: 'synced' as SyncStatus })
        result.updated++
        break
      }

      case 'delete': {
        const notionId = queueItem.payload?.notionId as string | undefined
        if (notionId) {
          await this.archivePage(notionId)
        }
        result.deleted++
        break
      }
    }

    await db.promptSyncQueue.delete(queueItem.id!)
  }

  /**
   * Pull prompts from Notion (delta sync supported)
   */
  async pullFromNotion(forceFullSync = false): Promise<PromptSyncResult> {
    if (this.isSyncing) {
      return { success: false, created: 0, updated: 0, deleted: 0, errors: ['Sync already in progress'] }
    }

    this.isSyncing = true
    const result: PromptSyncResult = { success: true, created: 0, updated: 0, deleted: 0, errors: [] }

    try {
      const settings = await getSettings()

      // Check if prompts database is configured
      if (!settings.notionToken || !settings.promptsDatabaseId) {
        console.log('[PromptSync] Prompts database not configured, skipping pull')
        this.isSyncing = false
        return { success: true, created: 0, updated: 0, deleted: 0, errors: [] }
      }

      const lastSyncAt = forceFullSync ? null : settings.promptsLastSyncAt

      const notionPages = lastSyncAt
        ? await this.getModifiedPagesSince(lastSyncAt)
        : await this.getAllPages()

      console.log(`[PromptSync] ${lastSyncAt ? 'Delta' : 'Full'} sync: fetched ${notionPages.length} prompts`)

      const localPrompts = await db.prompts.toArray()
      const localByNotionId = new Map<string, Prompt>()
      const localByLocalId = new Map<string, Prompt>()

      for (const prompt of localPrompts) {
        if (prompt.notionId) localByNotionId.set(prompt.notionId, prompt)
        localByLocalId.set(prompt.id, prompt)
      }

      for (const page of notionPages) {
        const notionPage = page as { id: string; last_edited_time: string; archived: boolean; properties: Record<string, unknown> }
        if (notionPage.archived) continue

        const notionPrompt = notionPageToPrompt(notionPage) as ParsedNotionPrompt
        const localId = notionPrompt.localId

        let localPrompt = localByNotionId.get(notionPage.id)
        if (!localPrompt && localId) {
          localPrompt = localByLocalId.get(localId)
        }

        if (localPrompt) {
          // Existing - LWW
          const notionTime = new Date(notionPage.last_edited_time).getTime()
          const localTime = localPrompt.updatedAt.getTime()

          if (notionTime > localTime) {
            await db.prompts.update(localPrompt.id, {
              title: notionPrompt.title,
              description: notionPrompt.description,
              prompt: notionPrompt.prompt,
              type: notionPrompt.type,
              category: notionPrompt.category,
              tags: notionPrompt.tags,
              note: notionPrompt.note,
              approved: notionPrompt.approved,
              favorite: notionPrompt.favorite,
              quality: notionPrompt.quality,
              textDemo: notionPrompt.textDemo,
              fileDemo: notionPrompt.fileDemo,
              urlDemo: notionPrompt.urlDemo,
              notionId: notionPage.id,
              syncStatus: 'synced' as SyncStatus,
              updatedAt: notionPrompt.updatedAt,
            })
            result.updated++
          }
        } else {
          // New from Notion
          const newPrompt: Prompt = {
            id: localId || crypto.randomUUID(),
            title: notionPrompt.title || '',
            description: notionPrompt.description || '',
            prompt: notionPrompt.prompt || '',
            type: notionPrompt.type || 'text',
            category: notionPrompt.category || null,
            tags: notionPrompt.tags || [],
            note: notionPrompt.note || '',
            approved: notionPrompt.approved || false,
            favorite: notionPrompt.favorite || false,
            quality: notionPrompt.quality || null,
            textDemo: notionPrompt.textDemo || null,
            fileDemo: notionPrompt.fileDemo || null,
            urlDemo: notionPrompt.urlDemo || null,
            createdAt: new Date(),
            updatedAt: notionPrompt.updatedAt || new Date(),
            notionId: notionPage.id,
            syncStatus: 'synced',
          }

          await db.prompts.add(newPrompt)
          result.created++
        }
      }

      await updateSettings({ promptsLastSyncAt: Date.now() })
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      this.isSyncing = false
    }

    return result
  }

  /**
   * Full sync: pull then push
   */
  async fullSync(forceFullSync = false): Promise<PromptSyncResult> {
    const pullResult = await this.pullFromNotion(forceFullSync)
    if (!pullResult.success) {
      return pullResult
    }

    const pushResult = await this.processQueue()

    return {
      success: pullResult.success && pushResult.success,
      created: pullResult.created + pushResult.created,
      updated: pullResult.updated + pushResult.updated,
      deleted: pullResult.deleted + pushResult.deleted,
      errors: [...pullResult.errors, ...pushResult.errors],
    }
  }

  /**
   * Test connection to prompts database
   */
  async testConnection(): Promise<boolean> {
    try {
      const settings = await getSettings()
      if (!settings.notionToken || !settings.promptsDatabaseId) {
        return false
      }
      await this.request(`/databases/${settings.promptsDatabaseId}`)
      return true
    } catch {
      return false
    }
  }
}

export const promptSyncService = new PromptSyncService()
