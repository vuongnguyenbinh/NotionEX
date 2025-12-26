/**
 * Transform data between local Item format and Notion API format
 *
 * Expected Notion Database Properties:
 * - Title (title): Item title
 * - Type (select): task | bookmark | note
 * - Content (rich_text): Item content/description
 * - URL (url): For bookmarks
 * - Priority (select): high | medium | low
 * - Deadline (date): Due date for tasks
 * - Completed (checkbox): Task completion status
 * - Tags (multi_select): Tag names
 * - Category (select): Category name
 * - Project (select): Project name
 * - LocalID (rich_text): Local UUID for matching
 * - TagColors (rich_text): JSON mapping tag names to hex colors {"tag1":"#ef4444"}
 * - CategoryIcon (rich_text): Icon name like "folder", "briefcase"
 * - ProjectColor (rich_text): Hex color like "#22c55e"
 */

import type { Item, ItemType, Priority, Tag, Category, Project } from '@/types'

// Notion API limit: 2000 characters per rich_text block
const NOTION_TEXT_LIMIT = 2000

/**
 * Split long text into chunks of max 2000 chars for Notion rich_text
 */
function splitTextForNotion(text: string): { text: { content: string } }[] {
  if (!text) return [{ text: { content: '' } }]
  if (text.length <= NOTION_TEXT_LIMIT) {
    return [{ text: { content: text } }]
  }

  const chunks: { text: { content: string } }[] = []
  let remaining = text

  while (remaining.length > 0) {
    const chunk = remaining.slice(0, NOTION_TEXT_LIMIT)
    chunks.push({ text: { content: chunk } })
    remaining = remaining.slice(NOTION_TEXT_LIMIT)
  }

  return chunks
}

// Property name mapping - Notion uses names, not IDs
const PROP_NAMES = {
  title: 'Title',
  type: 'Type',
  content: 'Content',
  url: 'URL',
  priority: 'Priority',
  deadline: 'Deadline',
  completed: 'Completed',
  tags: 'Tags',
  category: 'Category',
  project: 'Project',
  localId: 'LocalID',
  // Color/icon sync columns
  tagColors: 'TagColors',
  categoryIcon: 'CategoryIcon',
  projectColor: 'ProjectColor',
} as const

// Metadata lookup for ID ↔ Name conversion
export interface MetadataLookup {
  tags: Tag[]
  categories: Category[]
  projects: Project[]
}

/**
 * Convert local Item to Notion properties
 * Uses metadata lookup to convert IDs → Names for tags/category/project
 */
export function itemToNotionProperties(item: Item, metadata?: MetadataLookup): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    [PROP_NAMES.title]: {
      title: [{ text: { content: item.title } }],
    },
    [PROP_NAMES.type]: {
      select: { name: item.type },
    },
    [PROP_NAMES.content]: {
      rich_text: splitTextForNotion(item.content || ''),
    },
    [PROP_NAMES.completed]: {
      checkbox: item.completed,
    },
    [PROP_NAMES.localId]: {
      rich_text: [{ text: { content: item.id } }],
    },
  }

  // Optional fields
  if (item.url) {
    properties[PROP_NAMES.url] = { url: item.url }
  }

  if (item.priority) {
    properties[PROP_NAMES.priority] = { select: { name: item.priority } }
  }

  if (item.deadline) {
    properties[PROP_NAMES.deadline] = {
      date: { start: new Date(item.deadline).toISOString().split('T')[0] },
    }
  }

  // Convert tag IDs to tag names for Notion + sync tag colors
  if (item.tags.length > 0 && metadata) {
    const tagColors: Record<string, string> = {}
    const tagNames = item.tags
      .map((tagId) => {
        const tag = metadata.tags.find((t) => t.id === tagId)
        if (tag) {
          tagColors[tag.name] = tag.color
          return tag.name
        }
        return null
      })
      .filter(Boolean)
    if (tagNames.length > 0) {
      properties[PROP_NAMES.tags] = {
        multi_select: tagNames.map((name) => ({ name })),
      }
      // Sync tag colors as JSON
      properties[PROP_NAMES.tagColors] = {
        rich_text: [{ text: { content: JSON.stringify(tagColors) } }],
      }
    }
  } else if (item.tags.length > 0) {
    // Fallback: use tags as-is (might be names already)
    properties[PROP_NAMES.tags] = {
      multi_select: item.tags.map((tag) => ({ name: tag })),
    }
  }

  // Convert category ID to category name + sync icon
  if (item.categoryId && metadata) {
    const category = metadata.categories.find((c) => c.id === item.categoryId)
    if (category) {
      properties[PROP_NAMES.category] = { select: { name: category.name } }
      // Sync category icon
      properties[PROP_NAMES.categoryIcon] = {
        rich_text: [{ text: { content: category.icon } }],
      }
    }
  }

  // Convert project ID to project name + sync color
  if (item.projectId && metadata) {
    const project = metadata.projects.find((p) => p.id === item.projectId)
    if (project) {
      properties[PROP_NAMES.project] = { select: { name: project.name } }
      // Sync project color
      properties[PROP_NAMES.projectColor] = {
        rich_text: [{ text: { content: project.color } }],
      }
    }
  }

  return properties
}

// Helper to safely get property value
function getProp(props: Record<string, unknown>, name: string): unknown {
  return props[name]
}

function getTitleText(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return ''
  const p = prop as { type?: string; title?: { plain_text?: string }[] }
  if (p.type !== 'title' || !Array.isArray(p.title)) return ''
  return p.title[0]?.plain_text || ''
}

function getSelectValue(prop: unknown): string | null {
  if (!prop || typeof prop !== 'object') return null
  const p = prop as { type?: string; select?: { name?: string } | null }
  if (p.type !== 'select' || !p.select) return null
  return p.select.name || null
}

function getRichText(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return ''
  const p = prop as { type?: string; rich_text?: { plain_text?: string }[] }
  if (p.type !== 'rich_text' || !Array.isArray(p.rich_text)) return ''
  // Join all rich text blocks (Notion splits at 2000 char boundaries)
  return p.rich_text.map((t) => t.plain_text || '').join('')
}

function getUrl(prop: unknown): string | null {
  if (!prop || typeof prop !== 'object') return null
  const p = prop as { type?: string; url?: string | null }
  if (p.type !== 'url') return null
  return p.url || null
}

function getDate(prop: unknown): Date | null {
  if (!prop || typeof prop !== 'object') return null
  const p = prop as { type?: string; date?: { start?: string } | null }
  if (p.type !== 'date' || !p.date?.start) return null
  return new Date(p.date.start)
}

function getCheckbox(prop: unknown): boolean {
  if (!prop || typeof prop !== 'object') return false
  const p = prop as { type?: string; checkbox?: boolean }
  if (p.type !== 'checkbox') return false
  return p.checkbox || false
}

function getMultiSelect(prop: unknown): string[] {
  if (!prop || typeof prop !== 'object') return []
  const p = prop as { type?: string; multi_select?: { name?: string }[] }
  if (p.type !== 'multi_select' || !Array.isArray(p.multi_select)) return []
  return p.multi_select.map((s) => s.name || '').filter(Boolean)
}

/**
 * Parsed Notion item with raw names (before ID resolution)
 */
export interface ParsedNotionItem extends Partial<Item> {
  localId?: string
  tagNames: string[]       // Tag names from Notion (need to convert to IDs)
  tagColors: Record<string, string> // Tag name → hex color mapping
  categoryName: string | null  // Category name from Notion
  categoryIcon: string | null  // Category icon name
  projectName: string | null   // Project name from Notion
  projectColor: string | null  // Project hex color
}

/**
 * Parse tag colors JSON safely
 */
function parseTagColors(jsonStr: string): Record<string, string> {
  if (!jsonStr) return {}
  try {
    return JSON.parse(jsonStr) as Record<string, string>
  } catch {
    return {}
  }
}

/**
 * Convert Notion page to local Item format
 * Returns names for tags/category/project (needs ID resolution by sync service)
 */
export function notionPageToItem(page: {
  id: string
  last_edited_time: string
  properties: Record<string, unknown>
}): ParsedNotionItem {
  const props = page.properties

  return {
    localId: getRichText(getProp(props, PROP_NAMES.localId)) || undefined,
    notionId: page.id,
    type: (getSelectValue(getProp(props, PROP_NAMES.type)) as ItemType) || 'note',
    title: getTitleText(getProp(props, PROP_NAMES.title)),
    content: getRichText(getProp(props, PROP_NAMES.content)),
    url: getUrl(getProp(props, PROP_NAMES.url)),
    priority: getSelectValue(getProp(props, PROP_NAMES.priority)) as Priority | null,
    deadline: getDate(getProp(props, PROP_NAMES.deadline)),
    completed: getCheckbox(getProp(props, PROP_NAMES.completed)),
    tagNames: getMultiSelect(getProp(props, PROP_NAMES.tags)),  // Names, not IDs
    tagColors: parseTagColors(getRichText(getProp(props, PROP_NAMES.tagColors))),
    categoryName: getSelectValue(getProp(props, PROP_NAMES.category)),
    categoryIcon: getRichText(getProp(props, PROP_NAMES.categoryIcon)) || null,
    projectName: getSelectValue(getProp(props, PROP_NAMES.project)),
    projectColor: getRichText(getProp(props, PROP_NAMES.projectColor)) || null,
    tags: [], // Will be resolved by sync service
    syncStatus: 'synced',
    updatedAt: new Date(page.last_edited_time),
  }
}

/**
 * Get the Notion property name for LocalID field
 */
export function getLocalIdFilter(localId: string): Record<string, unknown> {
  return {
    property: PROP_NAMES.localId,
    rich_text: {
      equals: localId,
    },
  }
}
