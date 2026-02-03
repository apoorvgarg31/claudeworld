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

// Create HTTP server
const httpServer = createServer((req, res) => {
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
  
  res.writeHead(404)
  res.end('Not found')
})

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Track connected UI clients
const clients = new Map<string, { connectedAt: number; version?: string }>()

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
