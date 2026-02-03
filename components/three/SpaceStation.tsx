'use client'

import { useMemo } from 'react'
import Spaceship from './Spaceship'
import { useClaudeStore, RoomDef } from '@/lib/store'

interface SpaceStationProps {
  currentRoom: string | null
}

/**
 * Arrange tools and skills as spaceships in orbital rings
 */
export default function SpaceStation({ currentRoom }: SpaceStationProps) {
  const { tools, skills } = useClaudeStore()
  
  // Calculate positions in orbital rings
  const toolPositions = useMemo(() => {
    return tools.map((tool, i) => {
      const angle = (i / tools.length) * Math.PI * 2
      const radius = 8
      return {
        tool,
        position: [
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius,
        ] as [number, number, number],
      }
    })
  }, [tools])

  const skillPositions = useMemo(() => {
    return skills.map((skill, i) => {
      const angle = (i / Math.max(skills.length, 1)) * Math.PI * 2 + Math.PI / skills.length
      const radius = 14 // Outer ring for skills
      return {
        skill,
        position: [
          Math.cos(angle) * radius,
          2, // Slightly elevated
          Math.sin(angle) * radius,
        ] as [number, number, number],
      }
    })
  }, [skills])

  return (
    <group>
      {/* Central hub/station */}
      <group position={[0, 0, 0]}>
        {/* Main platform */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[3, 3.5, 0.5, 32]} />
          <meshStandardMaterial 
            color="#1a1a2e" 
            metalness={0.8} 
            roughness={0.2}
            emissive="#D97706"
            emissiveIntensity={0.1}
          />
        </mesh>
        
        {/* Central tower */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.5, 0.8, 3, 8]} />
          <meshStandardMaterial color="#2a2a4a" metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* Beacon light */}
        <mesh position={[0, 3.2, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial 
            color="#D97706" 
            emissive="#D97706" 
            emissiveIntensity={2}
          />
        </mesh>
        <pointLight position={[0, 3.2, 0]} color="#D97706" intensity={3} distance={20} />

        {/* Ring around hub */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
          <torusGeometry args={[4, 0.1, 8, 64]} />
          <meshStandardMaterial color="#D97706" emissive="#D97706" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Tool spaceships (inner ring) */}
      {toolPositions.map(({ tool, position }) => (
        <Spaceship
          key={tool.name}
          name={tool.name}
          icon={tool.icon}
          color={tool.color}
          position={position}
          type="tool"
          isActive={currentRoom?.toLowerCase() === tool.name.toLowerCase()}
        />
      ))}

      {/* Skill spaceships (outer ring) */}
      {skillPositions.map(({ skill, position }) => (
        <Spaceship
          key={skill.name}
          name={skill.name}
          icon={skill.icon}
          color={skill.color}
          position={position}
          type="skill"
          isActive={currentRoom?.toLowerCase() === skill.name.toLowerCase()}
        />
      ))}

      {/* Orbital path indicators */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <ringGeometry args={[7.5, 8.5, 64]} />
        <meshBasicMaterial color="#D97706" transparent opacity={0.1} side={2} />
      </mesh>
      
      {skills.length > 0 && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.5, 0]}>
          <ringGeometry args={[13.5, 14.5, 64]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.1} side={2} />
        </mesh>
      )}
    </group>
  )
}
