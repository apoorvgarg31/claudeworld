'use client'

import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  variant?: 'spinner' | 'dots' | 'pulse'
}

const sizeMap = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
}

const borderSizeMap = {
  sm: 'border-2',
  md: 'border-3',
  lg: 'border-4',
}

/**
 * Reusable loading spinner with multiple variants
 */
export default function LoadingSpinner({ 
  size = 'md', 
  label, 
  variant = 'spinner' 
}: LoadingSpinnerProps) {
  if (variant === 'dots') {
    return (
      <div className="flex items-center gap-2" role="status" aria-label={label || 'Loading'}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} 
                        rounded-full bg-anthropic-orange`}
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
        {label && <span className="text-sm text-gray-400 ml-2">{label}</span>}
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className="flex items-center gap-3" role="status" aria-label={label || 'Loading'}>
        <motion.div
          className={`${sizeMap[size]} rounded-full bg-anthropic-orange/30`}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {label && <span className="text-sm text-gray-400">{label}</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3" role="status" aria-label={label || 'Loading'}>
      <div
        className={`${sizeMap[size]} ${borderSizeMap[size]} 
                    border-anthropic-orange border-t-transparent rounded-full animate-spin`}
      />
      {label && <span className="text-sm text-gray-400">{label}</span>}
    </div>
  )
}
