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

export default function ChatSidebar() {
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const { isConnected } = useClaudeStore()

  // Subscribe to claude_output events
  useEffect(() => {
    const handleClaudeOutput = (event: CustomEvent) => {
      const { output } = event.detail
      if (output && output.trim()) {
        setMessages(prev => [...prev, {
          id: `claude-${Date.now()}`,
          type: 'claude',
          content: output.trim(),
          timestamp: Date.now(),
        }])
      }
    }

    window.addEventListener('claude:output' as any, handleClaudeOutput)
    return () => window.removeEventListener('claude:output' as any, handleClaudeOutput)
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
    
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      type: 'user',
      content: userMessage,
      timestamp: Date.now(),
    }])
    
    setPrompt('')
    setSending(true)

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

  // Request initial output when connected
  useEffect(() => {
    if (isConnected) {
      setMessages([{
        id: 'connected',
        type: 'system',
        content: '🚀 Connected to Claude',
        timestamp: Date.now(),
      }])
    }
  }, [isConnected])

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-12 h-full bg-[#0a0a0f] border-l border-[#1a1a2e] flex items-center justify-center hover:bg-[#1a1a2e] transition-colors"
      >
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    )
  }

  return (
    <div className="w-96 h-full bg-[#0a0a0f] border-l border-[#1a1a2e] flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[#1a1a2e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium text-white">Claude Terminal</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 hover:bg-[#1a1a2e] rounded transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Waiting for Claude...</p>
            <p className="text-xs mt-1">Run: tmux new -s claude && claude</p>
          </div>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id}
              className={`${
                msg.type === 'user' 
                  ? 'ml-8' 
                  : msg.type === 'system'
                  ? 'text-center'
                  : 'mr-4'
              }`}
            >
              <div 
                className={`px-3 py-2 rounded-lg text-sm ${
                  msg.type === 'user' 
                    ? 'bg-[#D97706] text-white rounded-br-none' 
                    : msg.type === 'claude'
                    ? 'bg-[#1a1a2e] text-gray-200 rounded-bl-none border border-[#2a2a4a]'
                    : 'bg-transparent text-gray-500 text-xs py-1'
                }`}
              >
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed overflow-x-auto">
                  {msg.content}
                </pre>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#1a1a2e]">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={isConnected ? "Message Claude..." : "Not connected"}
            disabled={sending || !isConnected}
            className="flex-1 bg-[#1a1a2e] text-white placeholder-gray-500 px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#D97706] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !prompt.trim() || !isConnected}
            className="px-4 py-2 bg-[#D97706] hover:bg-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {sending ? '...' : '→'}
          </button>
        </div>
      </form>
    </div>
  )
}
