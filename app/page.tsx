'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useClaudeStore } from '@/lib/store'
import { initializeSocket } from '@/lib/socket'
import HUD from '@/components/HUD'
import XPPopup from '@/components/XPPopup'

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
  const { isConnected, xpPopups } = useClaudeStore()

  useEffect(() => {
    // Initialize WebSocket connection
    const cleanup = initializeSocket()
    return cleanup
  }, [])

  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* 3D Scene */}
      <Scene />
      
      {/* HUD Overlay */}
      <HUD />
      
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

      {/* Version badge */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500">
        ClaudeWorld v0.1.0
      </div>
    </main>
  )
}
