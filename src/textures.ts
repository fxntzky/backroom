import * as THREE from 'three'
import { rand } from './world'

type Painter = (ctx: CanvasRenderingContext2D, size: number, random: () => number) => void

function createTexture(paint: Painter, repeatX: number, repeatY: number, seed: number) {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  paint(ctx, size, rand(seed))
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

export function carpetTexture() {
  return createTexture((ctx, s, random) => {
    ctx.fillStyle = '#605a47'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 44000; i++) {
      const x = random() * s
      const y = random() * s
      const shade = random()
      ctx.strokeStyle = shade < 0.3 ? 'rgba(35,34,28,.25)' : shade < 0.66 ? 'rgba(167,151,108,.20)' : 'rgba(101,95,74,.34)'
      ctx.lineWidth = 0.45 + random() * 0.75
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (random() - 0.5) * 4, y + 1 + random() * 5)
      ctx.stroke()
    }
    // Irregular old water marks, intentionally subtle.
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = `rgba(48,44,31,${random() * 0.024})`
      ctx.beginPath()
      ctx.ellipse(random() * s, random() * s, 12 + random() * 55, 9 + random() * 40, random() * 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }, 34, 34, 13)
}

export function wallpaperTexture() {
  return createTexture((ctx, s, random) => {
    ctx.fillStyle = '#c3b78d'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 23000; i++) {
      const x = random() * s
      const y = random() * s
      ctx.fillStyle = random() < 0.48 ? 'rgba(80,69,44,.065)' : 'rgba(255,245,205,.085)'
      ctx.fillRect(x, y, 0.5 + random() * 1.3, 1 + random() * 4)
    }
    for (let x = 12; x < s; x += 64) {
      ctx.fillStyle = 'rgba(83,76,53,.028)'
      ctx.fillRect(x, 0, 1, s)
    }
    const gradient = ctx.createLinearGradient(0, 0, s, 0)
    gradient.addColorStop(0, 'rgba(49,43,30,.05)')
    gradient.addColorStop(0.5, 'rgba(255,251,227,.015)')
    gradient.addColorStop(1, 'rgba(49,43,30,.05)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, s, s)
  }, 1, 1, 23)
}

export function ceilingTexture() {
  return createTexture((ctx, s, random) => {
    ctx.fillStyle = '#c7c3ab'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 8000; i++) {
      ctx.fillStyle = random() < 0.5 ? 'rgba(79,76,62,.10)' : 'rgba(242,237,211,.15)'
      ctx.fillRect(random() * s, random() * s, 1, 1)
    }
    const tile = s / 4
    ctx.strokeStyle = '#827d6a'
    ctx.lineWidth = 2
    for (let x = 0; x <= s; x += tile) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke()
    }
    for (let y = 0; y <= s; y += tile) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255,255,236,.22)'
    ctx.lineWidth = 1
    for (let x = 1; x < s; x += tile) {
      ctx.beginPath(); ctx.moveTo(x + 2, 0); ctx.lineTo(x + 2, s); ctx.stroke()
    }
  }, 23, 23, 39)
}
