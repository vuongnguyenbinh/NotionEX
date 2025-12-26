import { db } from '../schema'
import type { Tag, TagFormData } from '@/types'
import { generateId } from '@/utils/id'

// Create
export async function createTag(data: TagFormData): Promise<Tag> {
  const tag: Tag = {
    id: generateId(),
    name: data.name,
    color: data.color,
    notionId: null,
  }

  await db.tags.add(tag)
  return tag
}

// Read
export async function getTag(id: string): Promise<Tag | undefined> {
  return db.tags.get(id)
}

export async function getAllTags(): Promise<Tag[]> {
  return db.tags.toArray()
}

export async function getTagsByIds(ids: string[]): Promise<Tag[]> {
  if (ids.length === 0) return []
  return db.tags.where('id').anyOf(ids).toArray()
}

// Update
export async function updateTag(id: string, updates: Partial<Tag>): Promise<void> {
  await db.tags.update(id, updates)
}

// Delete
export async function deleteTag(id: string): Promise<void> {
  // Remove tag from all items
  const items = await db.items.toArray()
  for (const item of items) {
    if (item.tags.includes(id)) {
      await db.items.update(item.id, {
        tags: item.tags.filter((t) => t !== id),
      })
    }
  }
  await db.tags.delete(id)
}
