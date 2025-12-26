/**
 * Sync service for bidirectional Notion synchronization
 * Handles queue processing, conflict resolution (LWW), and batch operations
 *
 * Key design: Local uses IDs, Notion uses Names
 * - Push to Notion: Convert IDs → Names
 * - Pull from Notion: Convert Names → IDs (create if not exists)
 */

import { db } from '@/db/schema'
import { notionClient } from './api-client'
import { itemToNotionProperties, notionPageToItem, getLocalIdFilter, type MetadataLookup, type ParsedNotionItem } from './data-transformer'
import { updateSettings, getLastSyncAt } from '@/db/operations/settings-operations'
import { getAllTags, createTag } from '@/db/operations/tag-operations'
import { getAllCategories, createCategory } from '@/db/operations/category-operations'
import { getAllProjects, createProject } from '@/db/operations/project-operations'
import { getFaviconUrl } from '@/utils/favicon'
import type { Item, SyncQueue, SyncStatus, Tag, Category, Project } from '@/types'

// Default colors for auto-created metadata
const DEFAULT_TAG_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6']
const DEFAULT_PROJECT_COLORS = ['#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

export type SyncResult = {
  success: boolean
  created: number
  updated: number
  deleted: number
  errors: string[]
}

class SyncService {
  private isSyncing = false

  /**
   * Check if sync is currently in progress
   */
  get syncing(): boolean {
    return this.isSyncing
  }

  /**
   * Load all metadata for ID ↔ Name conversion
   */
  private async loadMetadata(): Promise<MetadataLookup> {
    const [tags, categories, projects] = await Promise.all([
      getAllTags(),
      getAllCategories(),
      getAllProjects(),
    ])
    return { tags, categories, projects }
  }

  /**
   * Resolve tag names to IDs, creating tags if they don't exist
   * Uses tagColors from Notion if available, otherwise uses default colors
   */
  private async resolveTagNames(
    tagNames: string[],
    existingTags: Tag[],
    tagColors?: Record<string, string>
  ): Promise<string[]> {
    const tagIds: string[] = []

    for (const name of tagNames) {
      let tag = existingTags.find((t) => t.name.toLowerCase() === name.toLowerCase())
      if (!tag) {
        // Use color from Notion if available, otherwise use default
        const color = tagColors?.[name] || DEFAULT_TAG_COLORS[tagIds.length % DEFAULT_TAG_COLORS.length]
        tag = await createTag({ name, color })
        existingTags.push(tag) // Add to cache for subsequent lookups
      }
      tagIds.push(tag.id)
    }

    return tagIds
  }

  /**
   * Resolve category name to ID, creating if doesn't exist
   * Uses categoryIcon from Notion if available
   */
  private async resolveCategoryName(
    categoryName: string | null,
    existingCategories: Category[],
    categoryIcon?: string | null
  ): Promise<string | null> {
    if (!categoryName) return null

    let category = existingCategories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase())
    if (!category) {
      // Use icon from Notion if available, otherwise use default folder icon
      const icon = categoryIcon || 'folder'
      category = await createCategory({ name: categoryName, icon, parentId: null })
      existingCategories.push(category)
    }
    return category.id
  }

  /**
   * Resolve project name to ID, creating if doesn't exist
   * Uses projectColor from Notion if available
   */
  private async resolveProjectName(
    projectName: string | null,
    existingProjects: Project[],
    projectColor?: string | null
  ): Promise<string | null> {
    if (!projectName) return null

    let project = existingProjects.find((p) => p.name.toLowerCase() === projectName.toLowerCase())
    if (!project) {
      // Use color from Notion if available, otherwise use default
      const color = projectColor || DEFAULT_PROJECT_COLORS[existingProjects.length % DEFAULT_PROJECT_COLORS.length]
      project = await createProject({ name: projectName, color })
      existingProjects.push(project)
    }
    return project.id
  }

  /**
   * Process all pending items in the sync queue
   */
  async processQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, created: 0, updated: 0, deleted: 0, errors: ['Sync already in progress'] }
    }

    this.isSyncing = true
    const result: SyncResult = { success: true, created: 0, updated: 0, deleted: 0, errors: [] }

    try {
      // Load metadata for ID → Name conversion
      const metadata = await this.loadMetadata()

      // Get pending items, ordered by timestamp
      const pending = await db.syncQueue
        .where('status')
        .equals('queued')
        .sortBy('timestamp')

      for (const queueItem of pending) {
        try {
          await this.processQueueItem(queueItem, result, metadata)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          result.errors.push(`${queueItem.operation} ${queueItem.itemId}: ${errorMsg}`)

          // Update retry count
          const retries = (queueItem.retries || 0) + 1
          if (retries >= 3) {
            await db.syncQueue.update(queueItem.id!, { status: 'failed', retries })
          } else {
            await db.syncQueue.update(queueItem.id!, { retries })
          }
        }
      }

      // Update last sync time
      await updateSettings({ lastSyncAt: Date.now() })
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      this.isSyncing = false
    }

    return result
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(queueItem: SyncQueue, result: SyncResult, metadata: MetadataLookup): Promise<void> {
    // Mark as syncing
    await db.syncQueue.update(queueItem.id!, { status: 'syncing' })

    const item = await db.items.get(queueItem.itemId)

    switch (queueItem.operation) {
      case 'create': {
        if (!item) {
          // Item was deleted locally, skip
          await db.syncQueue.delete(queueItem.id!)
          return
        }

        // Check if already exists in Notion (by localId)
        const existing = await notionClient.queryDatabase(getLocalIdFilter(item.id))
        if (existing.results && existing.results.length > 0) {
          // Already exists, update notionId and mark as synced
          const notionPage = existing.results[0]
          await db.items.update(item.id, {
            notionId: notionPage.id,
            syncStatus: 'synced' as SyncStatus,
          })
        } else {
          // Create new page - convert IDs to Names using metadata
          const properties = itemToNotionProperties(item, metadata)
          const newPage = await notionClient.createPage(properties)
          await db.items.update(item.id, {
            notionId: newPage.id,
            syncStatus: 'synced' as SyncStatus,
          })
        }

        result.created++
        break
      }

      case 'update': {
        if (!item?.notionId) {
          // No notion ID, treat as create
          if (item) {
            await db.syncQueue.update(queueItem.id!, { operation: 'create' })
            return this.processQueueItem({ ...queueItem, operation: 'create' }, result, metadata)
          }
          await db.syncQueue.delete(queueItem.id!)
          return
        }

        // Convert IDs to Names using metadata
        const properties = itemToNotionProperties(item, metadata)
        await notionClient.updatePage(item.notionId, properties)
        await db.items.update(item.id, { syncStatus: 'synced' as SyncStatus })

        result.updated++
        break
      }

      case 'delete': {
        // Get notionId from payload (item may already be deleted locally)
        const notionId = queueItem.payload?.notionId as string | undefined
        if (notionId) {
          await notionClient.archivePage(notionId)
        }

        result.deleted++
        break
      }
    }

    // Remove from queue on success
    await db.syncQueue.delete(queueItem.id!)
  }

  /**
   * Pull changes from Notion and merge with local data
   * Supports delta sync (incremental) when lastSyncAt is available
   * Resolves Names → IDs for tags/category/project
   *
   * @param forceFullSync If true, fetches all pages regardless of lastSyncAt
   */
  async pullFromNotion(forceFullSync = false): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, created: 0, updated: 0, deleted: 0, errors: ['Sync already in progress'] }
    }

    this.isSyncing = true
    const result: SyncResult = { success: true, created: 0, updated: 0, deleted: 0, errors: [] }

    try {
      // Load metadata for Name → ID resolution
      const metadata = await this.loadMetadata()

      // Delta sync: only fetch pages modified since last sync
      const lastSyncAt = forceFullSync ? null : await getLastSyncAt()
      const notionPages = lastSyncAt
        ? await notionClient.getModifiedPagesSince(lastSyncAt)
        : await notionClient.getAllPages()

      console.log(`[SyncService] ${lastSyncAt ? 'Delta' : 'Full'} sync: fetched ${notionPages.length} pages`)

      const localItems = await db.items.toArray()

      // Build lookup maps
      const localByNotionId = new Map<string, Item>()
      const localByLocalId = new Map<string, Item>()
      for (const item of localItems) {
        if (item.notionId) localByNotionId.set(item.notionId, item)
        localByLocalId.set(item.id, item)
      }

      for (const page of notionPages) {
        if (page.archived) continue

        const notionItem = notionPageToItem(page) as ParsedNotionItem
        const localId = notionItem.localId

        // Resolve Names → IDs (pass colors/icons from Notion for new items)
        const tagIds = await this.resolveTagNames(notionItem.tagNames, metadata.tags, notionItem.tagColors)
        const categoryId = await this.resolveCategoryName(notionItem.categoryName, metadata.categories, notionItem.categoryIcon)
        const projectId = await this.resolveProjectName(notionItem.projectName, metadata.projects, notionItem.projectColor)

        // Find matching local item
        let localItem = localByNotionId.get(page.id)
        if (!localItem && localId) {
          localItem = localByLocalId.get(localId)
        }

        // Generate favicon for bookmarks
        const faviconUrl = notionItem.type === 'bookmark' && notionItem.url
          ? getFaviconUrl(notionItem.url)
          : null

        if (localItem) {
          // Existing item - check for conflict (LWW)
          const notionTime = new Date(page.last_edited_time).getTime()
          const localTime = localItem.updatedAt.getTime()

          if (notionTime > localTime) {
            // Notion wins - update local with resolved IDs
            await db.items.update(localItem.id, {
              type: notionItem.type,
              title: notionItem.title,
              content: notionItem.content,
              url: notionItem.url,
              faviconUrl: faviconUrl || localItem.faviconUrl, // Keep existing if no URL
              priority: notionItem.priority,
              deadline: notionItem.deadline,
              completed: notionItem.completed,
              tags: tagIds,
              categoryId,
              projectId,
              notionId: page.id,
              syncStatus: 'synced' as SyncStatus,
              updatedAt: notionItem.updatedAt,
            })
            result.updated++
          }
          // If local wins, it will be pushed in processQueue
        } else {
          // New item from Notion - create locally with resolved IDs
          const newItem: Item = {
            id: localId || crypto.randomUUID(),
            type: notionItem.type || 'note',
            title: notionItem.title || '',
            content: notionItem.content || '',
            url: notionItem.url || null,
            faviconUrl,
            priority: notionItem.priority || null,
            deadline: notionItem.deadline || null,
            completed: notionItem.completed || false,
            categoryId,
            projectId,
            tags: tagIds,
            createdAt: new Date(),
            updatedAt: notionItem.updatedAt || new Date(),
            notionId: page.id,
            syncStatus: 'synced',
          }

          await db.items.add(newItem)
          result.created++
        }
      }

      // Update last sync time
      await updateSettings({ lastSyncAt: Date.now() })
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      this.isSyncing = false
    }

    return result
  }

  /**
   * Full sync: pull from Notion (delta by default), then push local changes
   * @param forceFullSync If true, forces a complete re-sync from Notion
   */
  async fullSync(forceFullSync = false): Promise<SyncResult> {
    // First pull (delta sync by default)
    const pullResult = await this.pullFromNotion(forceFullSync)
    if (!pullResult.success) {
      return pullResult
    }

    // Then push
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
   * Force a complete re-sync from Notion (ignores lastSyncAt)
   * Use this when data might be out of sync or corrupted
   */
  async forceFullSync(): Promise<SyncResult> {
    return this.fullSync(true)
  }

  /**
   * Get sync queue status
   */
  async getQueueStatus(): Promise<{
    queued: number
    syncing: number
    failed: number
  }> {
    const all = await db.syncQueue.toArray()
    return {
      queued: all.filter((q) => q.status === 'queued').length,
      syncing: all.filter((q) => q.status === 'syncing').length,
      failed: all.filter((q) => q.status === 'failed').length,
    }
  }

  /**
   * Retry failed items
   */
  async retryFailed(): Promise<number> {
    const failed = await db.syncQueue.where('status').equals('failed').toArray()
    for (const item of failed) {
      await db.syncQueue.update(item.id!, { status: 'queued', retries: 0 })
    }
    return failed.length
  }

  /**
   * Clear failed items from queue
   */
  async clearFailed(): Promise<number> {
    const failed = await db.syncQueue.where('status').equals('failed').toArray()
    for (const item of failed) {
      await db.syncQueue.delete(item.id!)
    }
    return failed.length
  }
}

// Singleton instance
export const syncService = new SyncService()
