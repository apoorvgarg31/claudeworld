/**
 * ClaudeWorld Bridge Server
 * 
 * Simple WebSocket bridge for sending prompts to Claude Code via tmux.
 * Run with: npm run bridge
 */

import { Server } from 'socket.io'
import { createServer } from 'http'
import { exec } from 'child_process'

const PORT = process.env.BRIDGE_PORT || 3030
const TMUX_SESSION = process.env.TMUX_SESSION || 'claude'

// Create HTTP server
const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      status: 'ok', 
      clients: io.engine.clientsCount,
      tmuxSession: TMUX_SESSION
    }))
    return
  }

  // Send prompt to Claude via tmux
  if (req.url === '/api/prompt' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const { prompt, session = TMUX_SESSION } = JSON.parse(body)
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing prompt' }))
          return
        }
        
        // Send to tmux session
        const escaped = prompt.replace(/'/g, "'\\''")
        exec(`tmux send-keys -t ${session} -l '${escaped}' && sleep 0.1 && tmux send-keys -t ${session} Enter`, (err) => {
          if (err) {
            console.error('tmux error:', err.message)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'tmux not available or session not found' }))
            return
          }
          console.log(`📤 Sent to tmux: "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}"`)
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

  // Event endpoint (for hooks)
  if (req.url === '/api/event' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const event = JSON.parse(body)
        console.log(`📡 Event: ${event.type}`, event.payload?.tool || '')
        io.emit('claude:event', { ...event, timestamp: Date.now() })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
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

// WebSocket server
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`)
  
  socket.on('client:ready', () => {
    socket.emit('claude:event', { type: 'connected', timestamp: Date.now() })
  })
  
  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`)
  })
})

// Start
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  🚀 ClaudeWorld Bridge                               ║
║                                                      ║
║  Send prompts: POST http://localhost:${PORT}/api/prompt ║
║  Events:       POST http://localhost:${PORT}/api/event  ║
║                                                      ║
║  tmux session: ${TMUX_SESSION.padEnd(38)}║
╚══════════════════════════════════════════════════════╝
`)
})

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...')
  process.exit(0)
})
