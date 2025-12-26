/**
 * Drop zone component for drag-and-drop URL support
 * Accepts URLs dropped from browser address bar or links
 */

import { useState, useCallback } from 'react'
import { Link2, Loader2 } from 'lucide-react'

interface DropZoneProps {
  onDrop: (url: string) => void | Promise<void>
  isLoading?: boolean
  className?: string
  children?: React.ReactNode
}

export function DropZone({ onDrop, isLoading = false, className = '', children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    // Try to get URL from various data types
    let url: string | null = null

    // 1. Check for URL data type
    url = e.dataTransfer.getData('text/uri-list')

    // 2. Check for plain text (might be a URL)
    if (!url) {
      const text = e.dataTransfer.getData('text/plain')
      if (text && isValidUrl(text)) {
        url = text
      }
    }

    // 3. Check for HTML (extract href)
    if (!url) {
      const html = e.dataTransfer.getData('text/html')
      if (html) {
        const match = html.match(/href=["']([^"']+)["']/)
        if (match && isValidUrl(match[1])) {
          url = match[1]
        }
      }
    }

    if (url) {
      await onDrop(url)
    }
  }, [onDrop])

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative ${className}`}
    >
      {children}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-brand/10 border-2 border-dashed border-brand rounded-lg flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2 text-brand">
            <Link2 className="w-8 h-8" />
            <span className="text-sm font-medium">Thả URL vào đây</span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[var(--bg-primary)]/80 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Đang tải thông tin...</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
