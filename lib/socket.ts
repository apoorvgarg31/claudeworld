import { useClaudeStore } from './store'
import { handleClaudeEvent, ClaudeWorldEvent } from './events'
import type { Socket } from 'socket.io-client'

let socket: Socket | null = null
let io: typeof import('socket.io-client').io | null = null

/**
 * Default WebSocket server URL
 * Can be overridden via environment variable
 */
const SOCKET_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:3030'

/**
 * Initialize WebSocket connection to Claude Code bridge
 */
export async function initializeSocket(): Promise<() => void> {
  // Only run on client
  if (typeof window === 'undefined') {
    return () => {}
  }

  // Dynamic import to avoid SSR issues
  if (!io) {
    const socketIO = await import('socket.io-client')
    io = socketIO.io
  }

  if (socket?.connected) {
    console.log('🔌 Socket already connected')
    return () => {}
  }

  console.log(`🔌 Connecting to bridge at ${SOCKET_URL}...`)

  socket = io(SOCKET_URL, {
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    transports: ['websocket', 'polling'],
  })

  // Connection events
  socket.on('connect', () => {
    console.log('✅ Connected to Claude Code bridge!')
    useClaudeStore.getState().setConnected(true)
    useClaudeStore.getState().updateStreak()
    
    // Send handshake
    socket?.emit('client:ready', {
      version: '0.1.0',
      timestamp: Date.now(),
    })

    // Fetch initial registry
    fetch(`${SOCKET_URL}/api/registry`)
      .then(res => res.json())
      .then(data => {
        console.log('📦 Registry loaded:', data)
        useClaudeStore.getState().setRegistry(data.tools || [], data.skills || [])
      })
      .catch(err => console.warn('Failed to load registry:', err))
  })

  socket.on('disconnect', (reason) => {
    console.log(`❌ Disconnected: ${reason}`)
    useClaudeStore.getState().setConnected(false)
    useClaudeStore.getState().setRoom(null)
  })

  socket.on('connect_error', (error) => {
    console.warn('🔴 Connection error:', error.message)
  })

  socket.on('reconnect', (attempt) => {
    console.log(`🔄 Reconnected after ${attempt} attempts`)
  })

  socket.on('reconnect_failed', () => {
    console.error('💀 Failed to reconnect to bridge')
  })

  // Claude Code events
  socket.on('claude:event', (event: ClaudeWorldEvent) => {
    console.log('📨 Received event:', event.type, event.payload)
    handleClaudeEvent(event)
    
    // Forward claude_output to window for Chat component
    if (event.type === 'claude_output' && event.payload) {
      window.dispatchEvent(new CustomEvent('claude:output', { 
        detail: event.payload 
      }))
    }
  })
  
  // Expose socket globally for Chat component
  ;(window as any).__claudeSocket = socket

  // Registry updates (new tools/skills registered)
  socket.on('registry:update', (data: { tools: any[]; skills: any[] }) => {
    console.log('📦 Registry updated:', data)
    useClaudeStore.getState().setRegistry(data.tools || [], data.skills || [])
  })

  // Heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    if (socket?.connected) {
      socket.emit('heartbeat', { timestamp: Date.now() })
    }
  }, 30000)

  // Cleanup function
  return () => {
    clearInterval(heartbeatInterval)
    if (socket) {
      socket.disconnect()
      socket = null
    }
  }
}

/**
 * Get current socket instance
 */
export function getSocket(): Socket | null {
  return socket
}

/**
 * Send event to bridge
 */
export function emitEvent(event: string, data: any): void {
  if (socket?.connected) {
    socket.emit(event, data)
  } else {
    console.warn('Cannot emit event: not connected')
  }
}

/**
 * Check if connected
 */
export function isConnected(): boolean {
  return socket?.connected ?? false
}
