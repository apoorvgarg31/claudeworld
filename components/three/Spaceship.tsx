'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Html } from '@react-three/drei'
import * as THREE from 'three'

interface SpaceshipProps {
  name: string
  icon: string
  color: string
  position: [number, number, number]
  type: 'tool' | 'skill' | 'mcp'
  isActive?: boolean
}

// Different ship designs based on type
const SHIP_DESIGNS = {
  tool: { 
    bodySize: [2, 0.6, 1.2] as [number, number, number],
    wingSpan: 1.8,
    engineCount: 2,
  },
  skill: { 
    bodySize: [2.5, 0.8, 1.4] as [number, number, number],
    wingSpan: 2.2,
    engineCount: 3,
  },
  mcp: { 
    bodySize: [1.8, 0.5, 1] as [number, number, number],
    wingSpan: 1.5,
    engineCount: 2,
  },
}

/**
 * Spaceship Station - represents a tool/skill/MCP server
 */
export default function Spaceship({ 
  name, 
  icon, 
  color, 
  position, 
  type,
  isActive = false 
}: SpaceshipProps) {
  const groupRef = useRef<THREE.Group>(null)
  const engineGlowRef = useRef<THREE.PointLight[]>([])
  const design = SHIP_DESIGNS[type]
  
  const shipColor = useMemo(() => new THREE.Color(color), [color])
  const glowColor = useMemo(() => new THREE.Color(color).multiplyScalar(1.5), [color])
  
  // Materials
  const hullMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: shipColor,
    metalness: 0.7,
    roughness: 0.3,
    emissive: shipColor,
    emissiveIntensity: isActive ? 0.3 : 0.1,
  }), [shipColor, isActive])

  const accentMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    metalness: 0.8,
    roughness: 0.2,
    emissive: '#ffffff',
    emissiveIntensity: 0.2,
  }), [])

  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#88ccff',
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.8,
    transparent: true,
    opacity: 0.6,
  }), [])

  const engineMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ff6600',
    emissive: '#ff4400',
    emissiveIntensity: isActive ? 2 : 0.5,
  }), [isActive])

  useFrame((state) => {
    const time = state.clock.elapsedTime
    
    if (groupRef.current) {
      // Gentle floating motion
      groupRef.current.position.y = position[1] + Math.sin(time * 0.5 + position[0]) * 0.1
      groupRef.current.rotation.z = Math.sin(time * 0.3 + position[2]) * 0.02
      
      // Pulse when active
      if (isActive) {
        const pulse = Math.sin(time * 4) * 0.1 + 1
        groupRef.current.scale.setScalar(pulse)
      }
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Main Hull */}
      <RoundedBox args={design.bodySize} radius={0.15} smoothness={4}>
        <primitive object={hullMaterial} />
      </RoundedBox>

      {/* Cockpit/Window */}
      <mesh position={[0.5, 0.25, 0]}>
        <sphereGeometry args={[0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={glassMaterial} />
      </mesh>

      {/* Wings */}
      <mesh position={[0, 0, design.wingSpan / 2]} rotation={[0, 0, Math.PI / 12]}>
        <boxGeometry args={[1.5, 0.05, 0.8]} />
        <primitive object={hullMaterial} />
      </mesh>
      <mesh position={[0, 0, -design.wingSpan / 2]} rotation={[0, 0, -Math.PI / 12]}>
        <boxGeometry args={[1.5, 0.05, 0.8]} />
        <primitive object={hullMaterial} />
      </mesh>

      {/* Tail Fin */}
      <mesh position={[-0.8, 0.4, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.6, 0.6, 0.05]} />
        <primitive object={hullMaterial} />
      </mesh>

      {/* Engines */}
      {Array.from({ length: design.engineCount }).map((_, i) => {
        const zOffset = (i - (design.engineCount - 1) / 2) * 0.5
        return (
          <group key={i} position={[-1.1, 0, zOffset]}>
            {/* Engine housing */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.15, 0.2, 0.4, 8]} />
              <primitive object={accentMaterial} />
            </mesh>
            {/* Engine glow */}
            <mesh position={[-0.25, 0, 0]}>
              <sphereGeometry args={[0.12, 8, 8]} />
              <primitive object={engineMaterial} />
            </mesh>
            <pointLight
              position={[-0.3, 0, 0]}
              color="#ff4400"
              intensity={isActive ? 2 : 0.5}
              distance={3}
              decay={2}
            />
          </group>
        )
      })}

      {/* Accent stripes */}
      <mesh position={[0, 0.31, 0]}>
        <boxGeometry args={[design.bodySize[0] * 0.8, 0.02, 0.3]} />
        <primitive object={accentMaterial} />
      </mesh>

      {/* Landing gear indicators */}
      <mesh position={[0.3, -0.35, 0.3]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0.3, -0.35, -0.3]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={1} />
      </mesh>
      <mesh position={[-0.5, -0.35, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
      </mesh>

      {/* Name label */}
      <Html position={[0, 1, 0]} center distanceFactor={10}>
        <div className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
          isActive 
            ? 'bg-white text-black scale-110' 
            : 'bg-black/70 text-white'
        }`}>
          <span className="mr-1">{icon}</span>
          {name}
        </div>
      </Html>

      {/* Active ring indicator */}
      {isActive && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <ringGeometry args={[1.5, 1.7, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}
