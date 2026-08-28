import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { 
  Environment, 
  Float, 
  PresentationControls, 
  RoundedBox,
  Tetrahedron,
  Center,
  ContactShadows 
} from '@react-three/drei'
import * as THREE from 'three'

const materialProps = {
  color: "#ffffff",
  metalness: 0.1,
  roughness: 0.05,
  transmission: 1, 
  thickness: 1.5, 
  ior: 1.5, 
  iridescence: 1, 
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [100, 400],
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  side: THREE.DoubleSide
}

function Shape({ type }) {
  const meshRef = useRef()

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2
      meshRef.current.rotation.y += delta * 0.3
    }
  })

  if (type === 'pyramid') {
    return (
      <Tetrahedron ref={meshRef} args={[1.5, 0]}>
        <meshPhysicalMaterial {...materialProps} />
      </Tetrahedron>
    )
  }

  if (type === 'layers') {
    return (
      <group ref={meshRef}>
        <RoundedBox args={[2.2, 0.1, 2.2]} position={[0, 0.8, 0]} radius={0.02} smoothness={4}>
          <meshPhysicalMaterial {...materialProps} />
        </RoundedBox>
        <RoundedBox args={[2.2, 0.1, 2.2]} position={[0, 0, 0]} radius={0.02} smoothness={4}>
          <meshPhysicalMaterial {...materialProps} />
        </RoundedBox>
        <RoundedBox args={[2.2, 0.1, 2.2]} position={[0, -0.8, 0]} radius={0.02} smoothness={4}>
          <meshPhysicalMaterial {...materialProps} />
        </RoundedBox>
      </group>
    )
  }

  // Default to Cube
  return (
    <RoundedBox ref={meshRef} args={[1.8, 1.8, 1.8]} radius={0.1} smoothness={4}>
      <meshPhysicalMaterial {...materialProps} />
    </RoundedBox>
  )
}

export default function IridescentShapeScene({ shape = "cube" }) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '350px', cursor: 'grab' }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={2} />
        
        <PresentationControls 
          global 
          config={{ mass: 2, tension: 500 }} 
          snap={{ mass: 4, tension: 1500 }} 
          rotation={[0.1, 0.3, 0]} 
          polar={[-Math.PI / 3, Math.PI / 3]} 
          azimuth={[-Math.PI / 1.4, Math.PI / 2]}
        >
          <Float speed={2.5} rotationIntensity={0.6} floatIntensity={1.2}>
            <Center>
              <Shape type={shape} />
            </Center>
          </Float>
        </PresentationControls>

        <Environment preset="studio" />
        <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2} far={4} />
      </Canvas>
    </div>
  )
}