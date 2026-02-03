'use client'

import { Suspense, useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  Stars,
  Grid,
  PerformanceMonitor,
  AdaptiveDpr,
  AdaptiveEvents,
} from '@react-three/drei'
import * as THREE from 'three'
import { useClaudeStore } from '@/lib/store'
import Office from './three/Office'
import Claude from './three/Claude'

// Constants for position calculation (must match Office.tsx)
const FLOOR_HEIGHT = 2
const FLOOR_GAP = 0.15
const ROOMS_PER_FLOOR = 4
const X_POSITIONS = [-3.5, -1.2, 1.2, 3.5]
// Claude stands on the floor, so add small offset above floor level
const CLAUDE_Y_OFFSET = 0.6

/**
 * Calculate room position dynamically based on registry
 * Position matches the room's actual world position in Office.tsx
 */
function calculateRoomPosition(
  roomName: string,
  tools: { name: string }[],
  skills: { name: string }[]
): [number, number, number] {
  // Check if it's a tool
  const toolIndex = tools.findIndex(t => t.name.toLowerCase() === roomName.toLowerCase())
  if (toolIndex !== -1) {
    const floorNumber = Math.floor(toolIndex / ROOMS_PER_FLOOR) + 1 // Tools start at floor 1
    const posIndex = toolIndex % ROOMS_PER_FLOOR
    // Floor group Y + Claude standing offset
    const y = floorNumber * (FLOOR_HEIGHT + FLOOR_GAP) + CLAUDE_Y_OFFSET
    return [X_POSITIONS[posIndex], y, 0]
  }

  // Check if it's a skill
  const skillIndex = skills.findIndex(s => s.name.toLowerCase() === roomName.toLowerCase())
  if (skillIndex !== -1) {
    const toolFloors = Math.ceil(tools.length / ROOMS_PER_FLOOR)
    const floorNumber = 1 + toolFloors + Math.floor(skillIndex / ROOMS_PER_FLOOR)
    const posIndex = skillIndex % ROOMS_PER_FLOOR
    const y = floorNumber * (FLOOR_HEIGHT + FLOOR_GAP) + CLAUDE_Y_OFFSET
    return [X_POSITIONS[posIndex], y, 0]
  }

  // Default: lobby (floor 0)
  return [0, CLAUDE_Y_OFFSET, 0.5]
}

/**
 * Main Scene Component
 * Renders the 3D office building with Claude character
 */
export default function Scene() {
  const { currentRoom, isWorking } = useClaudeStore()
  const [dpr, setDpr] = useState(1.5)

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0f1a]">
      <Canvas
        shadows
        dpr={dpr}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        <Suspense fallback={<LoadingScene />}>
          <PerformanceMonitor
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(1.5)}
          >
            <AdaptiveDpr pixelated />
            <AdaptiveEvents />
            
            <SceneContent currentRoom={currentRoom} isWorking={isWorking} />
          </PerformanceMonitor>
        </Suspense>
      </Canvas>
      
      {/* Loading overlay */}
      <LoadingOverlay />
    </div>
  )
}

/**
 * Scene content - all 3D elements
 */
function SceneContent({
  currentRoom,
  isWorking,
}: {
  currentRoom: string | null
  isWorking: boolean
}) {
  const { tools, skills, context, subagents } = useClaudeStore()
  
  const claudePosition = useMemo(() => {
    if (!currentRoom) return [0, CLAUDE_Y_OFFSET, 0.5] as [number, number, number]
    return calculateRoomPosition(currentRoom, tools, skills)
  }, [currentRoom, tools, skills])

  // Calculate positions for subagents (offset from main rooms)
  const subagentPositions = useMemo(() => {
    return subagents.map((sub, idx) => {
      const basePos = sub.room 
        ? calculateRoomPosition(sub.room, tools, skills)
        : [0, CLAUDE_Y_OFFSET, 0.5] as [number, number, number]
      // Offset slightly so they don't overlap
      const offset = (idx + 1) * 0.8
      return [basePos[0] + offset, basePos[1], basePos[2] + 0.5] as [number, number, number]
    })
  }, [subagents, tools, skills])

  return (
    <>
      {/* Camera - Isometric view like VibeCraft */}
      <PerspectiveCamera makeDefault position={[12, 10, 12]} fov={45} />
      
      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={8}
        maxDistance={50}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate={false}
        target={[0, 1.5, 0]}
      />

      {/* Environment & Background */}
      <color attach="background" args={['#0a0a0f']} />
      <fog attach="fog" args={['#0a0a0f', 15, 40]} />
      
      {/* Stars background */}
      <Stars
        radius={50}
        depth={50}
        count={2000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Ground grid */}
      <Grid
        position={[0, -0.16, 0]}
        args={[30, 30]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1a1a3a"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#2a2a4a"
        fadeDistance={25}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      {/* Lighting */}
      <Lighting isWorking={isWorking} />

      {/* Office Building */}
      <Office currentRoom={currentRoom} />

      {/* Main Claude Character */}
      <Claude
        position={claudePosition}
        isWorking={isWorking}
        targetPosition={claudePosition}
        context={context}
        id="main"
      />

      {/* Subagent Mini-Claudes */}
      {subagents.map((sub, idx) => (
        <Claude
          key={sub.id}
          position={subagentPositions[idx]}
          isWorking={true}
          targetPosition={subagentPositions[idx]}
          context={sub.context}
          isSubagent={true}
          id={sub.id}
        />
      ))}

      {/* Ambient particles */}
      <Particles />
    </>
  )
}

/**
 * Scene lighting setup
 */
function Lighting({ isWorking }: { isWorking: boolean }) {
  const sunRef = useRef<THREE.DirectionalLight>(null)

  useFrame((state) => {
    if (sunRef.current) {
      // Subtle sun movement
      const time = state.clock.elapsedTime * 0.1
      sunRef.current.position.x = Math.sin(time) * 10
      sunRef.current.position.z = Math.cos(time) * 10
    }
  })

  return (
    <>
      {/* Ambient light - soft fill */}
      <ambientLight intensity={0.3} color="#b4c6ef" />

      {/* Main directional light - sun */}
      <directionalLight
        ref={sunRef}
        position={[10, 15, 10]}
        intensity={1}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* Accent light - cool blue from opposite side */}
      <directionalLight
        position={[-10, 10, -10]}
        intensity={0.4}
        color="#6b8cff"
      />

      {/* Ground bounce light */}
      <hemisphereLight
        args={['#6b8cff', '#1a1a2e', 0.5]}
      />

      {/* Working indicator light */}
      {isWorking && (
        <pointLight
          position={[0, 8, 0]}
          color="#D97706"
          intensity={2}
          distance={15}
          decay={2}
        />
      )}
    </>
  )
}

/**
 * Floating ambient particles
 */
function Particles() {
  const particlesRef = useRef<THREE.Points>(null)
  const count = 100

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = Math.random() * 10
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return pos
  }, [])

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02
      
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += Math.sin(state.clock.elapsedTime + i) * 0.002
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#D97706"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

/**
 * Loading scene placeholder
 */
function LoadingScene() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#D97706" wireframe />
      </mesh>
    </>
  )
}

/**
 * Loading overlay that fades out
 */
function LoadingOverlay() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  if (isLoaded) return null

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0f1a] flex items-center justify-center z-10 transition-opacity duration-500">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#D97706] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Loading ClaudeWorld</h2>
        <p className="text-gray-400">Building your virtual office...</p>
      </div>
    </div>
  )
}
