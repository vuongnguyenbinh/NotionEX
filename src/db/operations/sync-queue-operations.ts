import { db } from '../schema'
import type { SyncQueue, QueueStatus } from '@/types'

// Read
export async function getPendingQueue(limit = 50): Promise<SyncQueue[]> {
  return db.syncQueue.where('status').equals('queued').limit(limit).toArray()
}

export async function getFailedQueue(): Promise<SyncQueue[]> {
  return db.syncQueue.where('status').equals('failed').toArray()
}

export async function getAllQueue(): Promise<SyncQueue[]> {
  return db.syncQueue.orderBy('timestamp').toArray()
}

// Update
export async function updateQueueStatus(
  id: number,
  status: QueueStatus
): Promise<void> {
  await db.syncQueue.update(id, { status })
}

export async function incrementRetries(id: number): Promise<void> {
  const item = await db.syncQueue.get(id)
  if (!item) return

  const retries = (item.retries || 0) + 1
  const status: QueueStatus = retries > 3 ? 'failed' : 'queued'

  await db.syncQueue.update(id, { retries, status })
}

// Delete
export async function deleteQueueItem(id: number): Promise<void> {
  await db.syncQueue.delete(id)
}

export async function clearQueue(): Promise<void> {
  await db.syncQueue.clear()
}

export async function clearFailedQueue(): Promise<void> {
  await db.syncQueue.where('status').equals('failed').delete()
}

// Stats
export async function getQueueCount(): Promise<{
  queued: number
  syncing: number
  failed: number
  total: number
}> {
  const [queued, syncing, failed] = await Promise.all([
    db.syncQueue.where('status').equals('queued').count(),
    db.syncQueue.where('status').equals('syncing').count(),
    db.syncQueue.where('status').equals('failed').count(),
  ])

  return { queued, syncing, failed, total: queued + syncing + failed }
}

// Reset failed items to queued
export async function retryFailedQueue(): Promise<void> {
  await db.syncQueue
    .where('status')
    .equals('failed')
    .modify({ status: 'queued', retries: 0 })
}
