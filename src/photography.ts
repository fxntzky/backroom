import * as THREE from 'three'

export type RoomId = 'office' | 'baths' | 'cloud'
export type CameraPose = { position: [number, number, number]; rotation: [number, number, number]; fov: number }
export type Photograph = { id: string; data: string; createdAt: number; location: string; room?: RoomId; pose?: CameraPose }
const DB_NAME = 'backroom-photographs-v1'
const STORE = 'photographs'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadPhotographs(): Promise<Photograph[]> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly')
    const request = transaction.objectStore(STORE).getAll()
    request.onsuccess = () => resolve((request.result as Photograph[]).sort((a, b) => a.createdAt - b.createdAt))
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
    transaction.onerror = () => db.close()
  })
}

export async function storePhotograph(photo: Photograph): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(photo)
    transaction.oncomplete = () => { db.close(); resolve() }
    transaction.onerror = () => { db.close(); reject(transaction.error) }
  })
}

export async function removePhotograph(id: string): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).delete(id)
    transaction.oncomplete = () => { db.close(); resolve() }
    transaction.onerror = () => { db.close(); reject(transaction.error) }
  })
}

/** Offscreen photograph. Never resizes the live viewport. The saved PNG includes the grade. */
export function renderPhotograph(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): string {
  const width = 1920
  const height = 1080
  const target = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: true,
  })
  const originalTarget = gl.getRenderTarget()
  const oldAspect = camera.aspect
  const oldViewport = gl.getViewport(new THREE.Vector4())
  const oldScissor = gl.getScissor(new THREE.Vector4())
  const oldScissorTest = gl.getScissorTest()
  const pixels = new Uint8Array(width * height * 4)
  try {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    gl.setRenderTarget(target)
    gl.setViewport(0, 0, width, height)
    gl.setScissorTest(false)
    gl.clear()
    gl.render(scene, camera)
    gl.readRenderTargetPixels(target, 0, 0, width, height, pixels)
  } finally {
    gl.setRenderTarget(originalTarget)
    gl.setViewport(oldViewport)
    gl.setScissor(oldScissor)
    gl.setScissorTest(oldScissorTest)
    camera.aspect = oldAspect
    camera.updateProjectionMatrix()
    target.dispose()
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Could not initialize photographic processing')
  const image = ctx.createImageData(width, height)
  const output = image.data
  for (let y = 0; y < height; y++) {
    const sy = height - 1 - y // WebGL pixels are bottom-up.
    const ny = (y / height - 0.5) * 2
    for (let x = 0; x < width; x++) {
      const source = (sy * width + x) * 4
      const destination = (y * width + x) * 4
      const nx = (x / width - 0.5) * 2
      const r = pixels[source], g = pixels[source + 1], b = pixels[source + 2]
      const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722
      const vignette = 1 - 0.21 * Math.min(1, nx * nx * 0.7 + ny * ny)
      const grain = (Math.random() - 0.5) * 8
      const grade = (channel: number, tint: number) => Math.max(0, Math.min(255,
        ((channel * 0.87 + luminance * 0.13 - 9) * 1.055 + tint + grain) * vignette))
      output[destination] = grade(r, 8)
      output[destination + 1] = grade(g, 5)
      output[destination + 2] = grade(b, -6)
      output[destination + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

export function downloadPhotograph(photo: Photograph) {
  const anchor = document.createElement('a')
  anchor.download = `BACKROOM-${new Date(photo.createdAt).toISOString().replace(/[:.]/g, '-')}.png`
  anchor.href = photo.data
  anchor.click()
}
