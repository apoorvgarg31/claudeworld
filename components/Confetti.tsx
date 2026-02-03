'use client'

import { useEffect, useState } from 'react'
import { useClaudeStore } from '@/lib/store'

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
}

const COLORS = ['#D97706', '#F59E0B', '#FCD34D', '#22d3ee', '#a78bfa', '#f472b6']

/**
 * Confetti celebration effect for level ups
 */
export default function Confetti() {
  const { showLevelUp } = useClaudeStore()
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (!showLevelUp) {
      setParticles([])
      return
    }

    // Spawn confetti particles
    const newParticles: Particle[] = []
    for (let i = 0; i < 100; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * 5 + 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 10 + 5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20,
      })
    }
    setParticles(newParticles)

    // Animate particles
    let animationId: number
    let lastTime = performance.now()

    const animate = (time: number) => {
      const delta = (time - lastTime) / 16 // Normalize to ~60fps
      lastTime = time

      setParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.vx * delta,
          y: p.y + p.vy * delta,
          vy: p.vy + 0.3 * delta, // gravity
          rotation: p.rotation + p.rotationSpeed * delta,
        })).filter(p => p.y < window.innerHeight + 50)

        return updated
      })

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationId)
  }, [showLevelUp])

  if (!showLevelUp || particles.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
      
      {/* Level Up Banner */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center animate-bounce">
          <div className="text-6xl mb-2">🎉</div>
          <div className="text-4xl font-bold text-amber-400 drop-shadow-lg">
            LEVEL UP!
          </div>
        </div>
      </div>
    </div>
  )
}
