import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Achievement definition
 */
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt?: number
}

/**
 * XP Popup for animations
 */
export interface XPPopup {
  id: string
  amount: number
  x?: number
  y?: number
  type: 'xp' | 'level' | 'achievement'
}

/**
 * Tool/Skill definition
 */
export interface RoomDef {
  name: string
  icon: string
  color: string
}

/**
 * ClaudeWorld State
 */
interface ClaudeState {
  // Connection
  isConnected: boolean
  setConnected: (connected: boolean) => void

  // Registry (dynamic tools & skills)
  tools: RoomDef[]
  skills: RoomDef[]
  setRegistry: (tools: RoomDef[], skills: RoomDef[]) => void

  // Character state
  currentRoom: string | null
  isWorking: boolean
  setRoom: (room: string | null) => void
  setWorking: (working: boolean) => void

  // XP & Leveling
  level: number
  xp: number
  xpToNextLevel: number
  totalXP: number
  sessionXP: number
  addXP: (amount: number) => void
  calculateXPToNextLevel: (level: number) => number

  // Streak
  streak: number
  lastActiveDate: string | null
  updateStreak: () => void

  // Achievements
  achievements: Achievement[]
  recentAchievement: Achievement | null
  unlockAchievement: (id: string) => void
  clearRecentAchievement: () => void

  // XP Popups (for UI animations)
  xpPopups: XPPopup[]
  addXPPopup: (popup: Omit<XPPopup, 'id'>) => void
  removeXPPopup: (id: string) => void

  // Level up celebration
  showLevelUp: boolean
  setShowLevelUp: (show: boolean) => void

  // Reset session
  resetSession: () => void
}

/**
 * Achievement definitions
 */
const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_steps', name: 'First Steps', description: 'Use your first skill', icon: '👶' },
  { id: 'tool_master', name: 'Tool Master', description: 'Use all tools in one session', icon: '🔧' },
  { id: 'night_owl', name: 'Night Owl', description: 'Code after midnight', icon: '🦉' },
  { id: 'early_bird', name: 'Early Bird', description: 'Code before 6 AM', icon: '🐦' },
  { id: 'streak_3', name: 'On Fire', description: 'Maintain a 3-day streak', icon: '🔥' },
  { id: 'streak_7', name: 'Streak Lord', description: 'Maintain a 7-day streak', icon: '👑' },
  { id: 'streak_30', name: 'Unstoppable', description: 'Maintain a 30-day streak', icon: '💎' },
  { id: 'level_5', name: 'Rising Star', description: 'Reach level 5', icon: '⭐' },
  { id: 'level_10', name: 'Pro Coder', description: 'Reach level 10', icon: '🚀' },
  { id: 'level_25', name: 'Elite', description: 'Reach level 25', icon: '🏆' },
  { id: 'level_50', name: 'Legend', description: 'Reach level 50', icon: '🌟' },
  { id: 'xp_1000', name: 'Thousand Club', description: 'Earn 1,000 total XP', icon: '💰' },
  { id: 'xp_10000', name: 'XP Mogul', description: 'Earn 10,000 total XP', icon: '💎' },
]

/**
 * XP curve: each level requires more XP
 * Level 1->2: 100 XP
 * Level 2->3: 150 XP
 * Level 3->4: 225 XP
 * ... (1.5x multiplier each level)
 */
const calculateXPToNextLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

/**
 * Zustand store with persistence
 */
export const useClaudeStore = create<ClaudeState>()(
  persist(
    (set, get) => ({
      // Connection
      isConnected: false,
      setConnected: (connected) => set({ isConnected: connected }),

      // Registry (dynamic tools & skills)
      tools: [],
      skills: [],
      setRegistry: (tools, skills) => set({ tools, skills }),

      // Character state
      currentRoom: null,
      isWorking: false,
      setRoom: (room) => set({ currentRoom: room, isWorking: !!room }),
      setWorking: (working) => set({ isWorking: working }),

      // XP & Leveling
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      totalXP: 0,
      sessionXP: 0,
      calculateXPToNextLevel,
      
      addXP: (amount) => {
        const state = get()
        let newXP = state.xp + amount
        let newLevel = state.level
        let newXPToNext = state.xpToNextLevel
        let leveledUp = false

        // Check for level up (can level multiple times)
        while (newXP >= newXPToNext) {
          newXP -= newXPToNext
          newLevel++
          newXPToNext = calculateXPToNextLevel(newLevel)
          leveledUp = true
        }

        set({ 
          xp: newXP, 
          level: newLevel,
          xpToNextLevel: newXPToNext,
          totalXP: state.totalXP + amount,
          sessionXP: state.sessionXP + amount,
          showLevelUp: leveledUp,
        })

        // Add XP popup
        get().addXPPopup({ amount, type: 'xp' })

        // Check for level achievements
        if (leveledUp) {
          if (newLevel >= 5) get().unlockAchievement('level_5')
          if (newLevel >= 10) get().unlockAchievement('level_10')
          if (newLevel >= 25) get().unlockAchievement('level_25')
          if (newLevel >= 50) get().unlockAchievement('level_50')
        }

        // Check for XP achievements
        const totalXP = state.totalXP + amount
        if (totalXP >= 1000) get().unlockAchievement('xp_1000')
        if (totalXP >= 10000) get().unlockAchievement('xp_10000')
      },

      // Streak
      streak: 0,
      lastActiveDate: null,
      updateStreak: () => {
        const state = get()
        const today = new Date().toDateString()
        const yesterday = new Date(Date.now() - 86400000).toDateString()

        if (state.lastActiveDate === today) {
          // Already active today, no change
          return
        }

        if (state.lastActiveDate === yesterday) {
          // Continuing streak
          const newStreak = state.streak + 1
          set({ streak: newStreak, lastActiveDate: today })
          
          // Check streak achievements
          if (newStreak >= 3) get().unlockAchievement('streak_3')
          if (newStreak >= 7) get().unlockAchievement('streak_7')
          if (newStreak >= 30) get().unlockAchievement('streak_30')
        } else {
          // Streak broken, start new
          set({ streak: 1, lastActiveDate: today })
        }
      },

      // Achievements
      achievements: ACHIEVEMENTS,
      recentAchievement: null,
      
      unlockAchievement: (id) => {
        const state = get()
        const achievement = state.achievements.find(a => a.id === id)
        
        if (achievement && !achievement.unlockedAt) {
          const updated = state.achievements.map(a => 
            a.id === id ? { ...a, unlockedAt: Date.now() } : a
          )
          set({ 
            achievements: updated,
            recentAchievement: { ...achievement, unlockedAt: Date.now() }
          })

          // Clear recent achievement after 4 seconds
          setTimeout(() => {
            get().clearRecentAchievement()
          }, 4000)
        }
      },
      
      clearRecentAchievement: () => set({ recentAchievement: null }),

      // XP Popups
      xpPopups: [],
      addXPPopup: (popup) => {
        const id = `popup-${Date.now()}-${Math.random()}`
        set(state => ({ 
          xpPopups: [...state.xpPopups, { ...popup, id }] 
        }))
        
        // Auto-remove after animation
        setTimeout(() => {
          get().removeXPPopup(id)
        }, 2000)
      },
      removeXPPopup: (id) => {
        set(state => ({ 
          xpPopups: state.xpPopups.filter(p => p.id !== id) 
        }))
      },

      // Level up
      showLevelUp: false,
      setShowLevelUp: (show) => set({ showLevelUp: show }),

      // Reset session
      resetSession: () => set({ sessionXP: 0 }),
    }),
    {
      name: 'claudeworld-storage',
      partialize: (state) => ({
        // Only persist these fields
        level: state.level,
        xp: state.xp,
        xpToNextLevel: state.xpToNextLevel,
        totalXP: state.totalXP,
        streak: state.streak,
        lastActiveDate: state.lastActiveDate,
        achievements: state.achievements,
      }),
    }
  )
)

export default useClaudeStore
