'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface XPPopupProps {
  id: string
  amount: number
  x?: number
  y?: number
  type?: 'xp' | 'level' | 'achievement'
}

/**
 * XPPopup Component
 * 
 * Animated popup that appears when XP is gained.
 * Floats upward and fades out.
 */
export default function XPPopup({ id, amount, x, y, type = 'xp' }: XPPopupProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  // Position randomly if not specified
  const posX = x ?? Math.random() * 60 + 20 // 20-80%
  const posY = y ?? 40 // Default to middle-ish

  const colors = {
    xp: 'text-yellow-400',
    level: 'text-blue-400',
    achievement: 'text-purple-400',
  }

  const icons = {
    xp: '✨',
    level: '⭐',
    achievement: '🏆',
  }

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: 0, 
        scale: 0.5,
        x: '-50%'
      }}
      animate={{ 
        opacity: [0, 1, 1, 0], 
        y: -80,
        scale: [0.5, 1.2, 1, 0.8],
      }}
      transition={{ 
        duration: 1.5, 
        ease: 'easeOut',
        times: [0, 0.1, 0.5, 1]
      }}
      className="absolute pointer-events-none"
      style={{ 
        left: `${posX}%`, 
        top: `${posY}%`,
      }}
    >
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-full
        bg-black/50 backdrop-blur-sm border border-white/10
        ${colors[type]}
      `}>
        <span className="text-xl">{icons[type]}</span>
        <span className="font-bold text-lg">
          +{amount} {type === 'xp' ? 'XP' : type === 'level' ? 'LEVEL' : ''}
        </span>
      </div>
    </motion.div>
  )
}

/**
 * LevelUpCelebration Component
 * Full-screen celebration when leveling up
 */
export function LevelUpCelebration({ level, onComplete }: { level: number; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 10, stiffness: 100 }}
        className="text-center"
      >
        {/* Particle effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: '50%', 
                y: '50%', 
                scale: 0 
              }}
              animate={{ 
                x: `${Math.random() * 100}%`, 
                y: `${Math.random() * 100}%`,
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ 
                duration: 2, 
                delay: i * 0.05,
                ease: 'easeOut'
              }}
              className="absolute text-3xl"
            >
              {['✨', '🌟', '⭐', '💫', '🎉'][i % 5]}
            </motion.div>
          ))}
        </div>

        {/* Level badge */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            boxShadow: [
              '0 0 20px rgba(59, 130, 246, 0.5)',
              '0 0 60px rgba(59, 130, 246, 0.8)',
              '0 0 20px rgba(59, 130, 246, 0.5)',
            ]
          }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="level-badge w-32 h-32 rounded-3xl flex items-center justify-center mx-auto mb-6"
        >
          <div className="text-center">
            <div className="text-sm text-blue-200 opacity-80">LEVEL</div>
            <div className="text-5xl font-bold text-white">{level}</div>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold text-white mb-2"
        >
          Level Up! 🎉
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-400"
        >
          Keep coding to reach the next level!
        </motion.p>
      </motion.div>
    </motion.div>
  )
}
