import { db } from '../schema'
import type { Category, CategoryFormData } from '@/types'
import { generateId } from '@/utils/id'

// Create
export async function createCategory(data: CategoryFormData): Promise<Category> {
  // Get max order for siblings
  const siblings = data.parentId
    ? await db.categories.where('parentId').equals(data.parentId).toArray()
    : await db.categories.filter((c) => !c.parentId).toArray()

  const category: Category = {
    id: generateId(),
    name: data.name,
    icon: data.icon,
    parentId: data.parentId,
    order: siblings.length,
    notionId: null,
  }

  await db.categories.add(category)
  return category
}

// Read
export async function getCategory(id: string): Promise<Category | undefined> {
  return db.categories.get(id)
}

export async function getAllCategories(): Promise<Category[]> {
  return db.categories.orderBy('order').toArray()
}

export async function getRootCategories(): Promise<Category[]> {
  const all = await db.categories.toArray()
  return all.filter((c) => !c.parentId).sort((a, b) => a.order - b.order)
}

export async function getChildCategories(parentId: string): Promise<Category[]> {
  return db.categories.where('parentId').equals(parentId).sortBy('order')
}

// Update
export async function updateCategory(
  id: string,
  updates: Partial<Category>
): Promise<void> {
  await db.categories.update(id, updates)
}

// Delete
export async function deleteCategory(id: string): Promise<void> {
  // Move children to root
  await db.categories.where('parentId').equals(id).modify({ parentId: null })
  // Remove category reference from items
  await db.items.where('categoryId').equals(id).modify({ categoryId: null })
  // Delete category
  await db.categories.delete(id)
}

// Reorder
export async function reorderCategory(id: string, newOrder: number): Promise<void> {
  const category = await db.categories.get(id)
  if (!category) return

  const siblings = category.parentId
    ? await db.categories.where('parentId').equals(category.parentId).sortBy('order')
    : (await db.categories.toArray()).filter((c) => !c.parentId).sort((a, b) => a.order - b.order)

  // Remove current category from list
  const filtered = siblings.filter((s) => s.id !== id)

  // Insert at new position
  filtered.splice(newOrder, 0, category)

  // Update all orders
  await Promise.all(
    filtered.map((cat, index) => db.categories.update(cat.id, { order: index }))
  )
}

// Get category tree (hierarchical)
export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
}

export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const all = await getAllCategories()
  const map = new Map<string, CategoryTreeNode>()

  // Create nodes
  all.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] })
  })

  // Build tree
  const roots: CategoryTreeNode[] = []
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  // Sort children by order
  const sortChildren = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.order - b.order)
    nodes.forEach((n) => sortChildren(n.children))
  }
  sortChildren(roots)

  return roots
}
