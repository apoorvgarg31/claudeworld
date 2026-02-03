/**
 * ClaudeWorld Bridge Server
 * 
 * Bridges between:
 * - Browser (Socket.IO) - for the ClaudeWorld UI
 * - MCP Server (WebSocket) - for Claude Code events
 * - tmux - for sending prompts to Claude Code
 * 
 * Run with: npm run bridge
 */

import { Server as SocketIOServer } from 'socket.io'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { exec } from 'child_process'

const PORT = process.env.BRIDGE_PORT || 3030
const TMUX_SESSION = process.env.TMUX_SESSION || 'claude'

// Track connected clients
const mcpClients = new Set<WebSocket>()

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
      browserClients: io.engine.clientsCount,
      mcpClients: mcpClients.size,
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

  // Event endpoint (for hooks - fallback)
  if (req.url === '/api/event' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const event = JSON.parse(body)
        console.log(`📡 HTTP Event: ${event.type}`, event.payload?.tool || event.payload?.response?.slice(0, 30) || '')
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

  res.writeHead(404)
  res.end('Not found')
})

// Socket.IO server for browser clients
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

io.on('connection', (socket) => {
  console.log(`🌐 Browser connected: ${socket.id}`)
  
  socket.on('client:ready', () => {
    socket.emit('claude:event', { type: 'connected', timestamp: Date.now() })
  })
  
  socket.on('disconnect', () => {
    console.log(`🌐 Browser disconnected: ${socket.id}`)
  })
})

// Raw WebSocket server for MCP clients (uses same HTTP server, different path)
const wss = new WebSocketServer({ noServer: true })

wss.on('connection', (ws) => {
  console.log(`🔧 MCP client connected`)
  mcpClients.add(ws)
  
  ws.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString())
      console.log(`📡 MCP Event: ${event.type}`, event.payload?.tool || event.payload?.response?.slice(0, 30) || '')
      broadcastEvent(event)
    } catch (e) {
      console.error('Invalid MCP message:', e)
    }
  })
  
  ws.on('close', () => {
    console.log(`🔧 MCP client disconnected`)
    mcpClients.delete(ws)
  })
  
  ws.on('error', (err) => {
    console.error('MCP WebSocket error:', err.message)
    mcpClients.delete(ws)
  })
})

// Handle upgrade requests - route to Socket.IO or raw WebSocket
httpServer.on('upgrade', (request, socket, head) => {
  const pathname = request.url || ''
  
  // Socket.IO handles its own upgrades via /socket.io/
  if (pathname.startsWith('/socket.io')) {
    return // Let Socket.IO handle it
  }
  
  // All other WebSocket connections go to raw WS (for MCP)
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request)
  })
})

/**
 * Broadcast an event to all connected clients (browser + MCP)
 */
function broadcastEvent(event: any): void {
  const eventWithTimestamp = { ...event, timestamp: event.timestamp || Date.now() }
  
  // Send to browser clients via Socket.IO
  io.emit('claude:event', eventWithTimestamp)
  
  // Send to MCP clients via raw WebSocket (for sync)
  const msg = JSON.stringify(eventWithTimestamp)
  mcpClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  })
}

// Start
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  🚀 ClaudeWorld Bridge                               ║
║                                                      ║
║  Browser (Socket.IO): ws://localhost:${PORT}/socket.io  ║
║  MCP Server (WS):     ws://localhost:${PORT}            ║
║  HTTP Events:         POST /api/event               ║
║  Send Prompt:         POST /api/prompt              ║
║                                                      ║
║  tmux session: ${TMUX_SESSION.padEnd(38)}║
╚══════════════════════════════════════════════════════╝
`)
})

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...')
  process.exit(0)
})
