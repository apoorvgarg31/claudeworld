'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

interface ClaudeProps {
  position: [number, number, number]
  isWorking: boolean
  targetPosition?: [number, number, number]
}

// Anthropic color palette
const COLORS = {
  orange: '#D97706',
  amber: '#F59E0B',
  yellow: '#FCD34D',
  dark: '#1a1a2e',
}

/**
 * Claude Bot Character
 * A friendly robot with rounded cube body, sphere head, and antenna
 * Features idle bobbing animation and glow when working
 */
export default function Claude({ position, isWorking, targetPosition }: ClaudeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const headRef = useRef<THREE.Mesh>(null)
  const antennaGlowRef = useRef<THREE.PointLight>(null)
  const leftEyeRef = useRef<THREE.Mesh>(null)
  const rightEyeRef = useRef<THREE.Mesh>(null)
  
  // Current position state for smooth movement
  const currentPos = useRef(new THREE.Vector3(...position))
  
  // Materials
  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: COLORS.orange,
    metalness: 0.3,
    roughness: 0.4,
    emissive: COLORS.orange,
    emissiveIntensity: 0.1,
  }), [])

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

  // Track if walking
  const isWalking = useRef(false)
  const walkPhase = useRef(0)

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime

    if (groupRef.current) {
      // Smooth movement to target position
      if (targetPosition) {
        const target = new THREE.Vector3(...targetPosition)
        const distance = currentPos.current.distanceTo(target)
        
        // Check if we're walking
        isWalking.current = distance > 0.1
        
        if (isWalking.current) {
          // Faster, smoother movement (increased lerp speed)
          currentPos.current.lerp(target, 0.12)
          groupRef.current.position.copy(currentPos.current)
          
          // Walking animation - bob up and down
          walkPhase.current += delta * 12
          groupRef.current.position.y += Math.sin(walkPhase.current) * 0.05
          
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
      if (!isWorking) {
        groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.1
      }
    }

    // Body breathing effect
    if (bodyRef.current) {
      const breathe = 1 + Math.sin(time * 2) * 0.02
      bodyRef.current.scale.set(breathe, breathe, breathe)
    }

    // Head look around (subtle)
    if (headRef.current) {
      if (isWorking) {
        // Look down when working
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
      // Blink every ~3-5 seconds
      const blinkCycle = (time % 4) / 4
      const blinkScale = blinkCycle > 0.95 ? 0.1 : 1
      leftEyeRef.current.scale.y = blinkScale
      rightEyeRef.current.scale.y = blinkScale
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Shadow/glow on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial
          color={COLORS.orange}
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
        <meshStandardMaterial {...accentMaterial} />
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
          <meshStandardMaterial {...accentMaterial} />
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
      {/* Left arm */}
      <group position={[-0.35, 0.05, 0]}>
        <RoundedBox args={[0.12, 0.35, 0.12]} radius={0.03} position={[0, -0.1, 0]}>
          <meshStandardMaterial {...bodyMaterial} />
        </RoundedBox>
        {/* Hand */}
        <mesh position={[0, -0.32, 0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial {...accentMaterial} />
        </mesh>
      </group>

      {/* Right arm */}
      <group position={[0.35, 0.05, 0]}>
        <RoundedBox args={[0.12, 0.35, 0.12]} radius={0.03} position={[0, -0.1, 0]}>
          <meshStandardMaterial {...bodyMaterial} />
        </RoundedBox>
        {/* Hand */}
        <mesh position={[0, -0.32, 0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial {...accentMaterial} />
        </mesh>
      </group>

      {/* Legs */}
      {/* Left leg */}
      <RoundedBox args={[0.14, 0.25, 0.14]} radius={0.03} position={[-0.12, -0.42, 0]}>
        <meshStandardMaterial {...bodyMaterial} />
      </RoundedBox>
      {/* Left foot */}
      <RoundedBox args={[0.16, 0.08, 0.2]} radius={0.02} position={[-0.12, -0.58, 0.03]}>
        <meshStandardMaterial {...accentMaterial} />
      </RoundedBox>

      {/* Right leg */}
      <RoundedBox args={[0.14, 0.25, 0.14]} radius={0.03} position={[0.12, -0.42, 0]}>
        <meshStandardMaterial {...bodyMaterial} />
      </RoundedBox>
      {/* Right foot */}
      <RoundedBox args={[0.16, 0.08, 0.2]} radius={0.02} position={[0.12, -0.58, 0.03]}>
        <meshStandardMaterial {...accentMaterial} />
      </RoundedBox>
    </group>
  )
}
