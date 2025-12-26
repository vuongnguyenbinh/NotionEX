import { db } from '../schema'
import type { Item, ItemFormData, ItemType, SyncStatus, ItemFilter } from '@/types'
import { generateId } from '@/utils/id'
import { getFaviconUrl } from '@/utils/favicon'

// Helper: Queue sync operation
async function queueSync(
  itemId: string,
  operation: 'create' | 'update' | 'delete',
  payload: Partial<Item> | null
): Promise<void> {
  await db.syncQueue.add({
    itemId,
    operation,
    payload,
    timestamp: Date.now(),
    retries: 0,
    status: 'queued',
  })
}

// Create
export async function createItem(data: ItemFormData): Promise<Item> {
  const now = new Date()

  // Auto-fetch favicon for bookmarks with URL
  const faviconUrl = data.type === 'bookmark' && data.url
    ? getFaviconUrl(data.url)
    : null

  const item: Item = {
    id: generateId(),
    type: data.type,
    title: data.title,
    content: data.content,
    url: data.url || null,
    faviconUrl,
    priority: data.priority || null,
    deadline: data.deadline || null,
    completed: false,
    categoryId: data.categoryId || null,
    projectId: data.projectId || null,
    tags: data.tags,
    createdAt: now,
    updatedAt: now,
    notionId: null,
    syncStatus: 'pending',
  }

  await db.items.add(item)
  await queueSync(item.id, 'create', item)
  return item
}

// Read
export async function getItem(id: string): Promise<Item | undefined> {
  return db.items.get(id)
}

export async function getItemsByType(type: ItemType): Promise<Item[]> {
  return db.items.where('type').equals(type).toArray()
}

export async function getItemsByCategory(categoryId: string): Promise<Item[]> {
  return db.items.where('categoryId').equals(categoryId).toArray()
}

export async function getItemsByProject(projectId: string): Promise<Item[]> {
  return db.items.where('projectId').equals(projectId).toArray()
}

export async function getAllItems(): Promise<Item[]> {
  return db.items.toArray()
}

// Update
export async function updateItem(id: string, updates: Partial<Item>): Promise<void> {
  const item = await db.items.get(id)
  if (!item) throw new Error(`Item ${id} not found`)

  // Auto-update favicon if URL changed for bookmarks
  let faviconUrl = updates.faviconUrl
  if (updates.url !== undefined && item.type === 'bookmark') {
    faviconUrl = updates.url ? getFaviconUrl(updates.url) : null
  }

  const updatedItem = {
    ...updates,
    ...(faviconUrl !== undefined && { faviconUrl }),
    updatedAt: new Date(),
    syncStatus: 'pending' as SyncStatus,
  }

  await db.items.update(id, updatedItem)
  await queueSync(id, 'update', { ...item, ...updatedItem })
}

export async function toggleItemCompleted(id: string): Promise<void> {
  const item = await db.items.get(id)
  if (!item) throw new Error(`Item ${id} not found`)

  await updateItem(id, { completed: !item.completed })
}

// Delete
export async function deleteItem(id: string): Promise<void> {
  // Get item first to capture notionId for sync
  const item = await db.items.get(id)
  const notionId = item?.notionId || null

  await db.items.delete(id)
  // Pass notionId in payload so sync can archive the Notion page
  await queueSync(id, 'delete', notionId ? { notionId } : null)
}

export async function deleteItemsByCategory(categoryId: string): Promise<void> {
  const items = await getItemsByCategory(categoryId)
  await Promise.all(items.map((item) => deleteItem(item.id)))
}

// Search & Filter
export async function filterItems(filter: ItemFilter): Promise<Item[]> {
  let items = await db.items.toArray()

  if (filter.type) {
    items = items.filter((i) => i.type === filter.type)
  }
  if (filter.categoryId) {
    items = items.filter((i) => i.categoryId === filter.categoryId)
  }
  if (filter.projectId) {
    items = items.filter((i) => i.projectId === filter.projectId)
  }
  if (filter.completed !== undefined) {
    items = items.filter((i) => i.completed === filter.completed)
  }
  if (filter.tags && filter.tags.length > 0) {
    items = items.filter((i) => filter.tags!.some((t) => i.tags.includes(t)))
  }
  if (filter.search) {
    const q = filter.search.toLowerCase()
    items = items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q)
    )
  }

  // Sort by updatedAt descending
  return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}

// Stats
export async function getItemStats(): Promise<{
  tasks: { total: number; completed: number }
  bookmarks: number
  notes: number
}> {
  const items = await db.items.toArray()
  const tasks = items.filter((i) => i.type === 'task')

  return {
    tasks: {
      total: tasks.length,
      completed: tasks.filter((t) => t.completed).length,
    },
    bookmarks: items.filter((i) => i.type === 'bookmark').length,
    notes: items.filter((i) => i.type === 'note').length,
  }
}
