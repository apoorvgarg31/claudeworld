'use client'

import { useState, useRef, FormEvent } from 'react'
import { useClaudeStore } from '@/lib/store'

const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:3030'

interface ChatMessage {
  id: string
  type: 'user' | 'system'
  content: string
  timestamp: number
}

export default function ChatSidebar() {
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { isConnected } = useClaudeStore()

  const sendMessage = async (message: string) => {
    if (!message.trim() || sending) return

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: Date.now(),
    }])
    
    setSending(true)

    try {
      const res = await fetch(`${BRIDGE_URL}/api/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message, session: 'claude' }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          type: 'system',
          content: `❌ ${data.error || 'Failed to send'}`,
          timestamp: Date.now(),
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'system',
        content: '❌ Bridge not connected',
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
        <span className="text-gray-400">💬</span>
      </button>
    )
  }

  return (
    <div className="w-80 h-full bg-[#0a0a0f] border-l border-[#1a1a2e] flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[#1a1a2e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium text-white">Send to Claude</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 hover:bg-[#1a1a2e] rounded transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages - just sent messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-sm">
            <p>Send messages to Claude here.</p>
            <p className="text-xs mt-2 text-gray-600">Responses show in your terminal.</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={msg.type === 'user' ? 'ml-4' : ''}>
              <div className={`px-3 py-2 rounded-lg text-sm ${
                msg.type === 'user' 
                  ? 'bg-[#D97706] text-white' 
                  : 'bg-red-900/50 text-red-300'
              }`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#1a1a2e]">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type message..."
            disabled={sending || !isConnected}
            className="flex-1 bg-[#1a1a2e] text-white placeholder-gray-500 px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#D97706] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !prompt.trim() || !isConnected}
            className="px-4 py-2 bg-[#D97706] hover:bg-[#F59E0B] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {sending ? '...' : '→'}
          </button>
        </div>
      </form>
    </div>
  )
}
