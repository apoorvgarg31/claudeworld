'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useClaudeStore } from '@/lib/store'

const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:3030'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export default function ChatSidebar() {
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [thinking, setThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { isConnected } = useClaudeStore()

  // Listen for Claude events (stop = response)
  useEffect(() => {
    const handleClaudeEvent = (event: CustomEvent) => {
      const { type, payload } = event.detail || {}
      
      if (type === 'stop' && payload?.response) {
        setThinking(false)
        setMessages(prev => [...prev, {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: payload.response,
          timestamp: Date.now(),
        }])
      } else if (type === 'tool_use') {
        setThinking(true)
      } else if (type === 'user_prompt') {
        setThinking(true)
      }
    }

    window.addEventListener('claude:event' as any, handleClaudeEvent)
    return () => window.removeEventListener('claude:event' as any, handleClaudeEvent)
  }, [])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (message: string) => {
    if (!message.trim() || sending) return

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: Date.now(),
    }])
    
    setSending(true)
    setThinking(true)

    try {
      const res = await fetch(`${BRIDGE_URL}/api/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message, session: 'claude' }),
      })
      
      if (!res.ok) {
        setThinking(false)
        const data = await res.json()
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          type: 'system',
          content: `❌ ${data.error || 'Failed to send'}`,
          timestamp: Date.now(),
        }])
      }
    } catch (err) {
      setThinking(false)
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'system',
        content: '❌ Bridge not connected. Run: npm run bridge',
        timestamp: Date.now(),
      }])
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    const msg = prompt.trim()
    setPrompt('')
    await sendMessage(msg)
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-12 h-full bg-[#0a0a0f] border-l border-[#1a1a2e] flex items-center justify-center hover:bg-[#1a1a2e] transition-colors"
        title="Open chat"
      >
        <span className="text-gray-400 text-lg">💬</span>
      </button>
    )
  }

  return (
    <div className="w-96 h-full bg-[#0a0a0f] border-l border-[#1a1a2e] flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[#1a1a2e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium text-white">Claude Chat</span>
          {thinking && <span className="text-xs text-amber-400 animate-pulse">thinking...</span>}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setMessages([])}
            className="p-1 hover:bg-[#1a1a2e] rounded"
            title="Clear"
          >
            <span className="text-gray-400 text-sm">🗑️</span>
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 hover:bg-[#1a1a2e] rounded"
          >
            <span className="text-gray-400 text-sm">✕</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-sm">
            <p className="text-lg mb-2">💬</p>
            <p>Chat with Claude here</p>
            <p className="text-xs mt-2 text-gray-600">
              Requires Claude Code hooks to see responses
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id} 
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                msg.type === 'user' 
                  ? 'bg-[#D97706] text-white rounded-br-none' 
                  : msg.type === 'assistant'
                  ? 'bg-[#1a1a2e] text-gray-100 rounded-bl-none border border-[#2a2a4a]'
                  : 'bg-red-900/30 text-red-300 text-xs'
              }`}>
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              </div>
            </div>
          ))
        )}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-[#1a1a2e] text-gray-400 px-3 py-2 rounded-xl rounded-bl-none border border-[#2a2a4a] text-sm">
              <span className="animate-pulse">Claude is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#1a1a2e]">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Message Claude..."
            disabled={sending || !isConnected}
            className="flex-1 bg-[#1a1a2e] text-white placeholder-gray-500 px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#D97706] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !prompt.trim() || !isConnected}
            className="px-4 py-2 bg-[#D97706] hover:bg-[#F59E0B] disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            →
          </button>
        </div>
      </form>
    </div>
  )
}
