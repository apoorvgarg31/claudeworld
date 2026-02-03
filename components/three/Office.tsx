'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Html } from '@react-three/drei'
import * as THREE from 'three'
import Room from './Room'
import { useClaudeStore, RoomDef } from '@/lib/store'

interface OfficeProps {
  currentRoom: string | null
}

// Floor configuration
const FLOOR_HEIGHT = 2
const FLOOR_GAP = 0.15
const ROOMS_PER_FLOOR = 4
const ROOM_SIZE: [number, number, number] = [2.2, 1.5, 2.2]

/**
 * Calculate room position based on floor and index
 */
function getRoomPosition(floor: number, index: number): [number, number, number] {
  const baseY = floor * (FLOOR_HEIGHT + FLOOR_GAP)
  const xPositions = [-3.5, -1.2, 1.2, 3.5]
  return [xPositions[index % 4], baseY, 0]
}

/**
 * Office Building Component
 * 
 * Dynamically generates floors based on registered tools and skills:
 * - Floor 0: Lobby
 * - Floor 1+: Tools (4 per floor)
 * - After tools: Skills (4 per floor)
 */
export default function Office({ currentRoom }: OfficeProps) {
  const buildingRef = useRef<THREE.Group>(null)
  const { tools, skills } = useClaudeStore()

  // Calculate floors needed
  const toolFloors = Math.ceil(tools.length / ROOMS_PER_FLOOR)
  const skillFloors = Math.ceil(skills.length / ROOMS_PER_FLOOR)
  const totalFloors = 1 + toolFloors + skillFloors // 1 for lobby

  // Glass material for building structure
  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#1a1a3a',
    transparent: true,
    opacity: 0.3,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.5,
  }), [])

  // Frame material
  const frameMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2a2a4a',
    metalness: 0.8,
    roughness: 0.2,
  }), [])

  return (
    <group ref={buildingRef}>
      {/* Building base platform */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[8, 9, 0.3, 32]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Lobby Floor (Floor 0) */}
      <group position={[0, 0, 0]}>
        <FloorPlate y={0} label="LOBBY" />
        <LobbyFloor glassMaterial={glassMaterial} frameMaterial={frameMaterial} />
      </group>

      {/* Tool Floors */}
      {Array.from({ length: toolFloors }).map((_, floorIdx) => {
        const floorNumber = floorIdx + 1
        const startIdx = floorIdx * ROOMS_PER_FLOOR
        const floorTools = tools.slice(startIdx, startIdx + ROOMS_PER_FLOOR)
        
        return (
          <group key={`tool-floor-${floorIdx}`} position={[0, floorNumber * (FLOOR_HEIGHT + FLOOR_GAP), 0]}>
            <FloorPlate y={0} label={`TOOLS ${floorIdx + 1}`} />
            <FloorStructure 
              glassMaterial={glassMaterial} 
              frameMaterial={frameMaterial}
              roomCount={floorTools.length}
            />
            {floorTools.map((tool, idx) => (
              <Room
                key={tool.name}
                name={tool.name}
                icon={tool.icon}
                color={tool.color}
                position={getRoomPosition(0, idx)}
                size={ROOM_SIZE}
                isActive={currentRoom?.toLowerCase() === tool.name.toLowerCase()}
              />
            ))}
          </group>
        )
      })}

      {/* Skill Floors */}
      {Array.from({ length: skillFloors }).map((_, floorIdx) => {
        const floorNumber = 1 + toolFloors + floorIdx
        const startIdx = floorIdx * ROOMS_PER_FLOOR
        const floorSkills = skills.slice(startIdx, startIdx + ROOMS_PER_FLOOR)
        
        return (
          <group key={`skill-floor-${floorIdx}`} position={[0, floorNumber * (FLOOR_HEIGHT + FLOOR_GAP), 0]}>
            <FloorPlate y={0} label={`SKILLS ${floorIdx + 1}`} />
            <FloorStructure 
              glassMaterial={glassMaterial} 
              frameMaterial={frameMaterial}
              roomCount={floorSkills.length}
            />
            {floorSkills.map((skill, idx) => (
              <Room
                key={skill.name}
                name={skill.name}
                icon={skill.icon}
                color={skill.color}
                position={getRoomPosition(0, idx)}
                size={ROOM_SIZE}
                isActive={currentRoom?.toLowerCase() === skill.name.toLowerCase()}
              />
            ))}
          </group>
        )
      })}

      {/* Building spire/antenna on top */}
      <BuildingSpire y={(totalFloors) * (FLOOR_HEIGHT + FLOOR_GAP)} />

      {/* Logo sign */}
      <LogoSign />
    </group>
  )
}

/**
 * Lobby floor with welcome area
 */
function LobbyFloor({ 
  glassMaterial, 
  frameMaterial 
}: { 
  glassMaterial: THREE.Material
  frameMaterial: THREE.Material 
}) {
  return (
    <group>
      {/* Floor base */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[10, 0.1, 5]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Welcome desk */}
      <RoundedBox args={[2, 0.8, 0.6]} position={[0, 0.4, 1.5]} radius={0.05}>
        <meshStandardMaterial color="#D97706" metalness={0.3} roughness={0.5} />
      </RoundedBox>

      {/* Ceiling */}
      <mesh position={[0, FLOOR_HEIGHT, 0]}>
        <boxGeometry args={[10, 0.1, 5]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Glass walls */}
      <mesh position={[5, FLOOR_HEIGHT / 2, 0]} material={glassMaterial}>
        <boxGeometry args={[0.1, FLOOR_HEIGHT, 5]} />
      </mesh>
      <mesh position={[-5, FLOOR_HEIGHT / 2, 0]} material={glassMaterial}>
        <boxGeometry args={[0.1, FLOOR_HEIGHT, 5]} />
      </mesh>
      <mesh position={[0, FLOOR_HEIGHT / 2, 2.5]} material={glassMaterial}>
        <boxGeometry args={[10, FLOOR_HEIGHT, 0.1]} />
      </mesh>
      <mesh position={[0, FLOOR_HEIGHT / 2, -2.5]} material={glassMaterial}>
        <boxGeometry args={[10, FLOOR_HEIGHT, 0.1]} />
      </mesh>
    </group>
  )
}

/**
 * Generic floor structure with glass walls
 */
function FloorStructure({ 
  glassMaterial, 
  frameMaterial,
  roomCount 
}: { 
  glassMaterial: THREE.Material
  frameMaterial: THREE.Material
  roomCount: number
}) {
  return (
    <group>
      {/* Floor base */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[10, 0.1, 5]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, FLOOR_HEIGHT, 0]}>
        <boxGeometry args={[10, 0.1, 5]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Glass walls */}
      <mesh position={[5, FLOOR_HEIGHT / 2, 0]} material={glassMaterial}>
        <boxGeometry args={[0.1, FLOOR_HEIGHT, 5]} />
      </mesh>
      <mesh position={[-5, FLOOR_HEIGHT / 2, 0]} material={glassMaterial}>
        <boxGeometry args={[0.1, FLOOR_HEIGHT, 5]} />
      </mesh>
      <mesh position={[0, FLOOR_HEIGHT / 2, 2.5]} material={glassMaterial}>
        <boxGeometry args={[10, FLOOR_HEIGHT, 0.1]} />
      </mesh>
      <mesh position={[0, FLOOR_HEIGHT / 2, -2.5]} material={glassMaterial}>
        <boxGeometry args={[10, FLOOR_HEIGHT, 0.1]} />
      </mesh>
    </group>
  )
}

/**
 * Floor plate with label
 */
function FloorPlate({ y, label }: { y: number; label: string }) {
  return (
    <group position={[-6, y + 0.75, 0]}>
      <RoundedBox args={[0.8, 0.4, 0.1]} radius={0.05}>
        <meshStandardMaterial
          color="#2a2a4a"
          emissive="#D97706"
          emissiveIntensity={0.1}
        />
      </RoundedBox>
      <Html position={[0, 0, 0.06]} center transform>
        <div style={{ color: '#D97706', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          {label}
        </div>
      </Html>
    </group>
  )
}

/**
 * Building spire/antenna
 */
function BuildingSpire({ y }: { y: number }) {
  const glowRef = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.intensity = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.5
    }
  })

  return (
    <group position={[0, y, 0]}>
      {/* Main spire */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.3, 1, 8]} />
        <meshStandardMaterial color="#2a2a4a" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Antenna */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <meshStandardMaterial color="#D97706" emissive="#D97706" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Glowing tip */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#D97706" emissive="#D97706" emissiveIntensity={1} />
      </mesh>
      
      <pointLight ref={glowRef} position={[0, 1.5, 0]} color="#D97706" intensity={1} distance={3} />
    </group>
  )
}

/**
 * Logo sign on front of building
 */
function LogoSign() {
  return (
    <group position={[0, 0.8, 2.6]}>
      <RoundedBox args={[2, 0.5, 0.1]} radius={0.05}>
        <meshStandardMaterial
          color="#1a1a2e"
          emissive="#D97706"
          emissiveIntensity={0.2}
        />
      </RoundedBox>
      <Html position={[0, 0, 0.06]} center transform>
        <div style={{ color: '#D97706', fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          CLAUDEWORLD
        </div>
      </Html>
    </group>
  )
}
