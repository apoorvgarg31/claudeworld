'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

interface RoomProps {
  position: [number, number, number]
  size?: [number, number, number]
  name: string
  icon?: string
  isActive: boolean
  color?: string
  glowColor?: string
}

/**
 * Reusable Room component for the office building
 * Features glass walls, glow when active, and label
 */
export default function Room({
  position,
  size = [2, 1.5, 2],
  name,
  icon = '📁',
  isActive,
  color = '#1a1a2e',
  glowColor = '#D97706',
}: RoomProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.PointLight>(null)
  const floorGlowRef = useRef<THREE.Mesh>(null)
  
  // Animate glow intensity
  useFrame((state) => {
    if (glowRef.current) {
      const targetIntensity = isActive ? 2.5 : 0.3
      glowRef.current.intensity = THREE.MathUtils.lerp(
        glowRef.current.intensity,
        targetIntensity,
        0.1
      )
    }
    
    if (floorGlowRef.current) {
      const targetOpacity = isActive ? 0.6 : 0.1
      const material = floorGlowRef.current.material as THREE.MeshBasicMaterial
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.1)
      
      // Subtle pulse when active
      if (isActive) {
        const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 0.6
        material.opacity = pulse
      }
    }
  })

  // Glass material with subtle tint
  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: isActive ? glowColor : '#2a2a4a',
    transparent: true,
    opacity: 0.15,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.9,
    thickness: 0.5,
  }), [isActive, glowColor])

  // Frame material
  const frameMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: isActive ? glowColor : '#4a4a6a',
    metalness: 0.8,
    roughness: 0.2,
    emissive: isActive ? glowColor : '#000000',
    emissiveIntensity: isActive ? 0.3 : 0,
  }), [isActive, glowColor])

  return (
    <group position={position}>
      {/* Floor glow plane */}
      <mesh 
        ref={floorGlowRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.01, 0]}
      >
        <planeGeometry args={[size[0] - 0.2, size[2] - 0.2]} />
        <meshBasicMaterial 
          color={glowColor} 
          transparent 
          opacity={0.1}
        />
      </mesh>

      {/* Glass floor */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[size[0], 0.05, size[2]]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={0.4}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>

      {/* Glass walls - 4 sides */}
      {/* Front wall */}
      <mesh position={[0, size[1] / 2, size[2] / 2]} material={glassMaterial}>
        <boxGeometry args={[size[0], size[1], 0.02]} />
      </mesh>
      
      {/* Back wall */}
      <mesh position={[0, size[1] / 2, -size[2] / 2]} material={glassMaterial}>
        <boxGeometry args={[size[0], size[1], 0.02]} />
      </mesh>
      
      {/* Left wall */}
      <mesh position={[-size[0] / 2, size[1] / 2, 0]} material={glassMaterial}>
        <boxGeometry args={[0.02, size[1], size[2]]} />
      </mesh>
      
      {/* Right wall */}
      <mesh position={[size[0] / 2, size[1] / 2, 0]} material={glassMaterial}>
        <boxGeometry args={[0.02, size[1], size[2]]} />
      </mesh>

      {/* Corner frames */}
      {[
        [-size[0] / 2, 0, -size[2] / 2],
        [size[0] / 2, 0, -size[2] / 2],
        [-size[0] / 2, 0, size[2] / 2],
        [size[0] / 2, 0, size[2] / 2],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} material={frameMaterial}>
          <boxGeometry args={[0.08, size[1], 0.08]} />
        </mesh>
      ))}

      {/* Room point light */}
      <pointLight
        ref={glowRef}
        position={[0, size[1] - 0.2, 0]}
        color={glowColor}
        intensity={0.3}
        distance={4}
        decay={2}
      />

      {/* Ceiling light fixture */}
      <mesh position={[0, size[1] - 0.1, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
        <meshStandardMaterial
          color={isActive ? glowColor : '#4a4a6a'}
          emissive={isActive ? glowColor : '#333'}
          emissiveIntensity={isActive ? 1 : 0.2}
        />
      </mesh>

      {/* Room label */}
      <group position={[0, size[1] + 0.3, 0]}>
        <Text
          fontSize={0.18}
          color={isActive ? glowColor : '#888'}
          anchorX="center"
          anchorY="middle"
          font="/fonts/inter-bold.woff"
        >
          {name}
        </Text>
      </group>

      {/* Desk/workstation inside */}
      <RoundedBox
        args={[size[0] * 0.5, 0.1, size[2] * 0.3]}
        radius={0.02}
        position={[0, 0.4, 0]}
      >
        <meshStandardMaterial
          color={isActive ? '#3a3a5a' : '#2a2a4a'}
          metalness={0.3}
          roughness={0.7}
        />
      </RoundedBox>

      {/* Monitor on desk */}
      <group position={[0, 0.55, 0]}>
        <RoundedBox args={[0.4, 0.3, 0.02]} radius={0.01}>
          <meshStandardMaterial
            color="#1a1a2e"
            emissive={isActive ? glowColor : '#222'}
            emissiveIntensity={isActive ? 0.5 : 0.1}
          />
        </RoundedBox>
        {/* Monitor stand */}
        <mesh position={[0, -0.2, 0.05]}>
          <boxGeometry args={[0.05, 0.1, 0.1]} />
          <meshStandardMaterial color="#4a4a6a" metalness={0.8} />
        </mesh>
      </group>
    </group>
  )
}
