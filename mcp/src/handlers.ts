/**
 * ClaudeWorld Event Handlers
 * 
 * Maps Claude Code activity to XP rewards
 */

import type { ClaudeEventType, ClaudeWorldEvent, SkillName, ToolName } from './types.js'

/**
 * XP rewards for different event types
 */
export const XP_REWARDS: Record<string, number> = {
  tool_use: 10,
  commit: 50,
  skill_start: 25,
  skill_end: 25,
  task_complete: 100,
  task_start: 5,
  task_end: 10,
  error: 0,
  connected: 0,
  xp_gain: 0,  // Meta event, XP specified in payload
  level_up: 0  // Meta event, no XP
}

/**
 * Bonus XP for specific tools (on top of base tool_use XP)
 */
export const TOOL_BONUSES: Partial<Record<ToolName, number>> = {
  Write: 5,     // Creating files is valuable
  Edit: 3,      // Editing takes precision
  exec: 2,      // Running commands
  browser: 5,   // Browser automation is complex
}

/**
 * Bonus XP for specific skills
 */
export const SKILL_BONUSES: Partial<Record<SkillName, number>> = {
  'dev-workflow': 10,
  'orchestra': 15,
  'git-ops': 5,
  'code-review': 10,
  'testing': 10,
  'debugging': 15,
}

/**
 * Calculate XP for an event
 */
export function calculateXP(event: ClaudeWorldEvent): number {
  const baseXP = XP_REWARDS[event.type] ?? 0
  
  // If event has explicit XP, use that
  if (event.payload.xp !== undefined) {
    return event.payload.xp
  }
  
  let bonusXP = 0
  
  // Add tool bonuses
  if (event.type === 'tool_use' && event.payload.tool) {
    bonusXP += TOOL_BONUSES[event.payload.tool as ToolName] ?? 0
  }
  
  // Add skill bonuses
  if ((event.type === 'skill_start' || event.type === 'skill_end') && event.payload.skill) {
    bonusXP += SKILL_BONUSES[event.payload.skill as SkillName] ?? 0
  }
  
  return baseXP + bonusXP
}

/**
 * Create a tool_use event
 */
export function createToolUseEvent(tool: ToolName, duration?: number): ClaudeWorldEvent {
  const event: ClaudeWorldEvent = {
    type: 'tool_use',
    payload: { tool },
    timestamp: Date.now()
  }
  if (duration !== undefined) {
    event.payload.duration = duration
  }
  event.payload.xp = calculateXP(event)
  return event
}

/**
 * Create a commit event
 */
export function createCommitEvent(branch?: string, files?: string[]): ClaudeWorldEvent {
  const event: ClaudeWorldEvent = {
    type: 'commit',
    payload: { branch, files },
    timestamp: Date.now()
  }
  event.payload.xp = calculateXP(event)
  return event
}

/**
 * Create a skill start event
 */
export function createSkillStartEvent(skill: SkillName): ClaudeWorldEvent {
  const event: ClaudeWorldEvent = {
    type: 'skill_start',
    payload: { skill },
    timestamp: Date.now()
  }
  event.payload.xp = calculateXP(event)
  return event
}

/**
 * Create a skill end event
 */
export function createSkillEndEvent(skill: SkillName, duration?: number): ClaudeWorldEvent {
  const event: ClaudeWorldEvent = {
    type: 'skill_end',
    payload: { skill, duration },
    timestamp: Date.now()
  }
  event.payload.xp = calculateXP(event)
  return event
}

/**
 * Create a task complete event
 */
export function createTaskCompleteEvent(task: string): ClaudeWorldEvent {
  const event: ClaudeWorldEvent = {
    type: 'task_complete',
    payload: { task },
    timestamp: Date.now()
  }
  event.payload.xp = calculateXP(event)
  return event
}

/**
 * Create an error event
 */
export function createErrorEvent(message: string): ClaudeWorldEvent {
  return {
    type: 'error',
    payload: { message },
    timestamp: Date.now()
  }
}

/**
 * Create an XP gain event (direct XP award)
 */
export function createXPGainEvent(xp: number, message?: string): ClaudeWorldEvent {
  return {
    type: 'xp_gain',
    payload: { xp, message },
    timestamp: Date.now()
  }
}

/**
 * Create a level up event
 */
export function createLevelUpEvent(level: number): ClaudeWorldEvent {
  return {
    type: 'level_up',
    payload: { level },
    timestamp: Date.now()
  }
}

/**
 * Create a connected event
 */
export function createConnectedEvent(): ClaudeWorldEvent {
  return {
    type: 'connected',
    payload: { message: 'MCP server connected to ClaudeWorld' },
    timestamp: Date.now()
  }
}
