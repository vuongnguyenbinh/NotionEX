/**
 * Dropdown menu component with fixed positioning to avoid clipping
 * Uses fixed position to render outside of overflow containers
 */

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface DropdownMenuProps {
  trigger: ReactNode
  children: ReactNode
  className?: string
  triggerClassName?: string
}

interface MenuPosition {
  top: number
  left: number
  right?: number
}

export function DropdownMenu({
  trigger,
  children,
  className = '',
  triggerClassName = '',
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const menuWidth = 112 // w-28 = 7rem = 112px

      // Position below trigger, aligned to right edge
      setPosition({
        top: rect.bottom + 4, // mt-1 equivalent
        left: Math.max(8, rect.right - menuWidth), // Ensure doesn't go off screen
      })
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {isOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
              }}
            />
            {/* Menu */}
            <div
              ref={menuRef}
              className={`fixed z-[9999] py-1 w-28 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg animate-fade-in ${className}`}
              style={{ top: position.top, left: position.left }}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </div>
          </>,
          document.body
        )}
    </>
  )
}

// Menu item component for consistency
interface DropdownMenuItemProps {
  icon?: ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

export function DropdownMenuItem({
  icon,
  label,
  onClick,
  variant = 'default',
}: DropdownMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
        variant === 'danger' ? 'text-error' : ''
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
