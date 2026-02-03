'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Html } from '@react-three/drei'
import * as THREE from 'three'
import { soundManager } from '@/lib/sounds'

interface ClaudeProps {
  position: [number, number, number]
  isWorking: boolean
  targetPosition?: [number, number, number]
  context?: string | null  // Current file/command being worked on
  isSubagent?: boolean     // Smaller size for subagents
  id?: string              // For tracking multiple Claudes
}

// Anthropic color palette
const COLORS = {
  orange: '#D97706',
  amber: '#F59E0B',
  yellow: '#FCD34D',
  dark: '#1a1a2e',
  cyan: '#22d3ee',
}

// Particle trail settings
const TRAIL_LENGTH = 20
const TRAIL_SPAWN_RATE = 0.05 // seconds between particles

/**
 * Claude Bot Character
 * Features: smooth movement, particle trails, context labels, sounds
 */
export default function Claude({ 
  position, 
  isWorking, 
  targetPosition, 
  context,
  isSubagent = false,
  id = 'main'
}: ClaudeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const headRef = useRef<THREE.Mesh>(null)
  const antennaGlowRef = useRef<THREE.PointLight>(null)
  const leftEyeRef = useRef<THREE.Mesh>(null)
  const rightEyeRef = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Points>(null)
  
  // Scale for subagents
  const scale = isSubagent ? 0.6 : 1
  
  // Current position state for smooth movement
  const currentPos = useRef(new THREE.Vector3(...position))
  const prevPos = useRef(new THREE.Vector3(...position))
  
  // Track walking state for sounds
  const isWalking = useRef(false)
  const wasWalking = useRef(false)
  const walkPhase = useRef(0)
  const lastFootstep = useRef(0)
  
  // Particle trail state
  const trailPositions = useRef(new Float32Array(TRAIL_LENGTH * 3))
  const trailOpacities = useRef(new Float32Array(TRAIL_LENGTH))
  const trailIndex = useRef(0)
  const lastTrailSpawn = useRef(0)
  
  // Initialize trail positions
  useEffect(() => {
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      trailPositions.current[i * 3] = position[0]
      trailPositions.current[i * 3 + 1] = position[1] - 0.4
      trailPositions.current[i * 3 + 2] = position[2]
      trailOpacities.current[i] = 0
    }
  }, [])
  
  // Materials
  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: isSubagent ? COLORS.cyan : COLORS.orange,
    metalness: 0.3,
    roughness: 0.4,
    emissive: isSubagent ? COLORS.cyan : COLORS.orange,
    emissiveIntensity: 0.1,
  }), [isSubagent])

  const headMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: COLORS.amber,
    metalness: 0.2,
    roughness: 0.5,
    emissive: COLORS.amber,
    emissiveIntensity: 0.15,
  }), [])

  const accentMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: COLORS.yellow,
    metalness: 0.4,
    roughness: 0.3,
    emissive: COLORS.yellow,
    emissiveIntensity: 0.2,
  }), [])

  const eyeMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#ffffff',
    emissiveIntensity: 0.5,
  }), [])

  // Trail material
  const trailMaterial = useMemo(() => new THREE.PointsMaterial({
    size: 0.08,
    color: isSubagent ? COLORS.cyan : COLORS.orange,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  }), [isSubagent])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime

    if (groupRef.current) {
      // Smooth movement to target position
      if (targetPosition) {
        const target = new THREE.Vector3(...targetPosition)
        const distance = currentPos.current.distanceTo(target)
        
        // Check if we're walking
        wasWalking.current = isWalking.current
        isWalking.current = distance > 0.1
        
        // Sound: started walking
        if (isWalking.current && !wasWalking.current) {
          soundManager.walk()
        }
        
        // Sound: arrived at destination
        if (!isWalking.current && wasWalking.current) {
          soundManager.arrive()
        }
        
        if (isWalking.current) {
          // Store previous position for trail
          prevPos.current.copy(currentPos.current)
          
          // Smooth movement
          currentPos.current.lerp(target, 0.12)
          groupRef.current.position.copy(currentPos.current)
          
          // Walking animation - bob up and down
          walkPhase.current += delta * 12
          groupRef.current.position.y += Math.sin(walkPhase.current) * 0.05
          
          // Footstep sounds
          if (time - lastFootstep.current > 0.25) {
            soundManager.footstep()
            lastFootstep.current = time
          }
          
          // Face direction of movement
          const direction = target.clone().sub(currentPos.current)
          if (direction.length() > 0.01) {
            const angle = Math.atan2(direction.x, direction.z)
            groupRef.current.rotation.y = THREE.MathUtils.lerp(
              groupRef.current.rotation.y,
              angle,
              0.1
            )
          }
          
          // Spawn trail particles while walking
          if (time - lastTrailSpawn.current > TRAIL_SPAWN_RATE) {
            const idx = trailIndex.current % TRAIL_LENGTH
            trailPositions.current[idx * 3] = currentPos.current.x + (Math.random() - 0.5) * 0.2
            trailPositions.current[idx * 3 + 1] = currentPos.current.y - 0.4
            trailPositions.current[idx * 3 + 2] = currentPos.current.z + (Math.random() - 0.5) * 0.2
            trailOpacities.current[idx] = 1
            trailIndex.current++
            lastTrailSpawn.current = time
          }
        } else {
          groupRef.current.position.copy(currentPos.current)
          walkPhase.current = 0
        }
      }

      // Idle floating/bobbing animation
      const bobSpeed = isWorking ? 4 : 2
      const bobAmount = isWorking ? 0.08 : 0.05
      groupRef.current.position.y = currentPos.current.y + Math.sin(time * bobSpeed) * bobAmount

      // Subtle rotation when idle
      if (!isWorking && !isWalking.current) {
        groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.1
      }
    }

    // Fade out trail particles
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      if (trailOpacities.current[i] > 0) {
        trailOpacities.current[i] -= delta * 2
        // Float upward
        trailPositions.current[i * 3 + 1] += delta * 0.3
      }
    }
    
    // Update trail geometry
    if (trailRef.current) {
      trailRef.current.geometry.attributes.position.needsUpdate = true
    }

    // Body breathing effect
    if (bodyRef.current) {
      const breathe = 1 + Math.sin(time * 2) * 0.02
      bodyRef.current.scale.set(breathe, breathe, breathe)
    }

    // Head look around (subtle)
    if (headRef.current) {
      if (isWorking) {
        headRef.current.rotation.x = Math.sin(time * 3) * 0.1 - 0.2
        headRef.current.rotation.y = Math.sin(time * 2) * 0.15
      } else {
        headRef.current.rotation.x = Math.sin(time * 0.8) * 0.1
        headRef.current.rotation.y = Math.sin(time * 0.5) * 0.2
      }
    }

    // Antenna glow pulse
    if (antennaGlowRef.current) {
      const baseIntensity = isWorking ? 1.5 : 0.5
      const pulse = Math.sin(time * (isWorking ? 8 : 3)) * 0.5 + 0.5
      antennaGlowRef.current.intensity = baseIntensity + pulse * (isWorking ? 1 : 0.3)
    }

    // Eye blink effect
    if (leftEyeRef.current && rightEyeRef.current) {
      const blinkCycle = (time % 4) / 4
      const blinkScale = blinkCycle > 0.95 ? 0.1 : 1
      leftEyeRef.current.scale.y = blinkScale
      rightEyeRef.current.scale.y = blinkScale
    }
  })

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Particle trail */}
      <points ref={trailRef} material={trailMaterial}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={TRAIL_LENGTH}
            array={trailPositions.current}
            itemSize={3}
          />
        </bufferGeometry>
      </points>

      {/* Floating context label */}
      {context && (
        <Html position={[0, 1.5, 0]} center distanceFactor={8}>
          <div className="px-2 py-1 bg-black/80 rounded text-xs text-amber-400 whitespace-nowrap font-mono animate-pulse">
            {context.length > 40 ? `...${context.slice(-37)}` : context}
          </div>
        </Html>
      )}

      {/* Shadow/glow on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial
          color={isSubagent ? COLORS.cyan : COLORS.orange}
          transparent
          opacity={isWorking ? 0.4 : 0.2}
        />
      </mesh>

      {/* Body - Rounded cube */}
      <RoundedBox
        ref={bodyRef}
        args={[0.5, 0.6, 0.35]}
        radius={0.1}
        smoothness={4}
        position={[0, 0, 0]}
        material={bodyMaterial}
      />

      {/* Body accent stripe */}
      <mesh position={[0, 0, 0.18]}>
        <boxGeometry args={[0.4, 0.1, 0.01]} />
        <meshStandardMaterial color={COLORS.yellow} emissive={COLORS.yellow} emissiveIntensity={0.2} />
      </mesh>

      {/* Chest light (heart) */}
      <mesh position={[0, 0.1, 0.18]}>
        <circleGeometry args={[0.06, 16]} />
        <meshStandardMaterial
          color={isWorking ? '#ff6b6b' : COLORS.yellow}
          emissive={isWorking ? '#ff6b6b' : COLORS.yellow}
          emissiveIntensity={isWorking ? 1 : 0.5}
        />
      </mesh>
      <pointLight
        position={[0, 0.1, 0.25]}
        color={isWorking ? '#ff6b6b' : COLORS.yellow}
        intensity={isWorking ? 0.5 : 0.2}
        distance={1}
      />

      {/* Head - Sphere */}
      <group ref={headRef} position={[0, 0.5, 0]}>
        <mesh material={headMaterial}>
          <sphereGeometry args={[0.25, 32, 32]} />
        </mesh>

        {/* Face plate */}
        <mesh position={[0, 0, 0.2]}>
          <circleGeometry args={[0.18, 32]} />
          <meshStandardMaterial
            color={COLORS.dark}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>

        {/* Eyes */}
        <mesh ref={leftEyeRef} position={[-0.07, 0.03, 0.21]} material={eyeMaterial}>
          <circleGeometry args={[0.035, 16]} />
        </mesh>
        <mesh ref={rightEyeRef} position={[0.07, 0.03, 0.21]} material={eyeMaterial}>
          <circleGeometry args={[0.035, 16]} />
        </mesh>

        {/* Mouth - friendly smile */}
        <mesh position={[0, -0.06, 0.21]} rotation={[0, 0, Math.PI]}>
          <ringGeometry args={[0.04, 0.055, 32, 1, 0, Math.PI]} />
          <meshStandardMaterial color={COLORS.yellow} emissive={COLORS.yellow} emissiveIntensity={0.3} />
        </mesh>

        {/* Antenna base */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.03, 0.04, 0.08, 16]} />
          <meshStandardMaterial color={COLORS.yellow} emissive={COLORS.yellow} emissiveIntensity={0.2} />
        </mesh>

        {/* Antenna stem */}
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
          <meshStandardMaterial color={COLORS.yellow} metalness={0.6} />
        </mesh>

        {/* Antenna ball (glowing) */}
        <mesh position={[0, 0.52, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial
            color={COLORS.yellow}
            emissive={COLORS.yellow}
            emissiveIntensity={isWorking ? 2 : 0.8}
          />
        </mesh>
        <pointLight
          ref={antennaGlowRef}
          position={[0, 0.52, 0]}
          color={COLORS.yellow}
          intensity={0.5}
          distance={2}
          decay={2}
        />
      </group>

      {/* Arms */}
      <group position={[-0.35, 0.05, 0]}>
        <RoundedBox args={[0.12, 0.35, 0.12]} radius={0.03} position={[0, -0.1, 0]}>
          <meshStandardMaterial color={isSubagent ? COLORS.cyan : COLORS.orange} />
        </RoundedBox>
        <mesh position={[0, -0.32, 0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color={COLORS.yellow} emissive={COLORS.yellow} emissiveIntensity={0.2} />
        </mesh>
      </group>

      <group position={[0.35, 0.05, 0]}>
        <RoundedBox args={[0.12, 0.35, 0.12]} radius={0.03} position={[0, -0.1, 0]}>
          <meshStandardMaterial color={isSubagent ? COLORS.cyan : COLORS.orange} />
        </RoundedBox>
        <mesh position={[0, -0.32, 0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color={COLORS.yellow} emissive={COLORS.yellow} emissiveIntensity={0.2} />
        </mesh>
      </group>

      {/* Legs */}
      <RoundedBox args={[0.14, 0.25, 0.14]} radius={0.03} position={[-0.12, -0.42, 0]}>
        <meshStandardMaterial color={isSubagent ? COLORS.cyan : COLORS.orange} />
      </RoundedBox>
      <RoundedBox args={[0.16, 0.08, 0.2]} radius={0.02} position={[-0.12, -0.58, 0.03]}>
        <meshStandardMaterial color={COLORS.yellow} emissive={COLORS.yellow} emissiveIntensity={0.2} />
      </RoundedBox>

      <RoundedBox args={[0.14, 0.25, 0.14]} radius={0.03} position={[0.12, -0.42, 0]}>
        <meshStandardMaterial color={isSubagent ? COLORS.cyan : COLORS.orange} />
      </RoundedBox>
      <RoundedBox args={[0.16, 0.08, 0.2]} radius={0.02} position={[0.12, -0.58, 0.03]}>
        <meshStandardMaterial color={COLORS.yellow} emissive={COLORS.yellow} emissiveIntensity={0.2} />
      </RoundedBox>
    </group>
  )
}
