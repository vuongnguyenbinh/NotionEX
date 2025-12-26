import { db } from '../schema'
import type { Project, ProjectFormData } from '@/types'
import { generateId } from '@/utils/id'

// Create
export async function createProject(data: ProjectFormData): Promise<Project> {
  const project: Project = {
    id: generateId(),
    name: data.name,
    color: data.color,
    notionId: null,
  }

  await db.projects.add(project)
  return project
}

// Read
export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id)
}

export async function getAllProjects(): Promise<Project[]> {
  return db.projects.toArray()
}

// Update
export async function updateProject(
  id: string,
  updates: Partial<Project>
): Promise<void> {
  await db.projects.update(id, updates)
}

// Delete
export async function deleteProject(id: string): Promise<void> {
  // Remove project reference from items
  await db.items.where('projectId').equals(id).modify({ projectId: null })
  await db.projects.delete(id)
}
