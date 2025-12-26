/**
 * CRUD operations for Prompts
 * Handles local IndexedDB operations and sync queue management
 */

import { db } from '../schema'
import type { Prompt, PromptFormData, PromptType, SyncStatus, QueueStatus } from '@/types'

/**
 * Get all prompts
 */
export async function getAllPrompts(): Promise<Prompt[]> {
  return db.prompts.toArray()
}

/**
 * Get prompts by type
 */
export async function getPromptsByType(type: PromptType): Promise<Prompt[]> {
  return db.prompts.where('type').equals(type).toArray()
}

/**
 * Get a single prompt by ID
 */
export async function getPrompt(id: string): Promise<Prompt | undefined> {
  return db.prompts.get(id)
}

/**
 * Create a new prompt
 */
export async function createPrompt(data: PromptFormData): Promise<Prompt> {
  const now = new Date()
  const prompt: Prompt = {
    id: crypto.randomUUID(),
    title: data.title,
    description: data.description,
    prompt: data.prompt,
    type: data.type,
    category: data.category || null,
    tags: data.tags,
    note: data.note,
    approved: data.approved,
    favorite: data.favorite,
    quality: data.quality || null,
    textDemo: data.textDemo || null,
    fileDemo: data.fileDemo || null,
    urlDemo: data.urlDemo || null,
    createdAt: now,
    updatedAt: now,
    notionId: null,
    syncStatus: 'pending',
  }

  await db.prompts.add(prompt)

  // Add to sync queue
  await db.promptSyncQueue.add({
    promptId: prompt.id,
    operation: 'create',
    payload: null,
    timestamp: Date.now(),
    retries: 0,
    status: 'queued' as QueueStatus,
  })

  return prompt
}

/**
 * Update an existing prompt
 */
export async function updatePrompt(id: string, updates: Partial<Prompt>): Promise<void> {
  const updateData = {
    ...updates,
    updatedAt: new Date(),
    syncStatus: 'pending' as SyncStatus,
  }

  await db.prompts.update(id, updateData)

  // Add to sync queue (or update existing)
  const existingQueue = await db.promptSyncQueue
    .where('promptId')
    .equals(id)
    .and((q) => q.status === 'queued')
    .first()

  if (existingQueue) {
    await db.promptSyncQueue.update(existingQueue.id!, {
      timestamp: Date.now(),
      operation: existingQueue.operation === 'create' ? 'create' : 'update',
    })
  } else {
    await db.promptSyncQueue.add({
      promptId: id,
      operation: 'update',
      payload: null,
      timestamp: Date.now(),
      retries: 0,
      status: 'queued' as QueueStatus,
    })
  }
}

/**
 * Delete a prompt
 */
export async function deletePrompt(id: string): Promise<void> {
  const prompt = await db.prompts.get(id)
  if (!prompt) return

  // Remove from local DB
  await db.prompts.delete(id)

  // Remove any pending sync queue entries
  await db.promptSyncQueue.where('promptId').equals(id).delete()

  // If it was synced to Notion, queue deletion
  if (prompt.notionId) {
    await db.promptSyncQueue.add({
      promptId: id,
      operation: 'delete',
      payload: { notionId: prompt.notionId } as Partial<Prompt>,
      timestamp: Date.now(),
      retries: 0,
      status: 'queued' as QueueStatus,
    })
  }
}

/**
 * Toggle favorite status
 */
export async function togglePromptFavorite(id: string): Promise<void> {
  const prompt = await db.prompts.get(id)
  if (!prompt) return

  await updatePrompt(id, { favorite: !prompt.favorite })
}

/**
 * Toggle approved status
 */
export async function togglePromptApproved(id: string): Promise<void> {
  const prompt = await db.prompts.get(id)
  if (!prompt) return

  await updatePrompt(id, { approved: !prompt.approved })
}

/**
 * Get unique categories from prompts
 */
export async function getPromptCategories(): Promise<string[]> {
  const prompts = await db.prompts.toArray()
  const categories = new Set<string>()
  for (const prompt of prompts) {
    if (prompt.category) {
      categories.add(prompt.category)
    }
  }
  return Array.from(categories).sort()
}

/**
 * Get unique tags from prompts
 */
export async function getPromptTags(): Promise<string[]> {
  const prompts = await db.prompts.toArray()
  const tags = new Set<string>()
  for (const prompt of prompts) {
    for (const tag of prompt.tags) {
      tags.add(tag)
    }
  }
  return Array.from(tags).sort()
}
