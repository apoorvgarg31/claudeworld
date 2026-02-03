'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Html, Trail } from '@react-three/drei'
import * as THREE from 'three'
import { soundManager } from '@/lib/sounds'

interface ClaudePilotProps {
  position: [number, number, number]
  targetPosition: [number, number, number]
  isWorking: boolean
  context?: string | null
  isSubagent?: boolean
  id?: string
}

const COLORS = {
  orange: '#D97706',
  amber: '#F59E0B', 
  yellow: '#FCD34D',
  cyan: '#22d3ee',
  fire: '#ff4400',
  fireGlow: '#ff6600',
}

/**
 * Claude's personal spaceship/pod that flies between stations
 */
export default function ClaudePilot({
  position,
  targetPosition,
  isWorking,
  context,
  isSubagent = false,
  id = 'main'
}: ClaudePilotProps) {
  const groupRef = useRef<THREE.Group>(null)
  const shipRef = useRef<THREE.Group>(null)
  const thrusterRef = useRef<THREE.PointLight>(null)
  const trailRef = useRef<THREE.Mesh>(null)
  
  const scale = isSubagent ? 0.6 : 1
  const shipColor = isSubagent ? COLORS.cyan : COLORS.orange
  
  // Movement state
  const currentPos = useRef(new THREE.Vector3(...position))
  const velocity = useRef(new THREE.Vector3())
  const isFlying = useRef(false)
  const wasFlying = useRef(false)
  const thrusterIntensity = useRef(0)

  // Materials
  const hullMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: shipColor,
    metalness: 0.6,
    roughness: 0.3,
    emissive: shipColor,
    emissiveIntensity: 0.2,
  }), [shipColor])

  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#aaddff',
    metalness: 0,
    roughness: 0,
    transmission: 0.9,
    transparent: true,
  }), [])

  const thrusterMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: COLORS.fire,
    emissive: COLORS.fire,
    emissiveIntensity: 2,
    transparent: true,
  }), [])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    
    if (groupRef.current && shipRef.current) {
      const target = new THREE.Vector3(...targetPosition)
      const distance = currentPos.current.distanceTo(target)
      
      // Check flying state
      wasFlying.current = isFlying.current
      isFlying.current = distance > 0.3
      
      // Sound effects
      if (isFlying.current && !wasFlying.current) {
        soundManager.walk() // Launch sound
      }
      if (!isFlying.current && wasFlying.current) {
        soundManager.arrive() // Landing sound
      }
      
      if (isFlying.current) {
        // Calculate direction and accelerate
        const direction = target.clone().sub(currentPos.current).normalize()
        const speed = Math.min(distance * 0.15, 0.5) // Faster when far
        
        velocity.current.lerp(direction.multiplyScalar(speed), 0.1)
        currentPos.current.add(velocity.current)
        
        // Bank/tilt ship in direction of movement
        const bankAngle = velocity.current.x * 0.5
        const pitchAngle = -velocity.current.y * 0.3
        shipRef.current.rotation.z = THREE.MathUtils.lerp(shipRef.current.rotation.z, bankAngle, 0.1)
        shipRef.current.rotation.x = THREE.MathUtils.lerp(shipRef.current.rotation.x, pitchAngle, 0.1)
        
        // Face direction of travel
        if (velocity.current.length() > 0.01) {
          const angle = Math.atan2(velocity.current.x, velocity.current.z)
          shipRef.current.rotation.y = THREE.MathUtils.lerp(shipRef.current.rotation.y, angle, 0.1)
        }
        
        // Thruster intensity based on speed
        thrusterIntensity.current = THREE.MathUtils.lerp(thrusterIntensity.current, 3, 0.2)
      } else {
        // Slow down and level out
        velocity.current.multiplyScalar(0.9)
        currentPos.current.copy(target)
        
        shipRef.current.rotation.z = THREE.MathUtils.lerp(shipRef.current.rotation.z, 0, 0.1)
        shipRef.current.rotation.x = THREE.MathUtils.lerp(shipRef.current.rotation.x, 0, 0.1)
        
        // Idle hover
        currentPos.current.y += Math.sin(time * 2) * 0.02
        
        thrusterIntensity.current = THREE.MathUtils.lerp(thrusterIntensity.current, 0.5, 0.1)
      }
      
      groupRef.current.position.copy(currentPos.current)
      
      // Update thruster light
      if (thrusterRef.current) {
        thrusterRef.current.intensity = thrusterIntensity.current + Math.sin(time * 20) * 0.5
      }
    }
  })

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <group ref={shipRef}>
        {/* Main pod body */}
        <RoundedBox args={[1.2, 0.6, 0.8]} radius={0.2} smoothness={4}>
          <primitive object={hullMaterial} />
        </RoundedBox>

        {/* Cockpit dome */}
        <mesh position={[0.2, 0.25, 0]}>
          <sphereGeometry args={[0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <primitive object={glassMaterial} />
        </mesh>

        {/* Claude inside cockpit (just a head) */}
        <mesh position={[0.2, 0.15, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color={COLORS.amber} emissive={COLORS.amber} emissiveIntensity={0.3} />
        </mesh>
        {/* Eyes */}
        <mesh position={[0.32, 0.18, 0.05]}>
          <circleGeometry args={[0.03, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.32, 0.18, -0.05]}>
          <circleGeometry args={[0.03, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Side fins */}
        <mesh position={[0, 0, 0.5]} rotation={[0, 0, Math.PI / 8]}>
          <boxGeometry args={[0.8, 0.05, 0.3]} />
          <primitive object={hullMaterial} />
        </mesh>
        <mesh position={[0, 0, -0.5]} rotation={[0, 0, -Math.PI / 8]}>
          <boxGeometry args={[0.8, 0.05, 0.3]} />
          <primitive object={hullMaterial} />
        </mesh>

        {/* Main thruster */}
        <group position={[-0.7, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.15, 0.2, 0.3, 8]} />
            <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
          </mesh>
          
          {/* Thruster flame */}
          <mesh position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.15, 0.6 * thrusterIntensity.current, 8]} />
            <primitive object={thrusterMaterial} />
          </mesh>
          
          <pointLight
            ref={thrusterRef}
            position={[-0.4, 0, 0]}
            color={COLORS.fire}
            intensity={1}
            distance={5}
            decay={2}
          />
        </group>

        {/* Side thrusters */}
        <mesh position={[-0.5, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 0.15, 6]} />
          <meshStandardMaterial color="#333" metalness={0.8} />
        </mesh>
        <mesh position={[-0.5, 0, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 0.15, 6]} />
          <meshStandardMaterial color="#333" metalness={0.8} />
        </mesh>

        {/* Antenna */}
        <mesh position={[0.1, 0.55, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.3, 4]} />
          <meshStandardMaterial color={COLORS.yellow} emissive={COLORS.yellow} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.1, 0.72, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color={COLORS.yellow} emissive={COLORS.yellow} emissiveIntensity={isWorking ? 2 : 0.5} />
        </mesh>
      </group>

      {/* Context label */}
      {context && (
        <Html position={[0, 1.2, 0]} center distanceFactor={8}>
          <div className="px-2 py-1 bg-black/80 rounded text-xs text-amber-400 whitespace-nowrap font-mono animate-pulse">
            {context.length > 35 ? `...${context.slice(-32)}` : context}
          </div>
        </Html>
      )}

      {/* Working indicator ring */}
      {isWorking && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial 
            color={shipColor} 
            transparent 
            opacity={0.3} 
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}
