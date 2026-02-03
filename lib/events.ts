import { useClaudeStore } from './store'

/**
 * Event types from Claude Code
 */
export type ClaudeEventType = 
  | 'skill_start' 
  | 'skill_end' 
  | 'tool_use' 
  | 'xp_gain' 
  | 'level_up' 
  | 'task_complete'
  | 'error'

/**
 * Event payload
 */
export interface ClaudeWorldEvent {
  type: ClaudeEventType
  payload: {
    skill?: string      // "dev-workflow", "orchestra", etc.
    tool?: string       // "Read", "Write", "Exec", etc.
    xp?: number         // Amount of XP gained
    level?: number      // New level (for level_up)
    message?: string    // For errors or info
    duration?: number   // How long an action took (ms)
  }
  timestamp: number
}

/**
 * XP rewards for different actions
 */
const XP_REWARDS = {
  skill_use: 50,
  tool_use: 10,
  task_complete: 100,
  commit: 25,
  error_fixed: 30,
} as const

/**
 * Tool room mappings
 */
const TOOL_ROOMS: Record<string, string> = {
  'Read': 'Read',
  'Write': 'Write', 
  'Edit': 'Write',
  'Exec': 'Exec',
  'exec': 'Exec',
  'browser': 'Browse',
  'web_search': 'Browse',
  'web_fetch': 'Browse',
}

/**
 * Handle incoming Claude Code events
 */
export function handleClaudeEvent(event: ClaudeWorldEvent): void {
  const store = useClaudeStore.getState()
  
  switch (event.type) {
    case 'skill_start':
      handleSkillStart(event.payload.skill!)
      break
      
    case 'skill_end':
      handleSkillEnd(event.payload.skill!)
      break
      
    case 'tool_use':
      handleToolUse(event.payload.tool!)
      break
      
    case 'xp_gain':
      handleXPGain(event.payload.xp!)
      break
      
    case 'level_up':
      handleLevelUp(event.payload.level!)
      break
      
    case 'task_complete':
      handleTaskComplete()
      break
      
    case 'error':
      handleError(event.payload.message || 'Unknown error')
      break
      
    default:
      console.warn('Unknown event type:', event.type)
  }
}

/**
 * Skill started - move character to skill room
 */
function handleSkillStart(skill: string): void {
  const store = useClaudeStore.getState()
  
  console.log(`🚶 Claude walking to ${skill}...`)
  store.setRoom(skill)
  
  // Check for first skill achievement
  store.unlockAchievement('first_steps')
  
  // Check for time-based achievements
  const hour = new Date().getHours()
  if (hour >= 0 && hour < 6) {
    store.unlockAchievement('early_bird')
  } else if (hour >= 0 || hour >= 23) {
    store.unlockAchievement('night_owl')
  }
}

/**
 * Skill ended - return to lobby
 */
function handleSkillEnd(skill: string): void {
  const store = useClaudeStore.getState()
  
  console.log(`✅ ${skill} completed, returning to lobby`)
  store.setRoom(null)
  
  // Award skill completion XP
  store.addXP(XP_REWARDS.skill_use)
}

/**
 * Tool used - briefly visit tool station
 */
function handleToolUse(tool: string): void {
  const store = useClaudeStore.getState()
  const room = TOOL_ROOMS[tool] || tool
  
  console.log(`🔧 Using tool: ${tool} at ${room}`)
  
  // If not in a skill room, go to tool station
  if (!store.currentRoom || TOOL_ROOMS[store.currentRoom]) {
    store.setRoom(room)
    
    // Return after brief moment (tools are quick)
    setTimeout(() => {
      const current = useClaudeStore.getState().currentRoom
      if (current === room) {
        store.setRoom(null)
      }
    }, 2000)
  }
  
  // Award tool XP
  store.addXP(XP_REWARDS.tool_use)
  
  // Track tools used for achievement
  trackToolUsage(tool)
}

/**
 * Track tool usage for achievements
 */
const toolsUsedThisSession = new Set<string>()

function trackToolUsage(tool: string): void {
  toolsUsedThisSession.add(tool)
  
  // Check if all tools used
  const allTools = ['Read', 'Write', 'Exec', 'Browse']
  const usedAll = allTools.every(t => 
    toolsUsedThisSession.has(t) || 
    toolsUsedThisSession.has(TOOL_ROOMS[t])
  )
  
  if (usedAll) {
    useClaudeStore.getState().unlockAchievement('tool_master')
  }
}

/**
 * XP gained from external source
 */
function handleXPGain(amount: number): void {
  const store = useClaudeStore.getState()
  store.addXP(amount)
}

/**
 * Level up event (usually calculated client-side, but can come from bridge)
 */
function handleLevelUp(level: number): void {
  const store = useClaudeStore.getState()
  store.setShowLevelUp(true)
  
  // Hide celebration after 3 seconds
  setTimeout(() => {
    useClaudeStore.getState().setShowLevelUp(false)
  }, 3000)
}

/**
 * Task completed - big XP reward
 */
function handleTaskComplete(): void {
  const store = useClaudeStore.getState()
  store.addXP(XP_REWARDS.task_complete)
}

/**
 * Error occurred
 */
function handleError(message: string): void {
  console.error('Claude Code error:', message)
  // Could show error toast in UI
}

/**
 * Manually trigger events (for testing)
 */
export const testEvents = {
  skillStart: (skill: string) => handleSkillStart(skill),
  skillEnd: (skill: string) => handleSkillEnd(skill),
  toolUse: (tool: string) => handleToolUse(tool),
  addXP: (amount: number) => handleXPGain(amount),
  taskComplete: () => handleTaskComplete(),
}

// Expose for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).__claudeTestEvents = testEvents
}
