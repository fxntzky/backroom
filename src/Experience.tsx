import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { HALF, HEIGHT, CELL, canOccupy, world } from './world'
import { carpetTexture, ceilingTexture, wallpaperTexture } from './textures'
import { Gallery } from './Gallery'
import { Baths, canWalkBaths } from './Baths'
import { renderPhotograph, type Photograph, type RoomId, type CameraPose } from './photography'

const EYE_HEIGHT = 1.64
const LIGHT_COUNT = 9

function Architecture() {
  const verticalRef = useRef<THREE.InstancedMesh>(null)
  const horizontalRef = useRef<THREE.InstancedMesh>(null)
  const panelRef = useRef<THREE.InstancedMesh>(null)
  const housingRef = useRef<THREE.InstancedMesh>(null)

  const materials = useMemo(() => {
    const floorMap = carpetTexture()
    const wallMap = wallpaperTexture()
    const ceilingMap = ceilingTexture()
    return {
      floor: new THREE.MeshStandardMaterial({ map: floorMap, roughness: 1, metalness: 0 }),
      wall: new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.98, metalness: 0, side: THREE.DoubleSide }),
      ceiling: new THREE.MeshStandardMaterial({ map: ceilingMap, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
      panel: new THREE.MeshBasicMaterial({ color: '#d8e8d5', side: THREE.DoubleSide }),
      housing: new THREE.MeshStandardMaterial({ color: '#706f61', roughness: 0.75 }),
    }
  }, [])

  const verticalWalls = useMemo(() => world.barriers.filter(w => !w.horizontal), [])
  const horizontalWalls = useMemo(() => world.barriers.filter(w => w.horizontal), [])
  const workingObject = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    if (!verticalRef.current || !horizontalRef.current || !panelRef.current || !housingRef.current) return
    verticalWalls.forEach((w, i) => {
      workingObject.position.set(w.x, HEIGHT / 2, w.z)
      workingObject.scale.set(w.width, HEIGHT, w.depth)
      workingObject.rotation.set(0, 0, 0)
      workingObject.updateMatrix()
      verticalRef.current!.setMatrixAt(i, workingObject.matrix)
    })
    horizontalWalls.forEach((w, i) => {
      workingObject.position.set(w.x, HEIGHT / 2, w.z)
      workingObject.scale.set(w.width, HEIGHT, w.depth)
      workingObject.updateMatrix()
      horizontalRef.current!.setMatrixAt(i, workingObject.matrix)
    })
    world.lamps.forEach((lamp, i) => {
      workingObject.position.set(lamp.x, HEIGHT - 0.045, lamp.z)
      workingObject.rotation.set(-Math.PI / 2, 0, 0)
      workingObject.scale.set(1.52, 0.62, 1)
      workingObject.updateMatrix()
      housingRef.current!.setMatrixAt(i, workingObject.matrix)
      workingObject.position.y -= 0.015
      workingObject.scale.set(1.38, 0.49, 1)
      workingObject.updateMatrix()
      panelRef.current!.setMatrixAt(i, workingObject.matrix)
      panelRef.current!.setColorAt(i, new THREE.Color(lamp.active ? '#d8e9d7' : '#666953'))
    })
    verticalRef.current.instanceMatrix.needsUpdate = true
    horizontalRef.current.instanceMatrix.needsUpdate = true
    panelRef.current.instanceMatrix.needsUpdate = true
    housingRef.current.instanceMatrix.needsUpdate = true
    if (panelRef.current.instanceColor) panelRef.current.instanceColor.needsUpdate = true
  }, [verticalWalls, horizontalWalls, workingObject])

  useEffect(() => () => {
    Object.values(materials).forEach(material => material.dispose())
    materials.floor.map?.dispose()
    materials.wall.map?.dispose()
    materials.ceiling.map?.dispose()
  }, [materials])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={materials.floor}>
        <planeGeometry args={[HALF * 2, HALF * 2]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HEIGHT, 0]} material={materials.ceiling}>
        <planeGeometry args={[HALF * 2, HALF * 2]} />
      </mesh>
      <instancedMesh ref={verticalRef} args={[undefined, undefined, verticalWalls.length]} material={materials.wall} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh ref={horizontalRef} args={[undefined, undefined, horizontalWalls.length]} material={materials.wall} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh ref={housingRef} args={[undefined, undefined, world.lamps.length]} material={materials.housing} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </instancedMesh>
      <instancedMesh ref={panelRef} args={[undefined, undefined, world.lamps.length]} material={materials.panel} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </instancedMesh>
    </group>
  )
}

function NearbyFluorescents() {
  const lights = useRef<Array<THREE.PointLight | null>>([])
  const frameCounter = useRef(0)
  useFrame(({ camera }) => {
    frameCounter.current++
    if (frameCounter.current % 14 !== 1) return
    const nearest = world.lamps
      .filter(lamp => lamp.active && Math.abs(lamp.x - camera.position.x) < CELL * 3 && Math.abs(lamp.z - camera.position.z) < CELL * 3)
      .map(lamp => ({ lamp, distance: (lamp.x - camera.position.x) ** 2 + (lamp.z - camera.position.z) ** 2 }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, LIGHT_COUNT)

    lights.current.forEach((light, i) => {
      if (!light) return
      const entry = nearest[i]
      if (!entry) {
        light.intensity = 0
      } else {
        light.position.set(entry.lamp.x, HEIGHT - 0.35, entry.lamp.z)
        light.intensity = 9
      }
    })
  })
  return <>{Array.from({ length: LIGHT_COUNT }, (_, i) => (
    <pointLight key={i} ref={node => { lights.current[i] = node }} intensity={0} color="#eee9c3" distance={12.5} decay={2} />
  ))}</>
}

type GameMode = 'explore' | 'photo' | 'gallery'
type Travel = { id: number; room: RoomId; pose?: CameraPose }
const OFFICE_PORTAL = new THREE.Vector2(0, -2.25)

function Portal() {
  return <group position={[OFFICE_PORTAL.x, 0, OFFICE_PORTAL.y]}>
    <mesh position={[0, 1.62, 0]}><boxGeometry args={[2.05, 3.22, .16]} /><meshBasicMaterial color="#718e83" /></mesh>
    <mesh position={[0, 1.62, .10]}><planeGeometry args={[1.66, 2.78]} /><meshBasicMaterial color="#b1d9c9" /></mesh>
    <mesh position={[0, 3.34, .10]}><boxGeometry args={[2.35, .2, .27]} /><meshBasicMaterial color="#4a655c" /></mesh>
    <pointLight position={[0, 1.8, .65]} color="#b4e9d8" intensity={6} distance={4} decay={2} />
  </group>
}

function Player({ active, mode, room, travel, photos, onPosition, onPrompt, onEnterBaths, onExitBaths, onRevisit }: {
  active: boolean; mode: GameMode; room: RoomId; travel: Travel | null; photos: Photograph[]
  onPosition: (x: number, z: number) => void; onPrompt: (label: string) => void
  onEnterBaths: () => void; onExitBaths: () => void; onRevisit: (photo: Photograph) => void
}) {
  const { camera, gl, scene } = useThree()
  const keys = useRef(new Set<string>())
  const yaw = useRef(0)
  const pitch = useRef(0)
  const positionReport = useRef(0)
  const dragging = useRef(false)
  const environmentRef = useRef('office')
  const lastTravelId = useRef<number | null>(null)
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const target = useRef<Photograph | null>(null)
  const previousMode = useRef<GameMode>(mode)
  const nearby = useRef('')

  useEffect(() => {
    const environment = mode === 'gallery' ? 'gallery' : room
    const freshTravel = !!travel && travel.id !== lastTravelId.current && travel.room === environment
    if (environmentRef.current !== environment || freshTravel) {
      const pose = freshTravel ? travel?.pose : undefined
      const spawn: [number, number, number] = environment === 'gallery' ? [0, EYE_HEIGHT, 4.2] : environment === 'baths' ? [0, EYE_HEIGHT, 6.3] : [0, EYE_HEIGHT, 0]
      camera.position.set(...(pose?.position ?? spawn))
      yaw.current = pose?.rotation[1] ?? 0
      pitch.current = pose?.rotation[0] ?? 0
      camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')
      environmentRef.current = environment
      lastTravelId.current = travel?.id ?? null
      keys.current.clear()
      const lens = camera as THREE.PerspectiveCamera
      lens.fov = pose?.fov ?? 76
      lens.updateProjectionMatrix()
    }
    if (mode !== 'photo' && (environment === 'gallery' || previousMode.current === 'photo')) {
      const lens = camera as THREE.PerspectiveCamera
      lens.fov = 76
      lens.updateProjectionMatrix()
    }
    previousMode.current = mode
    camera.rotation.order = 'YXZ'
  }, [camera, room, mode, travel])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
        event.preventDefault()
        keys.current.add(event.code)
      }
      if (event.code === 'KeyE' && !event.repeat && active && mode !== 'photo') {
        if (mode === 'gallery' && target.current) onRevisit(target.current)
        else if (room === 'office' && mode === 'explore' && nearby.current === 'baths') onEnterBaths()
        else if (room === 'baths' && mode === 'explore' && nearby.current === 'exit') onExitBaths()
      }
    }
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(event.code)
    const onMouseMove = (event: MouseEvent) => {
      if (mode === 'photo' ? !dragging.current : document.pointerLockElement !== gl.domElement) return
      yaw.current -= event.movementX * .0021
      pitch.current = THREE.MathUtils.clamp(pitch.current - event.movementY * .0021, -1.47, 1.47)
      camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')
    }
    const onDown = (event: MouseEvent) => { if (mode === 'photo' && event.button === 0 && event.target === gl.domElement) dragging.current = true }
    const onUp = () => { dragging.current = false }
    const onWheel = (event: WheelEvent) => {
      if (mode !== 'photo') return
      event.preventDefault()
      const lens = camera as THREE.PerspectiveCamera
      lens.fov = THREE.MathUtils.clamp(lens.fov + Math.sign(event.deltaY) * 2, 28, 85)
      lens.updateProjectionMatrix()
    }
    gl.domElement.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    gl.domElement.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousemove', onMouseMove)
    const clear = () => keys.current.clear()
    window.addEventListener('blur', clear)
    return () => {
      gl.domElement.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      gl.domElement.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('blur', clear)
    }
  }, [camera, gl, mode, active, room, onRevisit, onEnterBaths, onExitBaths])

  useFrame((_, delta) => {
    if (!active) { if (nearby.current !== '') { nearby.current = ''; onPrompt('') }; return }
    let candidate = ''
    target.current = null
    if (mode === 'gallery') {
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      const frameHit = hits.find(hit => hit.distance < 4.3 && typeof hit.object.userData.photoId === 'string')
      if (frameHit) {
        target.current = photos.find(p => p.id === frameHit.object.userData.photoId) ?? null
        if (target.current?.pose && target.current.room) candidate = 'E — ENTER PHOTOGRAPH'
      }
    } else if (mode === 'explore' && room === 'office') {
      if (Math.hypot(camera.position.x - OFFICE_PORTAL.x, camera.position.z - OFFICE_PORTAL.y) < 2.5) candidate = 'baths'
    } else if (mode === 'explore' && room === 'baths') {
      if (camera.position.z > 9.2 && Math.abs(camera.position.x) < 2.5) candidate = 'exit'
    }
    if (candidate !== nearby.current) {
      nearby.current = candidate
      onPrompt(candidate === 'baths' ? 'E — ENTER THE BATHS' : candidate === 'exit' ? 'E — RETURN TO OFFICE' : candidate)
    }
    if (mode === 'photo') return
    const held = keys.current
    let forward = Number(held.has('KeyW') || held.has('ArrowUp')) - Number(held.has('KeyS') || held.has('ArrowDown'))
    let strafe = Number(held.has('KeyD') || held.has('ArrowRight')) - Number(held.has('KeyA') || held.has('ArrowLeft'))
    if (forward === 0 && strafe === 0) return
    const length = Math.hypot(forward, strafe)
    forward /= length
    strafe /= length
    const speed = (held.has('ShiftLeft') || held.has('ShiftRight') ? 6.2 : 3.25) * Math.min(delta, .05)
    const sin = Math.sin(yaw.current), cos = Math.cos(yaw.current)
    const dx = (-sin * forward + cos * strafe) * speed
    const dz = (-cos * forward - sin * strafe) * speed
    const canWalk = (x: number, z: number) => mode === 'gallery'
      ? Math.abs(x) < 7.8 && Math.abs(z) < 6.3
      : room === 'baths' ? canWalkBaths(x, z) : canOccupy(x, z)
    if (canWalk(camera.position.x + dx, camera.position.z)) camera.position.x += dx
    if (canWalk(camera.position.x, camera.position.z + dz)) camera.position.z += dz
    positionReport.current += delta
    if (positionReport.current > .22) {
      positionReport.current = 0
      onPosition(camera.position.x, camera.position.z)
    }
  })
  return null
}

function Atmosphere({ mode, room }: { mode: GameMode; room: RoomId }) {
  const { scene } = useThree()
  useEffect(() => {
    if (mode === 'gallery') {
      scene.background = new THREE.Color('#bcb8ac')
      scene.fog = new THREE.Fog('#bcb8ac', 12, 28)
    } else if (room === 'baths') {
      scene.background = new THREE.Color('#9cb7b1')
      scene.fog = new THREE.Fog('#9cb7b1', 12, 37)
    } else {
      scene.background = new THREE.Color('#353327')
      scene.fog = new THREE.Fog('#353327', 20, 67)
    }
  }, [scene, mode, room])
  return null
}

function PhotographBridge({ register }: { register: (capture: (() => { data: string; pose: CameraPose }) | null) => void }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    const capture = () => ({ data: renderPhotograph(gl, scene, camera as THREE.PerspectiveCamera), pose: { position: camera.position.toArray() as [number, number, number], rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z] as [number, number, number], fov: (camera as THREE.PerspectiveCamera).fov } })
    register(capture)
    return () => register(null)
  }, [gl, scene, camera, register])
  return null
}

export function Experience({ active, mode, room, travel, photos, onPosition, onPrompt, onEnterBaths, onExitBaths, onRevisit, registerCapture }: {
  active: boolean
  mode: GameMode
  room: RoomId
  travel: Travel | null
  photos: Photograph[]
  onPosition: (x: number, z: number) => void
  onPrompt: (label: string) => void
  onEnterBaths: () => void
  onExitBaths: () => void
  onRevisit: (photo: Photograph) => void
  registerCapture: (capture: (() => { data: string; pose: CameraPose }) | null) => void
}) {
  return (
    <Canvas
      camera={{ position: [0, EYE_HEIGHT, 0], fov: 76, near: .045, far: 90 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      onCreated={({ scene }) => { scene.background = new THREE.Color('#353327'); scene.fog = new THREE.Fog('#353327', 20, 67) }}
    >
      {mode === 'gallery' ? <Gallery photos={photos} /> : room === 'baths' ? <Baths /> : <>
        <hemisphereLight args={['#f7efcd', '#746c56', 1.35]} />
        <ambientLight intensity={.38} />
        <Architecture />
        <NearbyFluorescents />
        <Portal />
      </>}
      <Atmosphere mode={mode} room={room} />
      <Player active={active} mode={mode} room={room} travel={travel} photos={photos} onPosition={onPosition}
        onPrompt={onPrompt} onEnterBaths={onEnterBaths} onExitBaths={onExitBaths} onRevisit={onRevisit} />
      <PhotographBridge register={registerCapture} />
    </Canvas>
  )
}
