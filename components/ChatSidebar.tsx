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

// Slash commands like Claude Code
const SLASH_COMMANDS = [
  { cmd: '/clear', desc: 'Clear chat history' },
  { cmd: '/status', desc: 'Show Claude status' },
  { cmd: '/help', desc: 'Show commands' },
  { cmd: '/compact', desc: 'Compact context' },
  { cmd: '/config', desc: 'Show config' },
  { cmd: '/cost', desc: 'Show session cost' },
  { cmd: '/doctor', desc: 'Run diagnostics' },
  { cmd: '/init', desc: 'Initialize project' },
  { cmd: '/login', desc: 'Login to Anthropic' },
  { cmd: '/logout', desc: 'Logout' },
  { cmd: '/memory', desc: 'Edit CLAUDE.md' },
  { cmd: '/model', desc: 'Select model' },
  { cmd: '/permissions', desc: 'Manage permissions' },
  { cmd: '/pr_comments', desc: 'View PR comments' },
  { cmd: '/review', desc: 'Review code' },
  { cmd: '/terminal-setup', desc: 'Setup terminal' },
  { cmd: '/vim', desc: 'Vim mode' },
]

export default function ChatSidebar() {
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showCommands, setShowCommands] = useState(false)
  const [showPermissionButtons, setShowPermissionButtons] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { isConnected } = useClaudeStore()

  // Detect permission prompts
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.type === 'claude') {
      const content = lastMsg.content.toLowerCase()
      const hasPermission = content.includes('do you want to proceed') || 
                           content.includes('1. yes') ||
                           content.includes('allow') ||
                           content.includes('permission')
      setShowPermissionButtons(hasPermission)
    }
  }, [messages])

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

  // Send message to Claude
  const sendMessage = async (message: string, showInChat = true) => {
    if (!message.trim() || sending) return
    
    // Handle local slash commands
    if (message === '/clear') {
      setMessages([{ id: 'cleared', type: 'system', content: '🧹 Chat cleared', timestamp: Date.now() }])
      return
    }
    if (message === '/help') {
      setMessages(prev => [...prev, {
        id: `help-${Date.now()}`,
        type: 'system',
        content: SLASH_COMMANDS.map(c => `${c.cmd} - ${c.desc}`).join('\n'),
        timestamp: Date.now(),
      }])
      return
    }

    if (showInChat) {
      setMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        type: 'user',
        content: message,
        timestamp: Date.now(),
      }])
    }
    
    setSending(true)
    setShowPermissionButtons(false)

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
    setShowCommands(false)
    await sendMessage(msg)
  }

  // Handle input changes for slash commands
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setPrompt(val)
    setShowCommands(val.startsWith('/') && val.length > 0)
  }

  // Quick permission responses
  const handlePermissionResponse = (response: string) => {
    sendMessage(response, false)
    setMessages(prev => [...prev, {
      id: `perm-${Date.now()}`,
      type: 'user',
      content: `→ ${response}`,
      timestamp: Date.now(),
    }])
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

      {/* Permission quick buttons */}
      {showPermissionButtons && (
        <div className="px-3 py-2 border-t border-[#1a1a2e] flex gap-2">
          <button
            onClick={() => handlePermissionResponse('1')}
            className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded transition-colors"
          >
            1. Yes
          </button>
          <button
            onClick={() => handlePermissionResponse('2')}
            className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
          >
            2. Always
          </button>
          <button
            onClick={() => handlePermissionResponse('3')}
            className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded transition-colors"
          >
            3. No
          </button>
        </div>
      )}

      {/* Slash commands dropdown */}
      {showCommands && (
        <div className="absolute bottom-20 left-0 right-0 mx-3 bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg max-h-48 overflow-y-auto">
          {SLASH_COMMANDS
            .filter(c => c.cmd.startsWith(prompt.toLowerCase()))
            .map(({ cmd, desc }) => (
              <button
                key={cmd}
                onClick={() => {
                  setPrompt(cmd + ' ')
                  setShowCommands(false)
                  inputRef.current?.focus()
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#2a2a4a] flex justify-between items-center"
              >
                <span className="text-[#D97706] font-mono text-sm">{cmd}</span>
                <span className="text-gray-500 text-xs">{desc}</span>
              </button>
            ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#1a1a2e] relative">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={handleInputChange}
            placeholder={isConnected ? "Message or /command..." : "Not connected"}
            disabled={sending || !isConnected}
            className="flex-1 bg-[#1a1a2e] text-white placeholder-gray-500 px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#D97706] disabled:opacity-50 font-mono"
          />
          <button
            type="submit"
            disabled={sending || !prompt.trim() || !isConnected}
            className="px-4 py-2 bg-[#D97706] hover:bg-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {sending ? '...' : '→'}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1.5 flex justify-between">
          <span>Type / for commands</span>
          <span>Esc to cancel</span>
        </div>
      </form>
    </div>
  )
}
