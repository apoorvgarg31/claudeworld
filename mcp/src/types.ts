/**
 * ClaudeWorld Event Types
 * 
 * These match the events expected by the ClaudeWorld UI
 */

export type ClaudeEventType = 
  | 'skill_start' 
  | 'skill_end' 
  | 'tool_use' 
  | 'commit'
  | 'error'
  | 'task_start'
  | 'task_end'
  | 'xp_gain' 
  | 'level_up' 
  | 'task_complete'
  | 'connected'
  | 'chat_response'  // Claude's reply to user chat
  | 'thinking'       // Claude's working status

export interface ClaudeWorldEvent {
  type: ClaudeEventType
  payload: {
    skill?: string       // "dev-workflow", "orchestra", etc.
    tool?: string        // "Read", "Write", "Exec", etc.
    xp?: number          // Amount of XP gained
    level?: number       // New level (for level_up)
    message?: string     // For errors or info
    duration?: number    // How long an action took (ms)
    branch?: string      // For commits
    files?: string[]     // Files changed in commit
    task?: string        // Task description
    response?: string    // Chat response text
    status?: string      // Thinking status text
  }
  timestamp: number
}

/**
 * Known skills that Claude Code can work with
 */
export const KNOWN_SKILLS = [
  'dev-workflow',
  'orchestra', 
  'git-ops',
  'code-review',
  'documentation',
  'testing',
  'debugging',
  'refactoring',
  'research',
  'planning'
] as const

export type SkillName = typeof KNOWN_SKILLS[number] | string

/**
 * Known tools that Claude Code uses
 */
export const KNOWN_TOOLS = [
  'Read',
  'Write', 
  'Edit',
  'exec',
  'Exec',
  'browser',
  'web_search',
  'web_fetch',
  'message',
  'nodes',
  'image',
  'tts'
] as const

export type ToolName = typeof KNOWN_TOOLS[number] | string
