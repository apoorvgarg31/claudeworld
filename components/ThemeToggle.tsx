'use client'

import { motion } from 'framer-motion'
import { useTheme } from '@/hooks/useTheme'

/**
 * Theme toggle button with animated sun/moon icon
 */
export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-xl glass flex items-center justify-center
                 hover:bg-white/20 transition-colors cursor-pointer"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.span
        key={isDark ? 'moon' : 'sun'}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 90, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="text-lg"
      >
        {isDark ? '🌙' : '☀️'}
      </motion.span>
    </motion.button>
  )
}
