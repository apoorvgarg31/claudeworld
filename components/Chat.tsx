'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useClaudeStore } from '@/lib/store'

const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:3030'

interface ChatMessage {
  id: string
  type: 'user' | 'claude' | 'system'
  content: string
  timestamp: number
}

export default function Chat() {
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [expanded, setExpanded] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const { isConnected } = useClaudeStore()

  // Subscribe to claude events (from socket.ts -> window dispatch)
  useEffect(() => {
    const handleClaudeEvent = (event: CustomEvent) => {
      const { type, payload } = event.detail
      
      // Handle chat_response from MCP server (primary method)
      if (type === 'chat_response' && payload?.response) {
        setMessages(prev => [...prev, {
          id: `claude-${Date.now()}`,
          type: 'claude',
          content: payload.response,
          timestamp: Date.now(),
        }])
      }
      
      // Handle thinking status
      if (type === 'thinking' && payload?.status) {
        setMessages(prev => [...prev, {
          id: `thinking-${Date.now()}`,
          type: 'system',
          content: `💭 ${payload.status}`,
          timestamp: Date.now(),
        }])
      }
      
      // Handle stop event with response (fallback from hooks)
      if (type === 'stop' && payload?.response) {
        setMessages(prev => [...prev, {
          id: `claude-${Date.now()}`,
          type: 'claude',
          content: payload.response.trim(),
          timestamp: Date.now(),
        }])
      }
      
      // Handle tool use events (optional: show what Claude is doing)
      if (type === 'tool_use' && payload?.tool) {
        setMessages(prev => [...prev, {
          id: `tool-${Date.now()}`,
          type: 'system',
          content: `🔧 Using: ${payload.tool}`,
          timestamp: Date.now(),
        }])
      }
    }

    window.addEventListener('claude:event' as any, handleClaudeEvent)
    return () => window.removeEventListener('claude:event' as any, handleClaudeEvent)
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, autoScroll])

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setAutoScroll(isAtBottom)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || sending) return

    const userMessage = prompt.trim()
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      type: 'user',
      content: userMessage,
      timestamp: Date.now(),
    }])
    
    setPrompt('')
    setSending(true)
    setExpanded(true) // Auto-expand when sending

    try {
      const res = await fetch(`${BRIDGE_URL}/api/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage, session: 'claude' }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          type: 'system',
          content: `❌ Failed to send: ${data.error || 'Unknown error'}`,
          timestamp: Date.now(),
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'system',
        content: '❌ Failed to connect to bridge. Is it running?',
        timestamp: Date.now(),
      }])
    } finally {
      setSending(false)
    }
  }

  // Request initial output when connected
  useEffect(() => {
    if (isConnected) {
      // Request current tmux output via socket
      const socket = (window as any).__claudeSocket
      if (socket) {
        socket.emit('request:output')
        socket.on('claude:output', (data: { output: string }) => {
          if (data.output) {
            // Parse and display as initial context
            setMessages([{
              id: 'initial',
              type: 'system',
              content: '📺 Connected to Claude session',
              timestamp: Date.now(),
            }])
          }
        })
      }
    }
  }, [isConnected])

  return (
    <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 transition-all ${expanded ? 'h-[60vh]' : 'h-auto'}`}>
      {/* Chat Messages (expandable) */}
      {expanded && (
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="h-[calc(100%-80px)] mb-2 overflow-y-auto bg-[#0a0a0f]/95 backdrop-blur-lg border border-[#2a2a4a] rounded-xl"
        >
          <div className="p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Send a message to Claude below</p>
              </div>
            ) : (
              messages.map(msg => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                      msg.type === 'user' 
                        ? 'bg-[#D97706] text-white rounded-br-none' 
                        : msg.type === 'claude'
                        ? 'bg-[#1a1a2e] text-gray-200 rounded-bl-none border border-[#2a2a4a]'
                        : 'bg-[#2a2a4a]/50 text-gray-400 text-xs'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                      {msg.content}
                    </pre>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 bg-[#1a1a2e]/90 backdrop-blur border border-[#2a2a4a] rounded-xl px-4 py-3">
          {/* Expand/Collapse button */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-white transition-colors"
            title={expanded ? 'Collapse chat' : 'Expand chat'}
          >
            {expanded ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
          
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={isConnected ? "Send a message to Claude..." : "Waiting for connection..."}
            disabled={sending || !isConnected}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          />
          
          {/* Connection indicator */}
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          
          <button
            type="submit"
            disabled={sending || !prompt.trim() || !isConnected}
            className="px-4 py-1.5 bg-[#D97706] hover:bg-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {sending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : 'Send'}
          </button>
        </div>
        
        {!expanded && (
          <p className="text-center text-xs text-gray-500 mt-2">
            Press <kbd className="px-1 py-0.5 bg-[#2a2a4a] rounded text-gray-400">↑</kbd> to expand chat • 
            tmux: <code className="text-gray-400">tmux new -s claude && claude</code>
          </p>
        )}
      </form>
    </div>
  )
}
