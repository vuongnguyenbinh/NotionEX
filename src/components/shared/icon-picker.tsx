/**
 * Icon picker component using lucide-react icons
 * Allows selecting from a predefined set of icons for categories
 * Uses Portal to avoid clipping in overflow containers
 */

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Folder,
  FolderOpen,
  BookOpen,
  Briefcase,
  Home,
  Target,
  Lightbulb,
  FileText,
  Bookmark,
  Star,
  Heart,
  Zap,
  Coffee,
  Code,
  Globe,
  Music,
  Camera,
  Film,
  Palette,
  Gift,
  type LucideIcon,
} from 'lucide-react'

// Available icons for categories
export const CATEGORY_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: 'folder', icon: Folder },
  { name: 'folder-open', icon: FolderOpen },
  { name: 'book-open', icon: BookOpen },
  { name: 'briefcase', icon: Briefcase },
  { name: 'home', icon: Home },
  { name: 'target', icon: Target },
  { name: 'lightbulb', icon: Lightbulb },
  { name: 'file-text', icon: FileText },
  { name: 'bookmark', icon: Bookmark },
  { name: 'star', icon: Star },
  { name: 'heart', icon: Heart },
  { name: 'zap', icon: Zap },
  { name: 'coffee', icon: Coffee },
  { name: 'code', icon: Code },
  { name: 'globe', icon: Globe },
  { name: 'music', icon: Music },
  { name: 'camera', icon: Camera },
  { name: 'film', icon: Film },
  { name: 'palette', icon: Palette },
  { name: 'gift', icon: Gift },
]

// Get icon component by name
export function getIconByName(name: string): LucideIcon {
  const found = CATEGORY_ICONS.find((i) => i.name === name)
  return found?.icon || Folder
}

// Render icon by name
export function CategoryIcon({ name, className = 'w-4 h-4' }: { name: string; className?: string }) {
  const Icon = getIconByName(name)
  return <Icon className={className} />
}

interface IconPickerProps {
  value: string
  onChange: (iconName: string) => void
  size?: 'sm' | 'md'
}

export function IconPicker({ value, onChange, size = 'md' }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, ready: false })
  const SelectedIcon = getIconByName(value)

  const buttonSize = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const gridIconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const gridBtnSize = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'
  const dropdownWidth = 220 // min-w-[200px] + padding

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const dropdownHeight = 200 // approximate height

      // Calculate left position with bounds checking
      let left = rect.left
      if (left + dropdownWidth > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - dropdownWidth - 8)
      }

      // Calculate top position - prefer below, but flip to above if needed
      let top = rect.bottom + 8
      if (top + dropdownHeight > viewportHeight - 8) {
        top = Math.max(8, rect.top - dropdownHeight - 8)
      }

      setPosition({ top, left, ready: true })
    } else {
      setPosition({ top: 0, left: 0, ready: false })
    }
  }, [isOpen])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${buttonSize} flex items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-brand transition-colors`}
      >
        <SelectedIcon className={iconSize} />
      </button>

      {isOpen && position.ready &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <div
              className="fixed p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg z-[9999] animate-fade-in min-w-[200px]"
              style={{ top: position.top, left: position.left }}
            >
              <div className="grid grid-cols-5 gap-2">
                {CATEGORY_ICONS.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onChange(name)
                      setIsOpen(false)
                    }}
                    className={`${gridBtnSize} flex items-center justify-center rounded-md transition-colors ${
                      value === name
                        ? 'bg-brand text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={name}
                  >
                    <Icon className={gridIconSize} />
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
