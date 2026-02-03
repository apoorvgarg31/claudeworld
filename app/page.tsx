'use client'

import { useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useClaudeStore } from '@/lib/store'
import { initializeSocket } from '@/lib/socket'
import HUD from '@/components/HUD'
import XPPopup from '@/components/XPPopup'
import ChatSidebar from '@/components/ChatSidebar'
import Confetti from '@/components/Confetti'

// Debug keyboard controls for testing movement
const TEST_ROOMS = ['Read', 'Write', 'Exec', 'Browser', 'Search', null] as const

// Dynamic import for scene to avoid SSR issues
const SpaceScene = dynamic(() => import('@/components/SpaceScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-anthropic-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">🚀 Launching ClaudeWorld</h2>
        <p className="text-gray-400">Preparing space station...</p>
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
    <main className="relative w-full h-screen overflow-hidden flex">
      {/* 3D Space Scene - takes remaining space */}
      <div className="flex-1 relative">
        <SpaceScene />
        
        {/* HUD Overlay */}
        <HUD />
        
        {/* XP Popups */}
        <div className="absolute inset-0 pointer-events-none">
          {xpPopups.map((popup) => (
            <XPPopup key={popup.id} {...popup} />
          ))}
        </div>

        {/* Level Up Confetti */}
        <Confetti />

        {/* Version badge */}
        <div className="absolute bottom-4 left-4 text-xs text-gray-500">
          ClaudeWorld v0.2.0 🚀
        </div>
      </div>

      {/* Chat Sidebar - right side */}
      <ChatSidebar />
    </main>
  )
}
