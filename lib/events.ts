import { useClaudeStore } from './store'
import { soundManager } from './sounds'

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
  | 'task_spawn'    // Subagent spawned
  | 'task_end'      // Subagent finished
  | 'error'
  | 'connected'
  | 'claude_output' // Terminal output from Claude
  | 'prompt'        // User sent a prompt

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
    context?: string    // File path or command being worked on
    taskId?: string     // Subagent task ID
    file?: string       // File being read/written
    command?: string    // Command being executed
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
 * Tool room mappings - maps Claude Code tool names to room names
 * Room names must match the tools array in store.ts
 */
const TOOL_ROOMS: Record<string, string> = {
  // Read tools
  'Read': 'Read',
  'read': 'Read',
  'read_file': 'Read',
  
  // Write tools  
  'Write': 'Write',
  'write': 'Write',
  'Edit': 'Write',
  'edit': 'Write',
  'write_file': 'Write',
  
  // Exec/Bash tools
  'Exec': 'Exec',
  'exec': 'Exec',
  'Bash': 'Exec',
  'bash': 'Exec',
  'shell': 'Exec',
  'Task': 'Exec',  // Task spawning
  'task': 'Exec',
  
  // Browser tools
  'Browser': 'Browser',
  'browser': 'Browser',
  'web_search': 'Browser',
  'web_fetch': 'Browser',
  'WebSearch': 'Browser',
  'WebFetch': 'Browser',
  
  // Search tools
  'Search': 'Search',
  'search': 'Search',
  'Grep': 'Search',
  'grep': 'Search',
  'Glob': 'Search',
  'glob': 'Search',
}

/**
 * Get room name for a tool, handling MCP tools and unknown tools
 */
function getToolRoom(tool: string): string {
  // Direct mapping
  if (TOOL_ROOMS[tool]) {
    return TOOL_ROOMS[tool]
  }
  
  // Handle MCP tools (mcp__plugin_name__tool_name)
  if (tool.startsWith('mcp__')) {
    const parts = tool.split('__')
    const mcpTool = parts[parts.length - 1] // Get last part
    
    // Map common MCP tool actions
    if (mcpTool.includes('read') || mcpTool.includes('list')) return 'Read'
    if (mcpTool.includes('write') || mcpTool.includes('create')) return 'Write'
    if (mcpTool.includes('exec') || mcpTool.includes('run')) return 'Exec'
    if (mcpTool.includes('search') || mcpTool.includes('find')) return 'Search'
    
    // Default MCP tools to Read (most are info-gathering)
    return 'Read'
  }
  
  // Unknown tool - try to guess based on name
  const lowerTool = tool.toLowerCase()
  if (lowerTool.includes('read') || lowerTool.includes('get') || lowerTool.includes('list')) return 'Read'
  if (lowerTool.includes('write') || lowerTool.includes('edit') || lowerTool.includes('create')) return 'Write'
  if (lowerTool.includes('exec') || lowerTool.includes('run') || lowerTool.includes('bash')) return 'Exec'
  if (lowerTool.includes('search') || lowerTool.includes('find') || lowerTool.includes('grep')) return 'Search'
  if (lowerTool.includes('browser') || lowerTool.includes('web') || lowerTool.includes('fetch')) return 'Browser'
  
  // Fallback to Exec (most general-purpose)
  return 'Exec'
}

/**
 * Handle incoming Claude Code events
 */
export function handleClaudeEvent(event: ClaudeWorldEvent): void {
  const store = useClaudeStore.getState()
  
  switch (event.type) {
    case 'connected':
      soundManager.connected()
      break
      
    case 'skill_start':
      handleSkillStart(event.payload.skill!)
      break
      
    case 'skill_end':
      handleSkillEnd(event.payload.skill!)
      break
      
    case 'tool_use':
      handleToolUse(event.payload.tool!, event.payload)
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

    case 'task_spawn':
      handleTaskSpawn(event.payload.taskId!, event.payload.tool)
      break

    case 'task_end':
      handleTaskEnd(event.payload.taskId!)
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
function handleToolUse(tool: string, payload: ClaudeWorldEvent['payload']): void {
  const store = useClaudeStore.getState()
  const room = getToolRoom(tool)
  
  console.log(`🔧 Using tool: ${tool} → room: ${room}`)
  
  // Set context (file path or command)
  const context = payload.file || payload.command || payload.context || null
  store.setContext(context)
  
  // Play tool sound
  soundManager.toolUse(room)
  
  // If not in a skill room, go to tool station
  if (!store.currentRoom || TOOL_ROOMS[store.currentRoom]) {
    store.setRoom(room)
    
    // Return after brief moment (tools are quick)
    setTimeout(() => {
      const current = useClaudeStore.getState().currentRoom
      if (current === room) {
        store.setRoom(null)
        store.setContext(null)
      }
    }, 3000)
  }
  
  // Award tool XP
  store.addXP(XP_REWARDS.tool_use)
  
  // Track tools used for achievement
  trackToolUsage(tool)
}

/**
 * Track tool usage for achievements (tracks room names)
 */
const roomsUsedThisSession = new Set<string>()

function trackToolUsage(tool: string): void {
  const room = getToolRoom(tool)
  roomsUsedThisSession.add(room)
  
  // Check if all main rooms used
  const allRooms = ['Read', 'Write', 'Exec', 'Browser']
  const usedAll = allRooms.every(r => roomsUsedThisSession.has(r))
  
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
  soundManager.xpGain(amount)
}

/**
 * Level up event (usually calculated client-side, but can come from bridge)
 */
function handleLevelUp(level: number): void {
  const store = useClaudeStore.getState()
  store.setShowLevelUp(true)
  soundManager.levelUp()
  
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
  soundManager.achievement()
}

/**
 * Error occurred
 */
function handleError(message: string): void {
  console.error('Claude Code error:', message)
  soundManager.error()
}

/**
 * Subagent/Task spawned
 */
function handleTaskSpawn(taskId: string, tool?: string): void {
  const store = useClaudeStore.getState()
  const room = tool ? getToolRoom(tool) : 'Exec'
  
  console.log(`👶 Subagent spawned: ${taskId} → ${room}`)
  store.spawnSubagent(taskId, room)
  soundManager.subagentSpawn()
}

/**
 * Subagent/Task completed
 */
function handleTaskEnd(taskId: string): void {
  const store = useClaudeStore.getState()
  
  console.log(`✅ Subagent finished: ${taskId}`)
  
  // Keep subagent visible briefly before removing
  setTimeout(() => {
    useClaudeStore.getState().removeSubagent(taskId)
  }, 2000)
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
