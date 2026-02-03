'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Html, Cylinder, Sphere, Box, Torus } from '@react-three/drei'
import * as THREE from 'three'

interface SpaceshipProps {
  name: string
  icon: string
  color: string
  position: [number, number, number]
  type: 'tool' | 'skill' | 'mcp'
  isActive?: boolean
}

/**
 * Unique spaceship designs for each tool
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
  const shipColor = useMemo(() => new THREE.Color(color), [color])
  
  useFrame((state) => {
    const time = state.clock.elapsedTime
    
    if (groupRef.current) {
      // Gentle floating
      groupRef.current.position.y = position[1] + Math.sin(time * 0.5 + position[0]) * 0.15
      groupRef.current.rotation.y = Math.sin(time * 0.2) * 0.05
      
      // Pulse when active
      if (isActive) {
        const pulse = Math.sin(time * 4) * 0.05 + 1
        groupRef.current.scale.setScalar(pulse)
      }
    }
  })

  // Choose ship design based on name
  const shipDesign = getShipDesign(name.toLowerCase())

  return (
    <group ref={groupRef} position={position}>
      {shipDesign === 'read' && <ReadShip color={shipColor} isActive={isActive} />}
      {shipDesign === 'write' && <WriteShip color={shipColor} isActive={isActive} />}
      {shipDesign === 'exec' && <ExecShip color={shipColor} isActive={isActive} />}
      {shipDesign === 'browser' && <BrowserShip color={shipColor} isActive={isActive} />}
      {shipDesign === 'search' && <SearchShip color={shipColor} isActive={isActive} />}
      {shipDesign === 'default' && <DefaultShip color={shipColor} isActive={isActive} type={type} />}

      {/* Name label */}
      <Html position={[0, 2, 0]} center distanceFactor={10}>
        <div className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
          isActive 
            ? 'bg-white text-black scale-110 shadow-lg' 
            : 'bg-black/80 text-white'
        }`}>
          <span className="mr-1.5 text-base">{icon}</span>
          {name}
        </div>
      </Html>

      {/* Active indicator ring */}
      {isActive && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
          <ringGeometry args={[2.5, 2.8, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

function getShipDesign(name: string): string {
  if (name.includes('read')) return 'read'
  if (name.includes('write') || name.includes('edit')) return 'write'
  if (name.includes('exec') || name.includes('bash') || name.includes('shell')) return 'exec'
  if (name.includes('browser') || name.includes('web')) return 'browser'
  if (name.includes('search') || name.includes('grep') || name.includes('find')) return 'search'
  return 'default'
}

/** 📖 Read Ship - Library/Scanner vessel with book-like structure */
function ReadShip({ color, isActive }: { color: THREE.Color; isActive: boolean }) {
  return (
    <group>
      {/* Main body - book shape */}
      <RoundedBox args={[2.5, 0.4, 1.8]} radius={0.05} position={[0, 0, 0]}>
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
      </RoundedBox>
      
      {/* Book spine */}
      <Box args={[0.2, 0.5, 1.9]} position={[-1.25, 0, 0]}>
        <meshStandardMaterial color="#8B4513" metalness={0.3} roughness={0.7} />
      </Box>
      
      {/* Pages (layered) */}
      {[0.1, 0.2, 0.3].map((y, i) => (
        <Box key={i} args={[2.2, 0.05, 1.6]} position={[0.1, y - 0.15, 0]}>
          <meshStandardMaterial color="#f5f5dc" />
        </Box>
      ))}
      
      {/* Scanner beam emitter */}
      <Cylinder args={[0.15, 0.15, 0.3, 8]} position={[0.8, 0.35, 0]} rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={isActive ? 2 : 0.5} />
      </Cylinder>
      
      {/* Scanning light */}
      <pointLight position={[0.8, 0.5, 0]} color="#00ff88" intensity={isActive ? 3 : 1} distance={5} />
      
      {/* Engines */}
      <Cylinder args={[0.2, 0.15, 0.4, 6]} position={[-1.4, 0, 0.5]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#333" metalness={0.8} />
      </Cylinder>
      <Cylinder args={[0.2, 0.15, 0.4, 6]} position={[-1.4, 0, -0.5]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#333" metalness={0.8} />
      </Cylinder>
    </group>
  )
}

/** ✏️ Write Ship - Pen/quill themed vessel */
function WriteShip({ color, isActive }: { color: THREE.Color; isActive: boolean }) {
  return (
    <group>
      {/* Main body - pen shape */}
      <group rotation={[0, 0, Math.PI / 12]}>
        {/* Pen barrel */}
        <Cylinder args={[0.3, 0.3, 3, 8]} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </Cylinder>
        
        {/* Pen tip (nib) */}
        <Cylinder args={[0.3, 0.05, 0.8, 8]} position={[1.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
        </Cylinder>
        
        {/* Ink glow at tip */}
        <Sphere args={[0.1, 8, 8]} position={[2.2, 0, 0]}>
          <meshStandardMaterial color="#4169E1" emissive="#4169E1" emissiveIntensity={isActive ? 3 : 1} />
        </Sphere>
        <pointLight position={[2.2, 0, 0]} color="#4169E1" intensity={isActive ? 2 : 0.5} distance={4} />
        
        {/* Grip section */}
        <Cylinder args={[0.35, 0.35, 0.8, 8]} position={[-0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color="#222" metalness={0.4} roughness={0.6} />
        </Cylinder>
        
        {/* Clip */}
        <Box args={[1, 0.05, 0.15]} position={[-0.2, 0.35, 0]}>
          <meshStandardMaterial color="#C0C0C0" metalness={0.9} roughness={0.1} />
        </Box>
      </group>
      
      {/* Engine at back */}
      <Sphere args={[0.4, 16, 16]} position={[-1.8, 0, 0]}>
        <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={isActive ? 1.5 : 0.3} />
      </Sphere>
    </group>
  )
}

/** ⚡ Exec Ship - Command vessel with terminal screens */
function ExecShip({ color, isActive }: { color: THREE.Color; isActive: boolean }) {
  return (
    <group>
      {/* Main angular body */}
      <Box args={[2.5, 0.8, 1.5]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.3} />
      </Box>
      
      {/* Command bridge (raised) */}
      <Box args={[1, 0.5, 1]} position={[0.3, 0.6, 0]}>
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </Box>
      
      {/* Terminal screens */}
      {[-0.3, 0.3].map((z, i) => (
        <group key={i} position={[0.3, 0.85, z]}>
          <Box args={[0.4, 0.3, 0.05]}>
            <meshStandardMaterial color="#000" />
          </Box>
          <Box args={[0.35, 0.25, 0.01]} position={[0, 0, 0.03]}>
            <meshStandardMaterial 
              color={isActive ? "#00ff00" : "#003300"} 
              emissive={isActive ? "#00ff00" : "#001100"} 
              emissiveIntensity={isActive ? 1 : 0.3} 
            />
          </Box>
        </group>
      ))}
      
      {/* Angular wings */}
      <Box args={[1.5, 0.1, 0.5]} position={[0, 0.2, 1.2]} rotation={[0.3, 0, 0]}>
        <meshStandardMaterial color={color} metalness={0.6} />
      </Box>
      <Box args={[1.5, 0.1, 0.5]} position={[0, 0.2, -1.2]} rotation={[-0.3, 0, 0]}>
        <meshStandardMaterial color={color} metalness={0.6} />
      </Box>
      
      {/* Triple engines */}
      {[-0.4, 0, 0.4].map((z, i) => (
        <group key={i} position={[-1.4, 0, z]}>
          <Cylinder args={[0.2, 0.25, 0.5, 6]} rotation={[0, 0, Math.PI / 2]}>
            <meshStandardMaterial color="#333" metalness={0.8} />
          </Cylinder>
          <Sphere args={[0.15, 8, 8]} position={[-0.3, 0, 0]}>
            <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={isActive ? 2 : 0.5} />
          </Sphere>
        </group>
      ))}
      
      {/* Status lights */}
      <pointLight position={[0.3, 1, 0]} color="#00ff00" intensity={isActive ? 2 : 0.5} distance={3} />
    </group>
  )
}

/** 🌐 Browser Ship - Sleek explorer with globe motif */
function BrowserShip({ color, isActive }: { color: THREE.Color; isActive: boolean }) {
  const globeRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
  })
  
  return (
    <group>
      {/* Sleek main body */}
      <group>
        <Sphere args={[0.8, 32, 32]} scale={[2, 0.6, 1]} position={[0, 0, 0]}>
          <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
        </Sphere>
      </group>
      
      {/* Globe cockpit */}
      <group position={[0.5, 0.4, 0]}>
        <Sphere ref={globeRef} args={[0.5, 16, 16]}>
          <meshStandardMaterial color="#1a1a4e" metalness={0.3} roughness={0.5} transparent opacity={0.8} />
        </Sphere>
        {/* Latitude lines */}
        <Torus args={[0.5, 0.02, 8, 32]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={0.5} />
        </Torus>
        <Torus args={[0.4, 0.02, 8, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
          <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={0.5} />
        </Torus>
        {/* Longitude line */}
        <Torus args={[0.5, 0.02, 8, 32]} rotation={[0, 0, 0]}>
          <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={0.5} />
        </Torus>
      </group>
      
      {/* Swept wings */}
      <Box args={[1.5, 0.08, 0.6]} position={[-0.3, 0, 1]} rotation={[0, 0.3, 0.1]}>
        <meshStandardMaterial color={color} metalness={0.6} />
      </Box>
      <Box args={[1.5, 0.08, 0.6]} position={[-0.3, 0, -1]} rotation={[0, -0.3, -0.1]}>
        <meshStandardMaterial color={color} metalness={0.6} />
      </Box>
      
      {/* Engine pods on wings */}
      <Cylinder args={[0.15, 0.2, 0.6, 8]} position={[-1, 0, 0.8]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#222" metalness={0.8} />
      </Cylinder>
      <Cylinder args={[0.15, 0.2, 0.6, 8]} position={[-1, 0, -0.8]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#222" metalness={0.8} />
      </Cylinder>
      
      {/* Connection beam */}
      <pointLight position={[0.5, 0.5, 0]} color="#00aaff" intensity={isActive ? 3 : 1} distance={5} />
    </group>
  )
}

/** 🔍 Search Ship - Radar/telescope vessel */
function SearchShip({ color, isActive }: { color: THREE.Color; isActive: boolean }) {
  const dishRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (dishRef.current) {
      dishRef.current.rotation.y = state.clock.elapsedTime * 0.8
    }
  })
  
  return (
    <group>
      {/* Main body */}
      <Cylinder args={[0.6, 0.8, 1.5, 8]} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </Cylinder>
      
      {/* Rotating radar dish */}
      <group ref={dishRef} position={[0, 0.8, 0]}>
        {/* Dish */}
        <Cylinder args={[0.8, 0.2, 0.3, 16]} rotation={[0, 0, 0]}>
          <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} side={THREE.DoubleSide} />
        </Cylinder>
        {/* Receiver */}
        <Cylinder args={[0.05, 0.05, 0.6, 8]} position={[0, 0.4, 0]}>
          <meshStandardMaterial color="#333" />
        </Cylinder>
        <Sphere args={[0.1, 8, 8]} position={[0, 0.7, 0]}>
          <meshStandardMaterial color="#ff0" emissive="#ff0" emissiveIntensity={isActive ? 2 : 0.5} />
        </Sphere>
      </group>
      
      {/* Sensor arrays on sides */}
      {[0.5, -0.5].map((z, i) => (
        <group key={i} position={[0.3, 0.3, z]}>
          <Box args={[0.3, 0.1, 0.4]}>
            <meshStandardMaterial color="#444" metalness={0.7} />
          </Box>
          <Box args={[0.25, 0.05, 0.35]} position={[0, 0.08, 0]}>
            <meshStandardMaterial 
              color={isActive ? "#00ffff" : "#004444"} 
              emissive={isActive ? "#00ffff" : "#002222"}
              emissiveIntensity={isActive ? 1 : 0.3}
            />
          </Box>
        </group>
      ))}
      
      {/* Engines */}
      <Cylinder args={[0.25, 0.3, 0.4, 6]} position={[-1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#333" metalness={0.8} />
      </Cylinder>
      
      {/* Search beam */}
      <pointLight position={[0, 1.2, 0]} color="#ffff00" intensity={isActive ? 3 : 1} distance={6} />
    </group>
  )
}

/** Default ship for skills/other tools */
function DefaultShip({ color, isActive, type }: { color: THREE.Color; isActive: boolean; type: string }) {
  const scale = type === 'skill' ? 1.3 : type === 'mcp' ? 0.8 : 1
  
  return (
    <group scale={scale}>
      {/* Saucer body */}
      <Cylinder args={[1.2, 1, 0.4, 16]} position={[0, 0, 0]}>
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </Cylinder>
      
      {/* Dome */}
      <Sphere args={[0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 0.2, 0]}>
        <meshPhysicalMaterial color="#aaddff" metalness={0.1} roughness={0.1} transmission={0.7} transparent />
      </Sphere>
      
      {/* Ring */}
      <Torus args={[1.1, 0.08, 8, 32]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 0.5 : 0.2} />
      </Torus>
      
      {/* Lights around edge */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2
        return (
          <Sphere key={i} args={[0.08, 8, 8]} position={[Math.cos(angle) * 1, -0.1, Math.sin(angle) * 1]}>
            <meshStandardMaterial 
              color={isActive ? "#fff" : "#666"} 
              emissive={isActive ? "#fff" : "#333"} 
              emissiveIntensity={isActive ? 1 : 0.3} 
            />
          </Sphere>
        )
      })}
      
      {/* Bottom glow */}
      <pointLight position={[0, -0.5, 0]} color={color} intensity={isActive ? 2 : 0.5} distance={4} />
    </group>
  )
}
