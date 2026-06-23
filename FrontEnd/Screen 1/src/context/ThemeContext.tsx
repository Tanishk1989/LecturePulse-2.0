import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'
export type ThemePreference = 'light' | 'dark' | 'system'
export type FontSize = 'small' | 'medium' | 'large'

interface ThemeContextValue {
  theme: Theme
  themePreference: ThemePreference
  setThemePreference: (pref: ThemePreference) => void
  toggleTheme: () => void
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem('lecturepulse:theme_preference') as ThemePreference | null
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved

    // Fallback: check legacy
    const legacy = localStorage.getItem('lecturepulse:theme')
    if (legacy === 'light' || legacy === 'dark') return legacy

    return 'system'
  })

  const [theme, setTheme] = useState<Theme>('dark')

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const saved = localStorage.getItem('lecturepulse:font_size') as FontSize | null
    if (saved === 'small' || saved === 'medium' || saved === 'large') return saved
    return 'medium'
  })

  // Handle Theme Preference
  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateTheme = () => {
      let resolved: Theme = 'dark'
      if (themePreference === 'system') {
        resolved = mediaQuery.matches ? 'dark' : 'light'
      } else {
        resolved = themePreference
      }

      setTheme(resolved)
      if (resolved === 'light') {
        root.classList.add('light')
      } else {
        root.classList.remove('light')
      }
      localStorage.setItem('lecturepulse:theme_preference', themePreference)
      localStorage.setItem('lecturepulse:theme', resolved)
    }

    updateTheme()

    if (themePreference === 'system') {
      mediaQuery.addEventListener('change', updateTheme)
      return () => mediaQuery.removeEventListener('change', updateTheme)
    }
  }, [themePreference])

  // Handle Font Size
  useEffect(() => {
    const root = document.documentElement
    if (fontSize === 'small') {
      root.style.fontSize = '14px'
    } else if (fontSize === 'large') {
      root.style.fontSize = '18px'
    } else {
      root.style.fontSize = '16px' // medium
    }
    localStorage.setItem('lecturepulse:font_size', fontSize)
  }, [fontSize])

  const toggleTheme = () => {
    setThemePreference((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themePreference,
        setThemePreference,
        toggleTheme,
        fontSize,
        setFontSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
