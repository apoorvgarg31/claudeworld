'use client'

import { useState, useEffect, useRef, FormEvent, useCallback } from 'react'
import { useClaudeStore } from '@/lib/store'
import ReactMarkdown from 'react-markdown'

const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:3030'

// Tools to show in chat (skip noisy ones)
const INTERESTING_TOOLS = ['Read', 'Write', 'Edit', 'exec', 'Exec', 'browser', 'web_search', 'reply']

interface ChatMessage {
  id: string
  type: 'user' | 'claude' | 'system' | 'tool'
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

  // Add message helper - skip empty content
  const addMessage = useCallback((msg: ChatMessage) => {
    // Skip empty messages
    if (!msg.content || !msg.content.trim()) return
    
    // Simple dedupe - check last 5 messages for same content
    setMessages(prev => {
      const recent = prev.slice(-5)
      const isDupe = recent.some(m => m.type === msg.type && m.content === msg.content)
      if (isDupe) return prev
      return [...prev, msg]
    })
  }, [])

  // Subscribe to claude events
  useEffect(() => {
    const handleClaudeEvent = (event: CustomEvent) => {
      const { type, payload } = event.detail
      
      // Debug: log all events
      console.log('📨 Event:', type, payload)
      
      // Handle chat_response from MCP server
      if (type === 'chat_response' && payload?.response) {
        addMessage({
          id: `claude-${Date.now()}-${Math.random()}`,
          type: 'claude',
          content: payload.response,
          timestamp: Date.now(),
        })
        return
      }
      
      // Handle thinking status
      if (type === 'thinking' && payload?.status) {
        addMessage({
          id: `thinking-${Date.now()}`,
          type: 'system',
          content: `💭 ${payload.status}`,
          timestamp: Date.now(),
        })
        return
      }
      
      // Handle tool use events (only interesting ones)
      if (type === 'tool_use' && payload?.tool) {
        const tool = payload.tool
        if (INTERESTING_TOOLS.some(t => tool.includes(t))) {
          addMessage({
            id: `tool-${Date.now()}-${Math.random()}`,
            type: 'tool',
            content: tool,
            timestamp: Date.now(),
          })
        }
        return
      }
      
      // Handle stop event (fallback)
      if (type === 'stop' && payload?.response && payload.response.trim()) {
        addMessage({
          id: `claude-${Date.now()}-${Math.random()}`,
          type: 'claude',
          content: payload.response.trim(),
          timestamp: Date.now(),
        })
      }
    }

    window.addEventListener('claude:event' as any, handleClaudeEvent)
    return () => window.removeEventListener('claude:event' as any, handleClaudeEvent)
  }, [addMessage])

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, autoScroll])

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
      setAutoScroll(scrollHeight - scrollTop - clientHeight < 50)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || sending) return

    const userMessage = prompt.trim()
    
    addMessage({
      id: `user-${Date.now()}`,
      type: 'user',
      content: userMessage,
      timestamp: Date.now(),
    })
    
    setPrompt('')
    setSending(true)
    setExpanded(true)

    try {
      const res = await fetch(`${BRIDGE_URL}/api/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage, session: 'claude' }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        addMessage({
          id: `error-${Date.now()}`,
          type: 'system',
          content: `❌ ${data.error || 'Unknown error'}`,
          timestamp: Date.now(),
        })
      }
    } catch (err) {
      addMessage({
        id: `error-${Date.now()}`,
        type: 'system',
        content: '❌ Bridge not connected',
        timestamp: Date.now(),
      })
    } finally {
      setSending(false)
    }
  }

  // Connection message
  useEffect(() => {
    if (isConnected) {
      addMessage({
        id: 'connected',
        type: 'system',
        content: '🟢 Connected to Claude',
        timestamp: Date.now(),
      })
    }
  }, [isConnected, addMessage])

  return (
    <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 transition-all ${expanded ? 'h-[60vh]' : 'h-auto'}`}>
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
                <p className="text-xs mt-1">Send a message to Claude</p>
              </div>
            ) : (
              messages.map(msg => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.type === 'tool' ? (
                    // Tool indicator - compact inline
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="text-[10px]">🔧</span>
                      <span className="font-mono">{msg.content}</span>
                    </div>
                  ) : (
                    <div 
                      className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                        msg.type === 'user' 
                          ? 'bg-[#D97706] text-white rounded-br-none' 
                          : msg.type === 'claude'
                          ? 'bg-[#1a1a2e] text-gray-200 rounded-bl-none border border-[#2a2a4a]'
                          : 'bg-transparent text-gray-500 text-xs py-1'
                      }`}
                    >
                      {msg.type === 'claude' ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                              code: ({className, children}) => {
                                const isBlock = className?.includes('language-')
                                return isBlock ? (
                                  <pre className="bg-black/30 p-2 rounded text-xs overflow-x-auto">
                                    <code>{children}</code>
                                  </pre>
                                ) : (
                                  <code className="bg-black/30 px-1 py-0.5 rounded text-xs">{children}</code>
                                )
                              },
                              ul: ({children}) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                              li: ({children}) => <li className="mb-0.5">{children}</li>,
                              a: ({href, children}) => <a href={href} className="text-[#D97706] hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 bg-[#1a1a2e]/90 backdrop-blur border border-[#2a2a4a] rounded-xl px-4 py-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expanded ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
            </svg>
          </button>
          
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={isConnected ? "Message Claude..." : "Connecting..."}
            disabled={sending || !isConnected}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          />
          
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          
          <button
            type="submit"
            disabled={sending || !prompt.trim() || !isConnected}
            className="px-4 py-1.5 bg-[#D97706] hover:bg-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
