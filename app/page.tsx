'use client'

import { useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useClaudeStore } from '@/lib/store'
import { initializeSocket } from '@/lib/socket'
import HUD from '@/components/HUD'
import XPPopup from '@/components/XPPopup'
import Chat from '@/components/Chat'
import Feed from '@/components/Feed'
import Confetti from '@/components/Confetti'

// Debug keyboard controls for testing movement
const TEST_ROOMS = ['Read', 'Write', 'Exec', 'Browser', 'Search', null] as const

// Dynamic import for Spline to avoid SSR issues
const Scene = dynamic(() => import('@/components/Scene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f0f] via-[#1a1a2e] to-[#16213e]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-anthropic-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Loading ClaudeWorld</h2>
        <p className="text-gray-400">Preparing your virtual office...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  const { isConnected, xpPopups, setRoom, currentRoom } = useClaudeStore()

  // Keyboard handler for testing movement (1-6 keys cycle rooms)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    
    const key = e.key
    if (key >= '1' && key <= '6') {
      const idx = parseInt(key) - 1
      const room = TEST_ROOMS[idx] ?? null
      console.log(`🎮 Key ${key}: Moving to ${room || 'lobby'}`)
      setRoom(room)
    } else if (key === '0' || key === 'Escape') {
      console.log(`🎮 Returning to lobby`)
      setRoom(null)
    }
  }, [setRoom])

  useEffect(() => {
    // Initialize WebSocket connection
    let cleanup: (() => void) | undefined
    initializeSocket().then((fn) => {
      cleanup = fn
    })

    // Add keyboard listener for testing
    window.addEventListener('keydown', handleKeyDown)
    console.log('🎮 Debug: Press 1-6 to move Claude, 0/Esc for lobby')
    
    return () => {
      cleanup?.()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* 3D Scene */}
      <Scene />
      
      {/* HUD Overlay */}
      <HUD />
      
      {/* Activity Feed */}
      <Feed />
      
      {/* XP Popups */}
      <div className="absolute inset-0 pointer-events-none">
        {xpPopups.map((popup) => (
          <XPPopup key={popup.id} {...popup} />
        ))}
      </div>

      {/* Connection Status */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <div 
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} 
        />
        <span className="text-xs text-gray-400">
          {isConnected ? 'Connected to Claude Code' : 'Waiting for connection...'}
        </span>
      </div>

      {/* Chat Input */}
      <Chat />

      {/* Level Up Confetti */}
      <Confetti />

      {/* Version badge */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500">
        ClaudeWorld v0.1.0
      </div>
    </main>
  )
}
