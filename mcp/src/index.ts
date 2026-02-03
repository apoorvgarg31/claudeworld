#!/usr/bin/env node
/**
 * ClaudeWorld MCP Server
 * 
 * Bridges Claude Code activity to the ClaudeWorld visualization
 * 
 * - Listens for Claude Code events via MCP tools
 * - Emits events to the ClaudeWorld bridge server (ws://localhost:3030)
 * - Exposes MCP tools: send_xp, send_event, get_status
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import WebSocket from 'ws'
import type { ClaudeWorldEvent, ClaudeEventType } from './types.js'
import { 
  createToolUseEvent,
  createCommitEvent,
  createSkillStartEvent,
  createSkillEndEvent,
  createTaskCompleteEvent,
  createXPGainEvent,
  createConnectedEvent,
  createErrorEvent,
  calculateXP
} from './handlers.js'

// Bridge server URL
const BRIDGE_URL = process.env.CLAUDEWORLD_BRIDGE_URL || 'ws://localhost:3030'

// State
let ws: WebSocket | null = null
let totalXP = 0
let level = 1
let connected = false
const eventQueue: ClaudeWorldEvent[] = []

/**
 * Calculate level from total XP
 * Each level requires progressively more XP
 */
function calculateLevel(xp: number): number {
  // Level formula: level N requires N*100 XP from previous level
  // Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, Level 4: 600 XP, etc.
  let requiredXP = 0
  let lvl = 1
  while (xp >= requiredXP + lvl * 100) {
    requiredXP += lvl * 100
    lvl++
  }
  return lvl
}

/**
 * XP needed for next level
 */
function xpForNextLevel(): number {
  let requiredXP = 0
  for (let l = 1; l < level; l++) {
    requiredXP += l * 100
  }
  return requiredXP + level * 100
}

/**
 * Connect to the bridge WebSocket server
 */
function connectToBridge(): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return
  }

  try {
    ws = new WebSocket(BRIDGE_URL)

    ws.on('open', () => {
      connected = true
      console.error(`[ClaudeWorld MCP] Connected to bridge at ${BRIDGE_URL}`)
      
      // Send connected event
      sendEvent(createConnectedEvent())
      
      // Flush queued events
      while (eventQueue.length > 0) {
        const event = eventQueue.shift()
        if (event) sendEvent(event)
      }
    })

    ws.on('close', () => {
      connected = false
      console.error('[ClaudeWorld MCP] Disconnected from bridge')
      // Attempt reconnect after 5 seconds
      setTimeout(connectToBridge, 5000)
    })

    ws.on('error', (err) => {
      console.error('[ClaudeWorld MCP] WebSocket error:', err.message)
      connected = false
    })

    ws.on('message', (data) => {
      // Handle any messages from bridge (future: sync state)
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'sync') {
          totalXP = msg.xp ?? totalXP
          level = msg.level ?? level
        }
      } catch {
        // Ignore parse errors
      }
    })
  } catch (err) {
    console.error('[ClaudeWorld MCP] Failed to connect:', err)
    setTimeout(connectToBridge, 5000)
  }
}

/**
 * Send an event to the bridge
 */
function sendEvent(event: ClaudeWorldEvent): void {
  // Track XP
  if (event.payload.xp) {
    totalXP += event.payload.xp
    const newLevel = calculateLevel(totalXP)
    if (newLevel > level) {
      level = newLevel
      // Send level up event
      const levelUpEvent: ClaudeWorldEvent = {
        type: 'level_up',
        payload: { level, xp: totalXP },
        timestamp: Date.now()
      }
      queueOrSend(levelUpEvent)
    }
  }

  queueOrSend(event)
}

/**
 * Queue event if not connected, send if connected
 */
function queueOrSend(event: ClaudeWorldEvent): void {
  if (connected && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event))
  } else {
    eventQueue.push(event)
    // Don't let queue grow unbounded
    if (eventQueue.length > 100) {
      eventQueue.shift()
    }
  }
}

/**
 * Create and configure the MCP server
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: 'claudeworld',
    version: '0.1.0'
  })

  // Tool: send_xp - Award XP directly
  server.tool(
    'send_xp',
    'Award XP to the ClaudeWorld avatar',
    {
      xp: z.number().int().positive().describe('Amount of XP to award'),
      reason: z.string().optional().describe('Reason for the XP award')
    },
    async ({ xp, reason }) => {
      const event = createXPGainEvent(xp, reason)
      sendEvent(event)
      
      return {
        content: [{
          type: 'text',
          text: `✨ Awarded ${xp} XP${reason ? ` for: ${reason}` : ''}. Total: ${totalXP} XP (Level ${level})`
        }]
      }
    }
  )

  // Tool: send_event - Send any ClaudeWorld event
  server.tool(
    'send_event',
    'Send a ClaudeWorld event to the visualization',
    {
      event_type: z.enum([
        'tool_use', 'commit', 'skill_start', 'skill_end',
        'task_start', 'task_end', 'task_complete', 'error'
      ]).describe('Type of event'),
      tool: z.string().optional().describe('Tool name (for tool_use events)'),
      skill: z.string().optional().describe('Skill name (for skill events)'),
      task: z.string().optional().describe('Task description'),
      branch: z.string().optional().describe('Git branch (for commit events)'),
      files: z.array(z.string()).optional().describe('Files changed (for commit events)'),
      message: z.string().optional().describe('Message (for error events)'),
      duration: z.number().optional().describe('Duration in ms')
    },
    async ({ event_type, tool, skill, task, branch, files, message, duration }) => {
      let event: ClaudeWorldEvent
      
      switch (event_type) {
        case 'tool_use':
          event = createToolUseEvent(tool || 'unknown', duration)
          break
        case 'commit':
          event = createCommitEvent(branch, files)
          break
        case 'skill_start':
          event = createSkillStartEvent(skill || 'unknown')
          break
        case 'skill_end':
          event = createSkillEndEvent(skill || 'unknown', duration)
          break
        case 'task_complete':
          event = createTaskCompleteEvent(task || 'Task completed')
          break
        case 'error':
          event = createErrorEvent(message || 'Unknown error')
          break
        default:
          event = {
            type: event_type as ClaudeEventType,
            payload: { task, message },
            timestamp: Date.now()
          }
      }
      
      sendEvent(event)
      
      const xpGained = event.payload.xp || 0
      return {
        content: [{
          type: 'text',
          text: `📡 Sent ${event_type} event${xpGained ? ` (+${xpGained} XP)` : ''}`
        }]
      }
    }
  )

  // Tool: get_status - Get current ClaudeWorld status
  server.tool(
    'get_status',
    'Get current ClaudeWorld avatar status',
    {},
    async () => {
      const nextLevelXP = xpForNextLevel()
      const progress = Math.round((totalXP / nextLevelXP) * 100)
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            connected,
            totalXP,
            level,
            nextLevelXP,
            progress: `${progress}%`,
            queuedEvents: eventQueue.length
          }, null, 2)
        }]
      }
    }
  )

  // Tool: track_tool - Quick tool usage tracking
  server.tool(
    'track_tool',
    'Track a tool usage for XP (shorthand for send_event with tool_use)',
    {
      tool: z.string().describe('Name of the tool used'),
      duration: z.number().optional().describe('Duration in ms')
    },
    async ({ tool, duration }) => {
      const event = createToolUseEvent(tool, duration)
      sendEvent(event)
      
      return {
        content: [{
          type: 'text',
          text: `🔧 Tracked ${tool} usage (+${event.payload.xp} XP)`
        }]
      }
    }
  )

  // Tool: track_commit - Quick commit tracking
  server.tool(
    'track_commit',
    'Track a git commit for XP',
    {
      branch: z.string().optional().describe('Git branch name'),
      files: z.array(z.string()).optional().describe('Files changed')
    },
    async ({ branch, files }) => {
      const event = createCommitEvent(branch, files)
      sendEvent(event)
      
      return {
        content: [{
          type: 'text',
          text: `📝 Tracked commit (+${event.payload.xp} XP)${branch ? ` on ${branch}` : ''}`
        }]
      }
    }
  )

  return server
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.error('[ClaudeWorld MCP] Starting server...')
  
  // Connect to bridge (don't wait, run in background)
  connectToBridge()
  
  // Create and run MCP server
  const server = createServer()
  const transport = new StdioServerTransport()
  
  await server.connect(transport)
  console.error('[ClaudeWorld MCP] Server running on stdio')
}

main().catch((err) => {
  console.error('[ClaudeWorld MCP] Fatal error:', err)
  process.exit(1)
})
