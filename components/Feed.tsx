'use client'

import { useEffect, useState, useRef } from 'react'
import { useClaudeStore } from '@/lib/store'

interface FeedItem {
  id: string
  type: 'prompt' | 'response' | 'tool' | 'error'
  content: string
  timestamp: number
  tool?: string
}

export default function Feed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [isOpen, setIsOpen] = useState(true)
  const feedRef = useRef<HTMLDivElement>(null)
  const { isConnected } = useClaudeStore()

  useEffect(() => {
    // Listen for events from the bridge
    const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:3030'
    
    const connectSocket = async () => {
      const { io } = await import('socket.io-client')
      const socket = io(BRIDGE_URL)

      socket.on('claude:event', (event: any) => {
        const newItem: FeedItem = {
          id: `${Date.now()}-${Math.random()}`,
          type: event.type === 'tool_use' ? 'tool' : 
                event.type === 'response' ? 'response' :
                event.type === 'prompt' ? 'prompt' : 'tool',
          content: event.payload?.response || 
                   event.payload?.prompt ||
                   event.payload?.tool ||
                   JSON.stringify(event.payload),
          timestamp: event.timestamp || Date.now(),
          tool: event.payload?.tool,
        }
        
        setItems(prev => [...prev.slice(-50), newItem]) // Keep last 50
      })

      return () => socket.disconnect()
    }

    connectSocket()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [items])

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className={`absolute top-4 right-4 w-96 transition-all ${isOpen ? 'h-[60vh]' : 'h-10'}`}>
      {/* Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between bg-[#1a1a2e]/95 backdrop-blur border border-[#2a2a4a] rounded-t-xl px-4 py-2 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Activity Feed</span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <span className="text-gray-400 text-xs">{isOpen ? '▼' : '▲'}</span>
      </div>

      {/* Feed content */}
      {isOpen && (
        <div 
          ref={feedRef}
          className="bg-[#0f0f1a]/95 backdrop-blur border border-t-0 border-[#2a2a4a] rounded-b-xl p-3 overflow-y-auto"
          style={{ height: 'calc(100% - 40px)' }}
        >
          {items.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              <p>No activity yet</p>
              <p className="text-xs mt-1">Events will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div 
                  key={item.id}
                  className={`p-2 rounded-lg text-sm ${
                    item.type === 'prompt' 
                      ? 'bg-blue-500/20 border border-blue-500/30' 
                      : item.type === 'response'
                      ? 'bg-green-500/20 border border-green-500/30'
                      : item.type === 'tool'
                      ? 'bg-orange-500/20 border border-orange-500/30'
                      : 'bg-red-500/20 border border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${
                      item.type === 'prompt' ? 'text-blue-400' :
                      item.type === 'response' ? 'text-green-400' :
                      item.type === 'tool' ? 'text-orange-400' : 'text-red-400'
                    }`}>
                      {item.type === 'prompt' ? '📤 You' : 
                       item.type === 'response' ? '🤖 Claude' :
                       item.type === 'tool' ? `🔧 ${item.tool}` : '❌ Error'}
                    </span>
                    <span className="text-xs text-gray-500">{formatTime(item.timestamp)}</span>
                  </div>
                  <p className="text-gray-200 text-xs whitespace-pre-wrap break-words">
                    {item.content.length > 500 ? item.content.slice(0, 500) + '...' : item.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
