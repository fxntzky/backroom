import { useMemo } from 'react'
import * as THREE from 'three'

type V3 = [number, number, number]

/** Room 002: a finite, navigable architectural installation with an apparently endless sky. */
function Cloud({ position, size, opacity = .43 }: { position: V3; size: V3; opacity?: number }) {
  return <mesh position={position} scale={size}>
    <sphereGeometry args={[1, 16, 10]} />
    <meshBasicMaterial color="#f9fcff" transparent opacity={opacity} depthWrite={false} fog={true} />
  </mesh>
}

function Ledge({ position, size, color = '#e5ebea' }: { position: V3; size: V3; color?: string }) {
  return <mesh position={position} receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={.91} metalness={0} />
  </mesh>
}

const cloudClusters: Array<{ position: V3; size: V3; opacity: number }> = [
  { position: [-6.3, 1.0, -8], size: [2.9, .85, 1.45], opacity: .63 },
  { position: [-7.9, 1.3, -5.7], size: [2.5, 1.0, 1.7], opacity: .57 },
  { position: [7.0, .8, -7.5], size: [3.1, .85, 1.6], opacity: .65 },
  { position: [8.5, 1.1, -3.8], size: [2.5, .8, 1.9], opacity: .55 },
  { position: [-5.5, 2.2, -2.4], size: [2.6, .6, 1.4], opacity: .28 },
  { position: [6.4, 2.7, .2], size: [2.2, .75, 1.25], opacity: .3 },
  { position: [-2.9, 5.8, -8.2], size: [2.7, .75, 1.9], opacity: .35 },
  { position: [2.5, 6.3, -7.7], size: [2.6, .8, 1.6], opacity: .35 },
  { position: [0, 7.7, -10], size: [5.2, 1.15, 1.2], opacity: .38 },
  { position: [-9.6, 3, 1.8], size: [2, .6, 2.7], opacity: .28 },
  { position: [9.5, 3.7, 4.6], size: [2.2, .9, 2.6], opacity: .23 },
]

export function CloudChamber() {
  const mist = useMemo(() => new THREE.Color('#c4d8e5'), [])
  return <group>
    <hemisphereLight args={['#ffffff', '#b8cfda', 2.6]} />
    <ambientLight intensity={1.15} />
    <directionalLight position={[-4, 11, -8]} color="#fff9e9" intensity={2.5} />
    {/* The playable perimeter is subtle and fades into scene fog. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[18, 22]} />
      <meshStandardMaterial color="#e7edf0" roughness={.86} metalness={0} />
    </mesh>
    <Ledge position={[-8.8, .24, 0]} size={[.32, .48, 22]} color="#eff3f4" />
    <Ledge position={[8.8, .24, 0]} size={[.32, .48, 22]} color="#eff3f4" />
    <Ledge position={[0, .24, -10.8]} size={[18, .48, .32]} color="#eff3f4" />
    {/* A repeated series of freestanding arches provides scale and photographic framing. */}
    {[-7.5, -3.3, .9].map((z, i) => <group key={z} position={[0, 0, z]}>
      <Ledge position={[-5.6, 3.05, 0]} size={[.32, 6.1, .4]} color={i === 0 ? '#f4f7f7' : '#e4eaf0'} />
      <Ledge position={[5.6, 3.05, 0]} size={[.32, 6.1, .4]} color={i === 0 ? '#f4f7f7' : '#e4eaf0'} />
      <Ledge position={[0, 6.08, 0]} size={[11.5, .3, .45]} color="#f6f8f8" />
    </group>)}
    {/* A hovering stair sculpture: scenic, not a required traversal path. */}
    {Array.from({ length: 9 }, (_, i) => {
      const z = -7.5 + i * .74
      return <Ledge key={i} position={[0, .18 + i * .26, z]} size={[2.65 - i * .075, .27, .68]} color={i % 2 === 0 ? '#f7faf9' : '#dae3e9'} />
    })}
    <Ledge position={[0, 2.65, -1.45]} size={[2.1, .16, 2.3]} color="#f7fafb" />
    <mesh position={[0, 5.05, -1.6]}>
      <sphereGeometry args={[.88, 24, 16]} />
      <meshBasicMaterial color="#fffdf6" transparent opacity={.83} />
    </mesh>
    <pointLight position={[0, 4.5, -2]} color="#fff7db" intensity={4} distance={9} decay={2} />
    {cloudClusters.map((cloud, i) => <Cloud key={i} {...cloud} />)}
    {/* A destination arch near the player's original spawn edge. */}
    <group position={[0, 0, 10.55]}>
      <Ledge position={[-1.42, 1.65, 0]} size={[.2, 3.3, .32]} color="#bdcbd5" />
      <Ledge position={[1.42, 1.65, 0]} size={[.2, 3.3, .32]} color="#bdcbd5" />
      <Ledge position={[0, 3.26, 0]} size={[3.04, .2, .32]} color="#bdcbd5" />
      <mesh position={[0, 1.58, -.15]}><planeGeometry args={[2.6, 3.03]} /><meshBasicMaterial color={mist} transparent opacity={.3} depthWrite={false} /></mesh>
    </group>
  </group>
}

export function canWalkCloud(x: number, z: number) {
  const radius = .34
  if (Math.abs(x) > 8.55 - radius || Math.abs(z) > 10.65 - radius) return false
  // Keep the stair sculpture physically grounded; everything else stays open.
  if (Math.abs(x) < 1.65 && z > -8.05 && z < -.25) return false
  return true
}
