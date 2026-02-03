'use client'

import { useState, FormEvent } from 'react'

const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:3030'

export default function Chat() {
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [useTmux, setUseTmux] = useState(true)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch(`${BRIDGE_URL}/api/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), session: 'claude' }),
      })
      
      if (res.ok) {
        setPrompt('')
      } else {
        const data = await res.json()
        console.error('Failed to send:', data.error)
        alert(`Failed to send: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Send error:', err)
      alert('Failed to connect to bridge. Is it running?')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 bg-[#1a1a2e]/90 backdrop-blur border border-[#2a2a4a] rounded-xl px-4 py-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Send a message to Claude..."
            disabled={sending}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          />
          
          <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useTmux}
              onChange={(e) => setUseTmux(e.target.checked)}
              className="w-3 h-3 accent-[#D97706]"
            />
            tmux
          </label>
          
          <button
            type="submit"
            disabled={sending || !prompt.trim()}
            className="px-3 py-1 bg-[#D97706] hover:bg-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-2">
          Run Claude in tmux: <code className="text-gray-400">tmux new -s claude && claude</code>
        </p>
      </form>
    </div>
  )
}
