'use client'

import { Suspense, useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  OrbitControls,
  PerspectiveCamera,
  Stars,
  PerformanceMonitor,
  AdaptiveDpr,
  AdaptiveEvents,
} from '@react-three/drei'
import * as THREE from 'three'
import { useClaudeStore } from '@/lib/store'
import SpaceStation from './three/SpaceStation'
import ClaudePilot from './three/ClaudePilot'

/**
 * Calculate position for a room/tool in the space station layout
 */
function calculateSpacePosition(
  roomName: string,
  tools: { name: string }[],
  skills: { name: string }[]
): [number, number, number] {
  // Check if it's a tool (inner ring)
  const toolIndex = tools.findIndex(t => t.name.toLowerCase() === roomName.toLowerCase())
  if (toolIndex !== -1) {
    const angle = (toolIndex / tools.length) * Math.PI * 2
    const radius = 8
    return [
      Math.cos(angle) * radius,
      0.5, // Slightly above station
      Math.sin(angle) * radius,
    ]
  }

  // Check if it's a skill (outer ring)
  const skillIndex = skills.findIndex(s => s.name.toLowerCase() === roomName.toLowerCase())
  if (skillIndex !== -1) {
    const angle = (skillIndex / Math.max(skills.length, 1)) * Math.PI * 2 + Math.PI / skills.length
    const radius = 14
    return [
      Math.cos(angle) * radius,
      2.5,
      Math.sin(angle) * radius,
    ]
  }

  // Default: central hub
  return [0, 1, 0]
}

/**
 * Main Space Scene Component
 */
export default function SpaceScene() {
  const { currentRoom, isWorking } = useClaudeStore()
  const [dpr, setDpr] = useState(1.5)

  return (
    <div className="w-full h-full bg-black">
      <Canvas
        shadows
        dpr={dpr}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1,
        }}
      >
        <Suspense fallback={<LoadingScene />}>
          <PerformanceMonitor
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(1.5)}
          >
            <AdaptiveDpr pixelated />
            <AdaptiveEvents />
            
            <SpaceSceneContent currentRoom={currentRoom} isWorking={isWorking} />
          </PerformanceMonitor>
        </Suspense>
      </Canvas>
      
      <LoadingOverlay />
    </div>
  )
}

/**
 * Scene content
 */
function SpaceSceneContent({
  currentRoom,
  isWorking,
}: {
  currentRoom: string | null
  isWorking: boolean
}) {
  const { tools, skills, context, subagents } = useClaudeStore()
  
  const claudePosition = useMemo(() => {
    if (!currentRoom) return [0, 1, 0] as [number, number, number]
    return calculateSpacePosition(currentRoom, tools, skills)
  }, [currentRoom, tools, skills])

  const subagentPositions = useMemo(() => {
    return subagents.map((sub, idx) => {
      const basePos = sub.room 
        ? calculateSpacePosition(sub.room, tools, skills)
        : [0, 1, 0] as [number, number, number]
      const offset = (idx + 1) * 1.5
      const angle = (idx * Math.PI / 3)
      return [
        basePos[0] + Math.cos(angle) * offset,
        basePos[1] + 0.5,
        basePos[2] + Math.sin(angle) * offset,
      ] as [number, number, number]
    })
  }, [subagents, tools, skills])

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[20, 15, 20]} fov={50} />
      
      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={80}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />

      {/* Space background */}
      <color attach="background" args={['#000008']} />
      <fog attach="fog" args={['#000008', 40, 100]} />
      
      {/* Stars */}
      <Stars
        radius={100}
        depth={100}
        count={5000}
        factor={6}
        saturation={0.5}
        fade
        speed={0.5}
      />

      {/* Nebula-like ambient glow */}
      <mesh position={[30, 10, -40]}>
        <sphereGeometry args={[20, 16, 16]} />
        <meshBasicMaterial color="#4a1a6b" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
      <mesh position={[-40, -10, 30]}>
        <sphereGeometry args={[25, 16, 16]} />
        <meshBasicMaterial color="#1a4a6b" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>

      {/* Lighting */}
      <ambientLight intensity={0.2} color="#8888ff" />
      <directionalLight position={[20, 30, 10]} intensity={1} color="#ffffff" />
      <directionalLight position={[-20, 10, -20]} intensity={0.3} color="#4488ff" />
      <pointLight position={[0, 3, 0]} color="#D97706" intensity={2} distance={30} />

      {/* Space Station with ships */}
      <SpaceStation currentRoom={currentRoom} />

      {/* Claude's ship */}
      <ClaudePilot
        position={claudePosition}
        targetPosition={claudePosition}
        isWorking={isWorking}
        context={context}
        id="main"
      />

      {/* Subagent ships */}
      {subagents.map((sub, idx) => (
        <ClaudePilot
          key={sub.id}
          position={subagentPositions[idx]}
          targetPosition={subagentPositions[idx]}
          isWorking={true}
          context={sub.context}
          isSubagent={true}
          id={sub.id}
        />
      ))}

      {/* Grid helper (subtle) */}
      <gridHelper args={[60, 60, '#111122', '#0a0a15']} position={[0, -2, 0]} />
    </>
  )
}

/**
 * Loading scene
 */
function LoadingScene() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <mesh ref={meshRef}>
        <octahedronGeometry args={[1]} />
        <meshStandardMaterial color="#D97706" wireframe />
      </mesh>
    </>
  )
}

/**
 * Loading overlay
 */
function LoadingOverlay() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  if (isLoaded) return null

  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center z-10 transition-opacity duration-500">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#D97706] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Launching ClaudeWorld</h2>
        <p className="text-gray-400">Preparing space station...</p>
      </div>
    </div>
  )
}
