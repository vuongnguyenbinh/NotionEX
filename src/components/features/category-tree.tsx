import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
} from 'lucide-react'
import { CategoryIcon, CATEGORY_ICONS } from '@/components/shared'
import type { Category } from '@/types'

// Check if icon is a lucide icon name or old emoji
const isLucideIcon = (icon: string) => CATEGORY_ICONS.some((i) => i.name === icon)

interface CategoryTreeProps {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onAdd: (parentId: string | null) => void
  onEdit: (category: Category) => void
  onDelete: (id: string) => void
}

interface CategoryNodeProps {
  category: Category
  children: Category[]
  allCategories: Category[]
  level: number
  selectedId: string | null
  onSelect: (id: string | null) => void
  onAdd: (parentId: string | null) => void
  onEdit: (category: Category) => void
  onDelete: (id: string) => void
}

function CategoryNode({
  category,
  children,
  allCategories,
  level,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}: CategoryNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const hasChildren = children.length > 0
  const isSelected = selectedId === category.id

  return (
    <div>
      <div
        className={`
          group flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer
          hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
          ${isSelected ? 'bg-brand/10 text-brand' : ''}
        `}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={() => onSelect(category.id)}
      >
        {/* Expand/collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
            !hasChildren ? 'invisible' : ''
          }`}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Icon - support both Lucide icons and emojis */}
        {isLucideIcon(category.icon) ? (
          <CategoryIcon name={category.icon} className="w-4 h-4" />
        ) : (
          <span className="text-sm">{category.icon || '📁'}</span>
        )}

        {/* Name */}
        <span className="flex-1 text-sm truncate">{category.name}</span>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 py-1 w-32 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowMenu(false)
                  onAdd(category.id)
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm con
              </button>
              <button
                onClick={() => {
                  setShowMenu(false)
                  onEdit(category)
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Sửa
              </button>
              <button
                onClick={() => {
                  setShowMenu(false)
                  onDelete(category.id)
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-error hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => {
            const grandchildren = allCategories.filter((c) => c.parentId === child.id)
            return (
              <CategoryNode
                key={child.id}
                category={child}
                children={grandchildren}
                allCategories={allCategories}
                level={level + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                onAdd={onAdd}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export function CategoryTree({
  categories,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}: CategoryTreeProps) {
  // Get root categories
  const rootCategories = categories.filter((c) => !c.parentId)

  return (
    <div className="py-2">
      {/* All items option */}
      <div
        className={`
          flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer
          hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
          ${selectedId === null ? 'bg-brand/10 text-brand' : ''}
        `}
        onClick={() => onSelect(null)}
      >
        <Folder className="w-4 h-4" />
        <span className="text-sm font-medium">Tất cả</span>
      </div>

      {/* Category tree */}
      {rootCategories.map((category) => {
        const children = categories.filter((c) => c.parentId === category.id)
        return (
          <CategoryNode
            key={category.id}
            category={category}
            children={children}
            allCategories={categories}
            level={0}
            selectedId={selectedId}
            onSelect={onSelect}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )
      })}

      {/* Add category button */}
      <button
        onClick={() => onAdd(null)}
        className="
          flex items-center gap-2 w-full py-1.5 px-2 mt-2 rounded-lg
          text-[var(--text-secondary)] hover:text-brand hover:bg-gray-100 dark:hover:bg-gray-700
          transition-colors text-sm
        "
      >
        <Plus className="w-4 h-4" />
        Thêm danh mục
      </button>
    </div>
  )
}
