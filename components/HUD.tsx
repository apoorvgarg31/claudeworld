'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useClaudeStore } from '@/lib/store'

/**
 * HUD (Heads-Up Display) Component
 * 
 * Displays:
 * - Current level and XP progress
 * - Active skill/tool name
 * - Streak counter
 * - Mini achievement notifications
 */
export default function HUD() {
  const { 
    level, 
    xp, 
    xpToNextLevel, 
    currentRoom, 
    streak,
    recentAchievement 
  } = useClaudeStore()

  const xpPercentage = (xp / xpToNextLevel) * 100

  return (
    <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
      <div className="flex items-start justify-between max-w-7xl mx-auto">
        {/* Left: Level & XP */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-4 pointer-events-auto"
        >
          <div className="flex items-center gap-4">
            {/* Level Badge */}
            <div className="level-badge w-14 h-14 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="text-xs text-blue-200 opacity-80">LVL</div>
                <div className="text-xl font-bold text-white">{level}</div>
              </div>
            </div>

            {/* XP Bar */}
            <div className="w-48">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Experience</span>
                <span className="text-xs text-claude-xp font-mono">
                  {xp.toLocaleString()} / {xpToNextLevel.toLocaleString()}
                </span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full xp-bar rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Center: Current Activity */}
        <AnimatePresence mode="wait">
          {currentRoom && (
            <motion.div
              key={currentRoom}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="glass rounded-2xl px-6 py-3 pointer-events-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Active</div>
                  <div className="text-lg font-semibold text-white">{currentRoom}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right: Stats */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-4 pointer-events-auto"
        >
          <div className="flex items-center gap-6">
            {/* Streak */}
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <span className="text-2xl">🔥</span>
                <span className="text-xl font-bold text-orange-400">{streak}</span>
              </div>
              <div className="text-xs text-gray-400">Day Streak</div>
            </div>

            {/* Divider */}
            <div className="w-px h-10 bg-white/10" />

            {/* Session Stats */}
            <div className="text-center">
              <div className="text-xl font-bold text-white">
                {useClaudeStore.getState().sessionXP.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Session XP</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Achievement Toast */}
      <AnimatePresence>
        {recentAchievement && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 glass rounded-2xl p-4 pointer-events-auto"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">{recentAchievement.icon}</div>
              <div>
                <div className="text-xs text-claude-xp uppercase tracking-wider">Achievement Unlocked!</div>
                <div className="text-lg font-semibold text-white">{recentAchievement.name}</div>
                <div className="text-sm text-gray-400">{recentAchievement.description}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
