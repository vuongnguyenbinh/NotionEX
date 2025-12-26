/**
 * Transform data between local Prompt format and Notion API format
 *
 * Expected Notion Database Properties:
 * - Title (title): Prompt name
 * - Description (rich_text): Short description
 * - Prompt (rich_text): Main prompt content
 * - Type (select): text | image | video
 * - Category (select): Marketing, CEO, etc.
 * - Tags (multi_select): Tag names
 * - Note (rich_text): Additional notes
 * - Approved (checkbox): Review status
 * - Favorite (checkbox): Frequently used
 * - Quality (select): 1-5 stars
 * - TextDemo (rich_text): Demo text
 * - FileDemo (files): Demo files
 * - URLDemo (url): Demo URL
 * - LocalID (rich_text): Local UUID for matching
 * - TagColors (rich_text): JSON mapping tag names to hex colors (sync only)
 * - CategoryIcon (rich_text): Icon name like "folder" (sync only)
 */

import type { Prompt, PromptType, QualityRating } from '@/types'

// Notion API limit: 2000 characters per rich_text block
const NOTION_TEXT_LIMIT = 2000

/**
 * Split long text into chunks of max 2000 chars for Notion rich_text
 * Notion allows multiple text blocks in a rich_text array
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

// Property name mapping
const PROP_NAMES = {
  title: 'Title',
  description: 'Description',
  prompt: 'Prompt',
  type: 'Type',
  category: 'Category',
  tags: 'Tags',
  note: 'Note',
  approved: 'Approved',
  favorite: 'Favorite',
  quality: 'Quality',
  textDemo: 'TextDemo',
  fileDemo: 'FileDemo',
  urlDemo: 'URLDemo',
  localId: 'LocalID',
  // Color/icon sync columns
  tagColors: 'TagColors',
  categoryIcon: 'CategoryIcon',
} as const

/**
 * Convert local Prompt to Notion properties
 * Uses splitTextForNotion to handle long text (>2000 chars)
 */
export function promptToNotionProperties(prompt: Prompt): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    [PROP_NAMES.title]: {
      title: [{ text: { content: prompt.title } }],
    },
    [PROP_NAMES.description]: {
      rich_text: splitTextForNotion(prompt.description || ''),
    },
    [PROP_NAMES.prompt]: {
      rich_text: splitTextForNotion(prompt.prompt || ''),
    },
    [PROP_NAMES.type]: {
      select: { name: prompt.type },
    },
    [PROP_NAMES.note]: {
      rich_text: splitTextForNotion(prompt.note || ''),
    },
    [PROP_NAMES.approved]: {
      checkbox: prompt.approved,
    },
    [PROP_NAMES.favorite]: {
      checkbox: prompt.favorite,
    },
    [PROP_NAMES.localId]: {
      rich_text: [{ text: { content: prompt.id } }],
    },
  }

  // Optional fields
  if (prompt.category) {
    properties[PROP_NAMES.category] = { select: { name: prompt.category } }
  }

  if (prompt.tags.length > 0) {
    properties[PROP_NAMES.tags] = {
      multi_select: prompt.tags.map((tag) => ({ name: tag })),
    }
  }

  if (prompt.quality) {
    properties[PROP_NAMES.quality] = { select: { name: String(prompt.quality) } }
  }

  if (prompt.textDemo) {
    properties[PROP_NAMES.textDemo] = {
      rich_text: splitTextForNotion(prompt.textDemo),
    }
  }

  if (prompt.urlDemo) {
    properties[PROP_NAMES.urlDemo] = { url: prompt.urlDemo }
  }

  // FileDemo is handled separately (files property type)

  return properties
}

// Helper functions for parsing Notion properties
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
  const result = p.rich_text.map((t) => t.plain_text || '').join('')
  return result
}

function getUrl(prop: unknown): string | null {
  if (!prop || typeof prop !== 'object') return null
  const p = prop as { type?: string; url?: string | null }
  if (p.type !== 'url') return null
  return p.url || null
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

function getFiles(prop: unknown): string | null {
  if (!prop || typeof prop !== 'object') return null
  const p = prop as { type?: string; files?: { file?: { url?: string }; external?: { url?: string } }[] }
  if (p.type !== 'files' || !Array.isArray(p.files) || p.files.length === 0) return null
  const file = p.files[0]
  return file.file?.url || file.external?.url || null
}

/**
 * Parsed Notion prompt
 */
export interface ParsedNotionPrompt extends Partial<Prompt> {
  localId?: string
}

/**
 * Convert Notion page to local Prompt format
 */
export function notionPageToPrompt(page: {
  id: string
  last_edited_time: string
  properties: Record<string, unknown>
}): ParsedNotionPrompt {
  const props = page.properties
  const qualityStr = getSelectValue(getProp(props, PROP_NAMES.quality))
  const quality = qualityStr ? (parseInt(qualityStr, 10) as QualityRating) : null

  // Get prompt content - try "Prompt" first, fallback to "Note" if empty
  const promptContent = getRichText(getProp(props, PROP_NAMES.prompt))
  const noteContent = getRichText(getProp(props, PROP_NAMES.note))
  // Use prompt if available, otherwise use note as the prompt content
  const mainPrompt = promptContent || noteContent

  return {
    localId: getRichText(getProp(props, PROP_NAMES.localId)) || undefined,
    notionId: page.id,
    title: getTitleText(getProp(props, PROP_NAMES.title)),
    description: getRichText(getProp(props, PROP_NAMES.description)),
    prompt: mainPrompt,
    type: ((getSelectValue(getProp(props, PROP_NAMES.type))?.toLowerCase() || 'text') as PromptType),
    category: getSelectValue(getProp(props, PROP_NAMES.category)),
    tags: getMultiSelect(getProp(props, PROP_NAMES.tags)),
    note: promptContent ? noteContent : '', // Only use note if prompt has content
    approved: getCheckbox(getProp(props, PROP_NAMES.approved)),
    favorite: getCheckbox(getProp(props, PROP_NAMES.favorite)),
    quality: quality && quality >= 1 && quality <= 5 ? quality : null,
    textDemo: getRichText(getProp(props, PROP_NAMES.textDemo)) || null,
    fileDemo: getFiles(getProp(props, PROP_NAMES.fileDemo)),
    urlDemo: getUrl(getProp(props, PROP_NAMES.urlDemo)),
    syncStatus: 'synced',
    updatedAt: new Date(page.last_edited_time),
  }
}

/**
 * Get filter for finding prompt by LocalID
 */
export function getPromptLocalIdFilter(localId: string): Record<string, unknown> {
  return {
    property: PROP_NAMES.localId,
    rich_text: {
      equals: localId,
    },
  }
}
