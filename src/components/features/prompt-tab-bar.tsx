/**
 * Tab bar for switching between prompt types (text/image/video)
 */

import { FileText, Image, Video } from 'lucide-react'
import type { PromptType } from '@/types'

interface PromptTabBarProps {
  activeTab: PromptType
  onTabChange: (tab: PromptType) => void
  counts?: Record<PromptType, number>
}

const tabs: { id: PromptType; label: string; icon: typeof FileText }[] = [
  { id: 'text', label: 'Văn bản', icon: FileText },
  { id: 'image', label: 'Hình ảnh', icon: Image },
  { id: 'video', label: 'Video', icon: Video },
]

export function PromptTabBar({ activeTab, onTabChange, counts }: PromptTabBarProps) {
  return (
    <div className="flex border-b border-[var(--border-color)]">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        const count = counts?.[tab.id] ?? 0

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium
              border-b-2 transition-colors
              ${isActive
                ? 'text-brand border-brand'
                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:border-gray-300'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {count > 0 && (
              <span
                className={`
                  px-1.5 py-0.5 text-[10px] rounded-full
                  ${isActive ? 'bg-brand/20 text-brand' : 'bg-gray-100 dark:bg-gray-700 text-[var(--text-secondary)]'}
                `}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
