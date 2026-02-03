/**
 * ClaudeWorld Bridge Server
 * 
 * WebSocket bridge between Claude Code CLI and the ClaudeWorld UI.
 * This server receives events from Claude Code (via MCP or CLI hook)
 * and forwards them to all connected browser clients.
 * 
 * Run with: npm run bridge
 */

import { Server } from 'socket.io'
import { createServer } from 'http'

const PORT = process.env.BRIDGE_PORT || 3030

// Dynamic registry - tools and skills register themselves
const registry = {
  tools: new Map<string, { name: string; icon: string; color: string }>(),
  skills: new Map<string, { name: string; icon: string; color: string }>(),
}

// Default tools (always available in Claude Code)
const DEFAULT_TOOLS = [
  { name: 'Read', icon: '📖', color: '#3B82F6' },
  { name: 'Write', icon: '✏️', color: '#10B981' },
  { name: 'Edit', icon: '✂️', color: '#8B5CF6' },
  { name: 'Exec', icon: '⚡', color: '#F59E0B' },
  { name: 'Browser', icon: '🌐', color: '#EC4899' },
  { name: 'Search', icon: '🔍', color: '#06B6D4' },
]

// Initialize default tools
DEFAULT_TOOLS.forEach(t => registry.tools.set(t.name.toLowerCase(), t))

// Create HTTP server
const httpServer = createServer((req, res) => {
  // CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Simple health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      status: 'ok', 
      clients: io.engine.clientsCount,
      uptime: process.uptime() 
    }))
    return
  }
  
  // API endpoint to get registry (tools & skills)
  if (req.url === '/api/registry' && req.method === 'GET') {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    })
    res.end(JSON.stringify({
      tools: Array.from(registry.tools.values()),
      skills: Array.from(registry.skills.values()),
    }))
    return
  }

  // API endpoint to register a skill
  if (req.url === '/api/register' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const { type, name, icon, color } = JSON.parse(body)
        if (type === 'skill') {
          registry.skills.set(name.toLowerCase(), { name, icon: icon || '🔧', color: color || '#666' })
          console.log(`📦 Skill registered: ${name}`)
        } else if (type === 'tool') {
          registry.tools.set(name.toLowerCase(), { name, icon: icon || '🔧', color: color || '#666' })
          console.log(`🔧 Tool registered: ${name}`)
        }
        // Broadcast registry update
        io.emit('registry:update', {
          tools: Array.from(registry.tools.values()),
          skills: Array.from(registry.skills.values()),
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  // API endpoint to send events
  if (req.url === '/api/event' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const event = JSON.parse(body)
        broadcastEvent(event)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }
  
  // API endpoint to send prompt to Claude via tmux
  if (req.url === '/api/prompt' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const { prompt, session = 'claude' } = JSON.parse(body)
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing prompt' }))
          return
        }
        
        // Send to tmux session
        const { exec } = require('child_process')
        const escaped = prompt.replace(/'/g, "'\\''")
        exec(`tmux send-keys -t ${session} -l '${escaped}' && sleep 0.1 && tmux send-keys -t ${session} Enter`, (err: any) => {
          if (err) {
            console.error('tmux error:', err.message)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to send to tmux', details: err.message }))
            return
          }
          console.log(`📤 Sent prompt to tmux session '${session}'`)
          
          // Broadcast prompt to all clients
          broadcastEvent({
            type: 'prompt',
            payload: { prompt },
            timestamp: Date.now(),
          })
          
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true }))
        })
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Track connected UI clients
const clients = new Map<string, { connectedAt: number; version?: string }>()

// Tmux output capture state
let lastTmuxOutput = ''
let tmuxCaptureInterval: NodeJS.Timeout | null = null
const TMUX_SESSION = process.env.TMUX_SESSION || 'claude'
// Disable auto-capture by default (too noisy), use manual refresh
const AUTO_CAPTURE_ENABLED = process.env.AUTO_CAPTURE === 'true'

/**
 * Filter out ALL terminal noise, keep only Claude's actual text responses
 */
function filterOutput(text: string): string {
  const lines = text.split('\n')
  const filtered = lines.filter(line => {
    const l = line.trim()
    if (!l) return false
    
    // Skip ALL these patterns:
    // Progress/spinners
    if (l.match(/^[●◐◑◒◓⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏▸▹►▻⬆⬇⬅➡❯→]/)) return false
    // Box drawing
    if (l.match(/^[│├└┌┐┘┬┴┼─╭╮╯╰]+/) || l.match(/[│├└┌┐┘┬┴┼─]+$/)) return false
    // Status bars and prompts
    if (l.includes('❯') || l.includes('▸')) return false
    if (l.includes('/gsd:') || l.includes('Opus 4.5') || l.includes('claudeworld')) return false
    if (l.includes('weekly limit') || l.includes('resets Feb')) return false
    // Progress bars
    if (l.match(/[█░▓▒]/)) return false
    if (l.includes('Skedaddling') || l.includes('Stop hook')) return false
    // Tool/MCP stuff  
    if (l.includes('Tool') || l.includes('MCP') || l.includes('plugin:')) return false
    if (l.includes('PreToolUse') || l.includes('PostToolUse')) return false
    if (l.includes('tool_use') || l.includes('tool_result')) return false
    // Errors and system messages
    if (l.includes('bad interpreter') || l.includes('.sh:')) return false
    if (l.includes('ctrl+') || l.includes('Ctrl+')) return false
    // Input prompts
    if (l.match(/^\d+\.\s*(Yes|No|Always)/i)) return false
    if (l.includes('Do you want to proceed')) return false
    
    // Keep if it's plain text (Claude's actual response)
    return true
  })
  return filtered.join('\n').trim()
}

/**
 * Capture tmux pane output and broadcast new content
 */
function startTmuxCapture(): void {
  if (tmuxCaptureInterval) return
  
  const { exec } = require('child_process')
  
  tmuxCaptureInterval = setInterval(() => {
    // Only capture if we have connected clients
    if (clients.size === 0) return
    
    exec(`tmux capture-pane -t ${TMUX_SESSION} -p -S -50`, { maxBuffer: 1024 * 1024 }, (err: any, stdout: string) => {
      if (err) return // tmux session might not exist
      
      const output = stdout.trim()
      
      // Only broadcast if content changed
      if (output !== lastTmuxOutput && output.length > 0) {
        // Find new content (simple diff - get lines after last known content)
        const lastLines = lastTmuxOutput.split('\n')
        const newLines = output.split('\n')
        
        // Find where new content starts
        let newContent = ''
        if (lastTmuxOutput.length === 0) {
          newContent = output
        } else {
          // Get only truly new lines
          const lastLine = lastLines[lastLines.length - 1]
          const lastLineIdx = newLines.findIndex((line, idx) => 
            idx >= lastLines.length - 1 && line === lastLine
          )
          if (lastLineIdx >= 0 && lastLineIdx < newLines.length - 1) {
            newContent = newLines.slice(lastLineIdx + 1).join('\n')
          } else if (output.length > lastTmuxOutput.length) {
            // Fallback: just get the tail difference
            newContent = newLines.slice(-10).join('\n')
          }
        }
        
        lastTmuxOutput = output
        
        // Filter out tool noise
        const filteredContent = filterOutput(newContent)
        
        if (filteredContent.length > 0) {
          broadcastEvent({
            type: 'claude_output',
            payload: { 
              output: filteredContent,
            },
            timestamp: Date.now(),
          })
        }
      }
    })
  }, 1000) // Poll every 1 second (slower to reduce noise)
  
  console.log(`📺 Started tmux capture for session '${TMUX_SESSION}'`)
}

/**
 * Stop tmux capture
 */
function stopTmuxCapture(): void {
  if (tmuxCaptureInterval) {
    clearInterval(tmuxCaptureInterval)
    tmuxCaptureInterval = null
    console.log('📺 Stopped tmux capture')
  }
}

/**
 * Broadcast event to all connected clients
 */
function broadcastEvent(event: any): void {
  console.log(`📡 Broadcasting: ${event.type}`, event.payload || '')
  io.emit('claude:event', {
    ...event,
    timestamp: event.timestamp || Date.now(),
  })
}

// Socket connection handlers
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`)
  clients.set(socket.id, { connectedAt: Date.now() })
  
  // Start tmux capture when first client connects (if enabled)
  if (clients.size === 1 && AUTO_CAPTURE_ENABLED) {
    startTmuxCapture()
  }

  // Client ready handshake
  socket.on('client:ready', (data) => {
    console.log(`✅ Client ready: ${socket.id}`, data)
    clients.set(socket.id, { 
      connectedAt: Date.now(),
      version: data?.version 
    })
    
    // Send welcome event
    socket.emit('claude:event', {
      type: 'connected',
      payload: { message: 'Welcome to ClaudeWorld!' },
      timestamp: Date.now(),
    })
  })

  // Heartbeat
  socket.on('heartbeat', (data) => {
    socket.emit('heartbeat_ack', { timestamp: Date.now() })
  })

  // Event from CLI (for CLI-direct connection mode)
  socket.on('cli:event', (event) => {
    console.log(`📨 CLI event received:`, event)
    broadcastEvent(event)
  })

  // Disconnect
  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`)
    clients.delete(socket.id)
    
    // Stop tmux capture when no clients
    if (clients.size === 0) {
      stopTmuxCapture()
    }
  })
  
  // Request current tmux output
  socket.on('request:output', () => {
    const { exec } = require('child_process')
    exec(`tmux capture-pane -t ${TMUX_SESSION} -p -S -200`, { maxBuffer: 1024 * 1024 }, (err: any, stdout: string) => {
      if (err) {
        socket.emit('claude:output', { output: '', error: 'tmux session not found' })
        return
      }
      socket.emit('claude:output', { output: stdout.trim() })
    })
  })
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🌍 ClaudeWorld Bridge Server                           ║
║                                                          ║
║   WebSocket: ws://localhost:${PORT}                        ║
║   Health:    http://localhost:${PORT}/health               ║
║   API:       POST http://localhost:${PORT}/api/event       ║
║                                                          ║
║   Ready to connect Claude Code to ClaudeWorld!           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bridge server...')
  io.close()
  process.exit(0)
})

// Export for potential programmatic use
export { io, broadcastEvent }
