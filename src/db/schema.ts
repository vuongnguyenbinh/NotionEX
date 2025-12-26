import Dexie, { type EntityTable } from 'dexie'
import type { Item, Category, Project, Tag, SyncQueue, Settings, Prompt, PromptSyncQueue } from '@/types'

// Database class with typed tables
const db = new Dexie('NotionEXDB') as Dexie & {
  items: EntityTable<Item, 'id'>
  categories: EntityTable<Category, 'id'>
  projects: EntityTable<Project, 'id'>
  tags: EntityTable<Tag, 'id'>
  syncQueue: EntityTable<SyncQueue, 'id'>
  settings: EntityTable<Settings, 'id'>
  // Prompt Library tables
  prompts: EntityTable<Prompt, 'id'>
  promptSyncQueue: EntityTable<PromptSyncQueue, 'id'>
}

// Define schema with indexes
// &id = unique primary key
// ++id = auto-increment
db.version(1).stores({
  items: '&id, type, categoryId, projectId, completed, syncStatus, updatedAt, notionId',
  categories: '&id, parentId, order, notionId',
  projects: '&id, notionId',
  tags: '&id, notionId',
  syncQueue: '++id, itemId, status, timestamp',
  settings: '&id',
})

// Version 2: Add Prompt Library tables
db.version(2).stores({
  items: '&id, type, categoryId, projectId, completed, syncStatus, updatedAt, notionId',
  categories: '&id, parentId, order, notionId',
  projects: '&id, notionId',
  tags: '&id, notionId',
  syncQueue: '++id, itemId, status, timestamp',
  settings: '&id',
  prompts: '&id, type, category, approved, favorite, syncStatus, updatedAt, notionId',
  promptSyncQueue: '++id, promptId, status, timestamp',
})

export { db }
