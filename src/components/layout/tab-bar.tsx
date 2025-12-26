import { CheckSquare, Bookmark, FileText } from 'lucide-react'
import type { ItemType } from '@/types'

interface TabBarProps {
  activeTab: ItemType
  onTabChange: (tab: ItemType) => void
  taskCount?: number
}

const tabs: { id: ItemType; label: string; icon: typeof CheckSquare }[] = [
  { id: 'note', label: 'Ghi chú', icon: FileText },
  { id: 'task', label: 'Công việc', icon: CheckSquare },
  { id: 'bookmark', label: 'Dấu trang', icon: Bookmark },
]

export function TabBar({ activeTab, onTabChange, taskCount }: TabBarProps) {
  return (
    <nav className="flex border-b border-[var(--border-color)]">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold
              transition-colors relative
              ${isActive
                ? 'text-brand'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            {tab.id === 'task' && taskCount !== undefined && taskCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[11px] bg-brand text-white rounded-full min-w-[18px] text-center">
                {taskCount}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
