import { useMemo } from 'react'
import * as THREE from 'three'

// A self-contained, inexpensive architectural room. No reflection passes or imported assets.
function tileTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#c5d1c9'
  ctx.fillRect(0, 0, 512, 512)
  for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) {
    const n = ((x * 17 + y * 11) % 31) / 31
    ctx.fillStyle = `rgb(${192 + n * 13},${207 + n * 10},${200 + n * 9})`
    ctx.fillRect(x + 2, y + 2, 60, 60)
    ctx.strokeStyle = '#899e98'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 2.5, y + 2.5, 59, 59)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 3)
  texture.anisotropy = 4
  return texture
}

function Slab({ position, scale, color = '#bfcac4' }: {
  position: [number, number, number]; scale: [number, number, number]; color?: string
}) {
  return <mesh position={position} receiveShadow><boxGeometry args={scale} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>
}

export function Baths() {
  const tile = useMemo(tileTexture, [])
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ map: tile, color: '#f2f7ef', roughness: 0.92 }), [tile])
  // 18 × 22m room; the central pool is decorative and bounded by a stone lip.
  return <group>
    <hemisphereLight args={['#d4f0ea', '#6b8277', 1.9]} />
    <ambientLight intensity={0.65} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={stone}><planeGeometry args={[18, 22]} /></mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6.8, 0]}><planeGeometry args={[18, 22]} /><meshStandardMaterial color="#bbd2c8" roughness={1} side={THREE.DoubleSide} /></mesh>
    <Slab position={[0, 3.4, -11]} scale={[18, 6.8, .35]} />
    <Slab position={[-9, 3.4, 0]} scale={[.35, 6.8, 22]} />
    <Slab position={[9, 3.4, 0]} scale={[.35, 6.8, 22]} />
    <Slab position={[-5.15, 3.4, 11]} scale={[7.7, 6.8, .35]} />
    <Slab position={[5.15, 3.4, 11]} scale={[7.7, 6.8, .35]} />
    <Slab position={[0, 5.15, 11]} scale={[2.65, 3.3, .35]} />
    {[-6.3, -2.1, 2.1, 6.3].map(x => [-7.9, 7.9].map(z => <group key={`${x}-${z}`} position={[x, 0, z]}>
      <mesh position={[0, 3.4, 0]}><cylinderGeometry args={[.38, .42, 6.8, 16]} /><meshStandardMaterial color="#d5dcd1" roughness={.84}/></mesh>
      <mesh position={[0, 6.28, 0]}><cylinderGeometry args={[.63, .38, .72, 16]} /><meshStandardMaterial color="#c6d3c9" roughness={.9}/></mesh>
      <mesh position={[0, .34, 0]}><cylinderGeometry args={[.54, .44, .68, 16]} /><meshStandardMaterial color="#b7c4bc" roughness={.9}/></mesh>
    </group>))}
    {/* A shallow tiled pool: reflective-looking color without an expensive reflection render target. */}
    <Slab position={[0, -.075, -1.1]} scale={[8.9, .15, 10.6]} color="#e8e4d5" />
    <mesh position={[0, .032, -1.1]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[7.95, 9.65]} />
      <meshStandardMaterial color="#5b9e9b" roughness={.16} metalness={.05} transparent opacity={.9} />
    </mesh>
    <Slab position={[-4.26, .13, -1.1]} scale={[.37, .26, 10.45]} color="#e1e1d4" />
    <Slab position={[4.26, .13, -1.1]} scale={[.37, .26, 10.45]} color="#e1e1d4" />
    <Slab position={[0, .13, -6.16]} scale={[8.9, .26, .37]} color="#e1e1d4" />
    <Slab position={[0, .13, 3.96]} scale={[8.9, .26, .37]} color="#e1e1d4" />
    {[-5.8, 0, 5.8].map(x => <group key={x} position={[x, 6.7, -3.6]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.8, 1.2]} /><meshBasicMaterial color="#e8faf4" /></mesh>
      <pointLight position={[0, -.5, 0]} color="#b4eee1" intensity={13} distance={12} decay={2} />
    </group>)}
    {/* A visibly framed exit at the far end of the room. */}
    <group position={[0, 0, 10.79]}>
      <Slab position={[-1.45, 1.65, 0]} scale={[.2, 3.3, .25]} color="#3d5550" />
      <Slab position={[1.45, 1.65, 0]} scale={[.2, 3.3, .25]} color="#3d5550" />
      <Slab position={[0, 3.26, 0]} scale={[3.1, .18, .25]} color="#3d5550" />
      <mesh position={[0, 2.9, -.13]}><planeGeometry args={[1.2, .17]} /><meshBasicMaterial color="#eff6d9" /></mesh>
    </group>
  </group>
}

export function canWalkBaths(x: number, z: number) {
  const radius = .34
  if (Math.abs(x) > 8.55 - radius || Math.abs(z) > 10.65 - radius) return false
  // The pool is a physical obstacle, except for its surrounding promenade.
  if (Math.abs(x) < 4.45 + radius && z > -6.4 - radius && z < 4.2 + radius) return false
  return true
}
