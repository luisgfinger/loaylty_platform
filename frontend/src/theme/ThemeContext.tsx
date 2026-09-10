import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type Theme } from './theme-context'
const STORAGE_KEY = 'loyalty-platform.theme'
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme }, [theme])
  const value = useMemo(() => ({ theme, toggleTheme: () => setTheme((current) => { const next = current === 'light' ? 'dark' : 'light'; window.localStorage.setItem(STORAGE_KEY, next); return next }) }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
function getInitialTheme(): Theme { const stored = window.localStorage.getItem(STORAGE_KEY); if (stored === 'light' || stored === 'dark') return stored; return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' }
