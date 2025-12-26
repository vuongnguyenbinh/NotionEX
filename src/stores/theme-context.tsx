import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getSettings, setTheme as saveTheme } from '@/db'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [isLoaded, setIsLoaded] = useState(false)

  // Load theme from DB on mount
  useEffect(() => {
    getSettings().then((s) => {
      setTheme(s.theme)
      setIsLoaded(true)
    })
  }, [])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    await saveTheme(newTheme)
  }

  // Prevent flash of wrong theme
  if (!isLoaded) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
