'use client'

import { Suspense, useRef } from 'react'
import Spline from '@splinetool/react-spline'
import type { Application } from '@splinetool/runtime'
import { useClaudeStore } from '@/lib/store'

/**
 * Scene Component
 * 
 * Renders the 3D Spline scene containing:
 * - The virtual office building
 * - Claude character
 * - Skill rooms and tool workstations
 * 
 * The scene receives events from the Claude Code bridge
 * and animates the character accordingly.
 */
export default function Scene() {
  const splineRef = useRef<Application | null>(null)
  const { currentRoom, isWorking } = useClaudeStore()

  const handleLoad = (spline: Application) => {
    splineRef.current = spline
    console.log('🎮 Spline scene loaded!')
    
    // Store spline reference globally for event handlers
    if (typeof window !== 'undefined') {
      (window as any).__splineApp = spline
    }
  }

  return (
    <div className="spline-container w-full h-full">
      <Suspense fallback={<SceneLoader />}>
        {/* 
          TODO: Replace with your actual Spline scene URL
          Create your scene at https://spline.design and export to get the URL
          
          Example: https://prod.spline.design/xxxxx/scene.splinecode
        */}
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f0f] via-[#1a1a2e] to-[#16213e]">
          {/* Placeholder until Spline scene is created */}
          <PlaceholderScene currentRoom={currentRoom} isWorking={isWorking} />
        </div>
        
        {/* Uncomment when you have a Spline scene URL:
        <Spline
          scene="YOUR_SPLINE_SCENE_URL"
          onLoad={handleLoad}
        />
        */}
      </Suspense>
    </div>
  )
}

function SceneLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-anthropic-orange border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading 3D scene...</p>
      </div>
    </div>
  )
}

/**
 * Placeholder Scene
 * A beautiful CSS-based placeholder while the actual Spline scene is being designed
 */
function PlaceholderScene({ currentRoom, isWorking }: { currentRoom: string | null; isWorking: boolean }) {
  return (
    <div className="relative w-full max-w-4xl mx-auto p-8">
      {/* Building visualization */}
      <div className="relative">
        {/* Floor 2: Skills */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Floor 2: Skills</div>
          <div className="grid grid-cols-4 gap-3">
            {['dev-workflow', 'orchestra', 'test-regression', 'pdf-data'].map((skill) => (
              <Room 
                key={skill} 
                name={skill} 
                isActive={currentRoom === skill}
                icon={getSkillIcon(skill)}
              />
            ))}
          </div>
        </div>

        {/* Floor 1: Tools */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Floor 1: Tools</div>
          <div className="grid grid-cols-4 gap-3">
            {['Read', 'Write', 'Exec', 'Browse'].map((tool) => (
              <Room 
                key={tool} 
                name={tool} 
                isActive={currentRoom === tool}
                icon={getToolIcon(tool)}
              />
            ))}
          </div>
        </div>

        {/* Lobby */}
        <div>
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Lobby</div>
          <div className="glass rounded-xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              {/* Claude character */}
              <div className="flex items-center gap-4">
                <div className={`
                  w-16 h-16 rounded-full bg-gradient-to-br from-anthropic-orange to-anthropic-tan
                  flex items-center justify-center text-2xl
                  ${!currentRoom ? 'ring-4 ring-anthropic-orange/50 animate-pulse' : 'opacity-50'}
                  transition-all duration-500
                `}>
                  🤖
                </div>
                <div>
                  <div className="font-semibold text-white">Claude</div>
                  <div className="text-sm text-gray-400">
                    {currentRoom 
                      ? `Working in ${currentRoom}...` 
                      : 'Waiting for instructions'}
                  </div>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl mb-1">🏆</div>
                  <div className="text-xs text-gray-400">Achievements</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-xs text-gray-400">Leaderboard</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">⚙️</div>
                  <div className="text-xs text-gray-400">Settings</div>
                </div>
              </div>
            </div>

            {/* Working indicator */}
            {isWorking && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-anthropic-orange">
                <span className="animate-pulse">●</span>
                Processing...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm">
          🎨 This is a placeholder. Create your 3D scene at{' '}
          <a href="https://spline.design" target="_blank" rel="noopener" className="text-anthropic-orange hover:underline">
            spline.design
          </a>
        </p>
      </div>
    </div>
  )
}

function Room({ name, isActive, icon }: { name: string; isActive: boolean; icon: string }) {
  return (
    <div 
      className={`
        glass rounded-lg p-4 text-center transition-all duration-300
        ${isActive 
          ? 'ring-2 ring-anthropic-orange bg-anthropic-orange/20 scale-105' 
          : 'hover:bg-white/5'
        }
      `}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs text-gray-300 truncate">{name}</div>
      {isActive && (
        <div className="mt-2 w-2 h-2 bg-green-500 rounded-full mx-auto animate-pulse" />
      )}
    </div>
  )
}

function getSkillIcon(skill: string): string {
  const icons: Record<string, string> = {
    'dev-workflow': '💻',
    'orchestra': '🎵',
    'test-regression': '🧪',
    'pdf-data': '📄',
  }
  return icons[skill] || '📁'
}

function getToolIcon(tool: string): string {
  const icons: Record<string, string> = {
    'Read': '📖',
    'Write': '✏️',
    'Exec': '⚡',
    'Browse': '🌐',
  }
  return icons[tool] || '🔧'
}
