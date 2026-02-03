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
      {/* Central Hub - Claude's Home Dock */}
      <group position={[0, 0, 0]}>
        {/* Main landing platform */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <cylinderGeometry args={[4, 4.5, 0.3, 32]} />
          <meshStandardMaterial 
            color="#1a1a2e" 
            metalness={0.8} 
            roughness={0.2}
          />
        </mesh>
        
        {/* Landing pad markings */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[1.5, 2, 32]} />
          <meshStandardMaterial color="#D97706" emissive="#D97706" emissiveIntensity={0.5} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[0.5, 0.7, 32]} />
          <meshStandardMaterial color="#D97706" emissive="#D97706" emissiveIntensity={0.8} />
        </mesh>
        
        {/* H pattern for landing */}
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.15, 0.02, 1.2]} />
          <meshStandardMaterial color="#D97706" emissive="#D97706" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[-0.4, 0.07, 0]}>
          <boxGeometry args={[0.15, 0.02, 0.5]} />
          <meshStandardMaterial color="#D97706" emissive="#D97706" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0.4, 0.07, 0]}>
          <boxGeometry args={[0.15, 0.02, 0.5]} />
          <meshStandardMaterial color="#D97706" emissive="#D97706" emissiveIntensity={0.6} />
        </mesh>
        
        {/* Control tower */}
        <group position={[0, 0, -2.5]}>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.4, 0.6, 2.4, 8]} />
            <meshStandardMaterial color="#2a2a4a" metalness={0.7} roughness={0.3} />
          </mesh>
          
          {/* Tower windows */}
          {[0, 1, 2, 3].map((i) => {
            const angle = (i / 4) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(angle) * 0.45, 1.5, Math.sin(angle) * 0.45 - 2.5 + 2.5]}>
                <boxGeometry args={[0.2, 0.3, 0.05]} />
                <meshStandardMaterial color="#88ccff" emissive="#88ccff" emissiveIntensity={0.5} />
              </mesh>
            )
          })}
          
          {/* Beacon on top */}
          <mesh position={[0, 2.6, 0]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial 
              color="#D97706" 
              emissive="#D97706" 
              emissiveIntensity={2}
            />
          </mesh>
          <pointLight position={[0, 2.6, -2.5]} color="#D97706" intensity={3} distance={15} />
        </group>
        
        {/* Docking arms */}
        {[45, 135, 225, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180
          return (
            <group key={deg} position={[Math.cos(rad) * 3, 0.3, Math.sin(rad) * 3]} rotation={[0, -rad + Math.PI/2, 0]}>
              <mesh>
                <boxGeometry args={[0.8, 0.2, 0.15]} />
                <meshStandardMaterial color="#444" metalness={0.8} />
              </mesh>
              <mesh position={[0.5, 0, 0]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={1} />
              </mesh>
            </group>
          )
        })}

        {/* Outer ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
          <torusGeometry args={[5, 0.08, 8, 64]} />
          <meshStandardMaterial color="#D97706" emissive="#D97706" emissiveIntensity={0.3} />
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
