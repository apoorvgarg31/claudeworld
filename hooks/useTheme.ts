'use client'

import { useState, useEffect, useCallback } from 'react'

type Theme = 'dark' | 'light'

/**
 * Hook for managing dark/light theme
 * Persists preference to localStorage and applies class to <html>
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    // Read saved preference or default to dark
    const saved = localStorage.getItem('claudeworld-theme') as Theme | null
    const initial = saved || 'dark'
    setThemeState(initial)
    document.documentElement.classList.toggle('dark', initial === 'dark')
    document.documentElement.classList.toggle('light', initial === 'light')
  }, [])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('claudeworld-theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    document.documentElement.classList.toggle('light', newTheme === 'light')
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' }
}

export default useTheme
