'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'
import Room from './Room'

interface OfficeProps {
  currentRoom: string | null
}

// Floor configurations
const FLOOR_HEIGHT = 2
const FLOOR_GAP = 0.15
const ROOM_SIZE: [number, number, number] = [2.2, 1.5, 2.2]

// Room definitions
const TOOLS = [
  { name: 'Read', icon: '📖', color: '#3B82F6' },
  { name: 'Write', icon: '✏️', color: '#10B981' },
  { name: 'Exec', icon: '⚡', color: '#F59E0B' },
  { name: 'Browse', icon: '🌐', color: '#8B5CF6' },
]

const SKILLS = [
  { name: 'dev-workflow', icon: '💻', color: '#EC4899' },
  { name: 'orchestra', icon: '🎵', color: '#06B6D4' },
  { name: 'test-regression', icon: '🧪', color: '#84CC16' },
  { name: 'pdf-data', icon: '📄', color: '#F97316' },
]

/**
 * Office Building Component
 * Modern glass building with 3 floors:
 * - Floor 1 (bottom): Lobby
 * - Floor 2: Tools floor (Read, Write, Exec, Browse)
 * - Floor 3: Skills floor (dev-workflow, orchestra, test-regression, pdf-data)
 */
export default function Office({ currentRoom }: OfficeProps) {
  const buildingRef = useRef<THREE.Group>(null)
  
  // Calculate room positions
  const getRoomPosition = (floor: number, index: number): [number, number, number] => {
    const baseY = floor * (FLOOR_HEIGHT + FLOOR_GAP)
    const xPositions = [-3.5, -1.2, 1.2, 3.5]
    return [xPositions[index], baseY, 0]
  }

  // Glass material for building structure
  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#2a2a4a',
    transparent: true,
    opacity: 0.1,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.95,
    thickness: 0.5,
  }), [])

  // Metal frame material
  const frameMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#4a4a6a',
    metalness: 0.9,
    roughness: 0.2,
  }), [])

  return (
    <group ref={buildingRef}>
      {/* Building base/foundation */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[12, 0.3, 5]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Floor 1: Lobby */}
      <group position={[0, 0, 0]}>
        <FloorPlate y={0} label="LOBBY" />
        
        {/* Lobby is one big room */}
        <group position={[0, 0, 0]}>
          {/* Lobby floor */}
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[10, 0.1, 4]} />
            <meshStandardMaterial
              color="#1e1e3a"
              metalness={0.3}
              roughness={0.5}
            />
          </mesh>

          {/* Lobby glow */}
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[9.5, 3.5]} />
            <meshBasicMaterial
              color={!currentRoom ? '#D97706' : '#333'}
              transparent
              opacity={!currentRoom ? 0.3 : 0.1}
            />
          </mesh>

          {/* Lobby glass walls */}
          <mesh position={[0, 0.75, 2]} material={glassMaterial}>
            <boxGeometry args={[10, 1.5, 0.02]} />
          </mesh>
          <mesh position={[0, 0.75, -2]} material={glassMaterial}>
            <boxGeometry args={[10, 1.5, 0.02]} />
          </mesh>
          <mesh position={[-5, 0.75, 0]} material={glassMaterial}>
            <boxGeometry args={[0.02, 1.5, 4]} />
          </mesh>
          <mesh position={[5, 0.75, 0]} material={glassMaterial}>
            <boxGeometry args={[0.02, 1.5, 4]} />
          </mesh>

          {/* Lobby reception desk */}
          <RoundedBox args={[2, 0.8, 0.6]} radius={0.05} position={[3, 0.4, -1]}>
            <meshStandardMaterial color="#2a2a4a" metalness={0.3} />
          </RoundedBox>

          {/* Decorative plants */}
          {[-4, 4].map((x, i) => (
            <group key={i} position={[x, 0.3, 1.3]}>
              <mesh>
                <cylinderGeometry args={[0.2, 0.25, 0.4, 16]} />
                <meshStandardMaterial color="#3a3a4a" />
              </mesh>
              <mesh position={[0, 0.4, 0]}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshStandardMaterial color="#22c55e" roughness={0.8} />
              </mesh>
            </group>
          ))}

          {/* Lobby light */}
          <pointLight
            position={[0, 1.2, 0]}
            color={!currentRoom ? '#D97706' : '#fff'}
            intensity={!currentRoom ? 1.5 : 0.8}
            distance={6}
          />
        </group>
      </group>

      {/* Floor 2: Tools */}
      <group position={[0, FLOOR_HEIGHT + FLOOR_GAP, 0]}>
        <FloorPlate y={0} label="TOOLS" />
        
        {TOOLS.map((tool, index) => (
          <Room
            key={tool.name}
            position={getRoomPosition(0, index)}
            size={ROOM_SIZE}
            name={tool.name}
            icon={tool.icon}
            isActive={currentRoom === tool.name}
            glowColor={tool.color}
          />
        ))}
      </group>

      {/* Floor 3: Skills */}
      <group position={[0, (FLOOR_HEIGHT + FLOOR_GAP) * 2, 0]}>
        <FloorPlate y={0} label="SKILLS" />
        
        {SKILLS.map((skill, index) => (
          <Room
            key={skill.name}
            position={getRoomPosition(0, index)}
            size={ROOM_SIZE}
            name={skill.name}
            icon={skill.icon}
            isActive={currentRoom === skill.name}
            glowColor={skill.color}
          />
        ))}
      </group>

      {/* Building frame/pillars */}
      {[-5.5, 5.5].map((x, xi) =>
        [0, 1, 2, 3].map((floor) => (
          <mesh
            key={`pillar-${xi}-${floor}`}
            position={[x, floor * (FLOOR_HEIGHT + FLOOR_GAP) + 0.75, 0]}
            material={frameMaterial}
          >
            <boxGeometry args={[0.15, FLOOR_HEIGHT, 0.15]} />
          </mesh>
        ))
      )}

      {/* Horizontal beams between floors */}
      {[1, 2, 3].map((floor) => (
        <mesh
          key={`beam-${floor}`}
          position={[0, floor * (FLOOR_HEIGHT + FLOOR_GAP) - FLOOR_GAP / 2, 0]}
          material={frameMaterial}
        >
          <boxGeometry args={[11.3, 0.1, 5]} />
        </mesh>
      ))}

      {/* Roof */}
      <group position={[0, (FLOOR_HEIGHT + FLOOR_GAP) * 3, 0]}>
        <mesh material={frameMaterial}>
          <boxGeometry args={[11.5, 0.15, 5.2]} />
        </mesh>
        
        {/* Roof details - vents/AC units */}
        {[-3, 0, 3].map((x, i) => (
          <mesh key={i} position={[x, 0.3, 0]}>
            <boxGeometry args={[1, 0.4, 0.8]} />
            <meshStandardMaterial color="#3a3a4a" metalness={0.6} />
          </mesh>
        ))}

        {/* Antenna */}
        <group position={[4, 0.5, 1.5]}>
          <mesh>
            <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
            <meshStandardMaterial color="#666" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color="#ff4444"
              emissive="#ff4444"
              emissiveIntensity={0.8}
            />
          </mesh>
          <pointLight position={[0, 0.6, 0]} color="#ff4444" intensity={0.3} distance={2} />
        </group>
      </group>

      {/* Building name sign */}
      <group position={[0, (FLOOR_HEIGHT + FLOOR_GAP) * 3 + 0.5, 2.6]}>
        <RoundedBox args={[4, 0.6, 0.1]} radius={0.05}>
          <meshStandardMaterial
            color="#1a1a2e"
            emissive="#D97706"
            emissiveIntensity={0.2}
          />
        </RoundedBox>
        <Text
          position={[0, 0, 0.06]}
          fontSize={0.25}
          color="#D97706"
          anchorX="center"
          anchorY="middle"
          font="/fonts/inter-bold.woff"
        >
          CLAUDEWORLD
        </Text>
      </group>
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
      <Text
        position={[0, 0, 0.06]}
        fontSize={0.12}
        color="#D97706"
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-bold.woff"
      >
        {label}
      </Text>
    </group>
  )
}
