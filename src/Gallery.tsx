import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Photograph } from './photography'

function Frame({ photo, x, z, rotation = 0 }: { photo: Photograph; x: number; z: number; rotation?: number }) {
  const texture = useMemo(() => {
    const result = new THREE.TextureLoader().load(photo.data)
    result.colorSpace = THREE.SRGBColorSpace
    result.anisotropy = 4
    return result
  }, [photo.data])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <group position={[x, 1.83, z]} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0, -0.018]}><boxGeometry args={[2.24, 1.43, 0.08]} /><meshStandardMaterial color="#25241e" roughness={0.95} /></mesh>
      <mesh position={[0, 0, 0.045]} userData={{ photoId: photo.id }}><planeGeometry args={[2.04, 1.15]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
      <mesh position={[0, -0.84, 0.047]}><planeGeometry args={[2.2, 0.12]} /><meshBasicMaterial color="#aea998" /></mesh>
      <mesh position={[0, -0.84, 0.05]}><planeGeometry args={[2.2, 0.12]} /><meshBasicMaterial color="#aea998" /></mesh>
      <mesh position={[0, 0.95, 0.1]}><boxGeometry args={[0.5, 0.035, 0.10]} /><meshBasicMaterial color="#dcd7bc" /></mesh>
      <pointLight position={[0, 0.85, 0.6]} intensity={1.8} color="#fff3d8" distance={3.5} decay={2} />
      <group position={[-0.99, -0.83, 0.055]}><mesh><planeGeometry args={[0.06, 0.05]} /><meshBasicMaterial color="#171717" /></mesh></group>
      <group position={[0.87, -0.83, 0.055]}><mesh><planeGeometry args={[0.2, 0.06]} /><meshBasicMaterial color="#171717" /></mesh></group>
      <mesh position={[0, -0.93, 0.05]}><planeGeometry args={[0.001, 0.001]} /><meshBasicMaterial color="#fff" /></mesh>
    </group>
  )
}

export function Gallery({ photos }: { photos: Photograph[] }) {
  const galleryFloor = useMemo(() => new THREE.MeshStandardMaterial({ color: '#85857c', roughness: 0.92 }), [])
  useEffect(() => () => galleryFloor.dispose(), [galleryFloor])
  const wall = '#d4d0c4'
  return (
    <group>
      <hemisphereLight args={['#ffffff', '#77766c', 2]} />
      <ambientLight intensity={0.7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={galleryFloor}><planeGeometry args={[17, 14]} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.8, 0]}><planeGeometry args={[17, 14]} /><meshStandardMaterial color="#eeeae0" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 1.9, -7]}><boxGeometry args={[17, 3.8, 0.2]} /><meshStandardMaterial color={wall} /></mesh>
      <mesh position={[-8.5, 1.9, 0]}><boxGeometry args={[0.2, 3.8, 14]} /><meshStandardMaterial color={wall} /></mesh>
      <mesh position={[8.5, 1.9, 0]}><boxGeometry args={[0.2, 3.8, 14]} /><meshStandardMaterial color={wall} /></mesh>
      <mesh position={[0, 1.9, 7]}><boxGeometry args={[17, 3.8, 0.2]} /><meshStandardMaterial color={wall} /></mesh>
      {[-5.2, 0, 5.2].map(x => <group key={x} position={[x, 3.76, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.7, 0.56]} /><meshBasicMaterial color="#fff9dc" /></mesh>
        <pointLight intensity={6} position={[0, -0.2, 0]} color="#fff4d6" distance={7} decay={2} />
      </group>)}
      {photos.slice(0, 12).map((photo, i) => {
        const wallIndex = Math.floor(i / 4)
        const offset = (i % 4 - 1.5) * 3.55
        if (wallIndex === 0) return <Frame key={photo.id} photo={photo} x={offset} z={-6.86} />
        if (wallIndex === 1) return <Frame key={photo.id} photo={photo} x={-8.36} z={offset} rotation={Math.PI / 2} />
        return <Frame key={photo.id} photo={photo} x={8.36} z={offset} rotation={-Math.PI / 2} />
      })}
    </group>
  )
}
