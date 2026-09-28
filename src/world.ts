export const GRID = 23
export const CELL = 5.4
export const HALF = GRID * CELL / 2
export const HEIGHT = 3.45
export const WALL_THICKNESS = 0.19

export type Barrier = {
  x: number
  z: number
  width: number
  depth: number
  horizontal: boolean
}

export type Lamp = { x: number; z: number; active: boolean }

function randomGenerator(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const rand = randomGenerator

export function generateWorld(seed = 8196) {
  const random = rand(seed)
  const vertical = Array.from({ length: GRID }, () => Array(GRID + 1).fill(true) as boolean[])
  const horizontal = Array.from({ length: GRID + 1 }, () => Array(GRID).fill(true) as boolean[])
  const visited = Array.from({ length: GRID }, () => Array(GRID).fill(false) as boolean[])
  const center = Math.floor(GRID / 2)
  const stack: Array<[number, number]> = [[center, center]]
  visited[center][center] = true

  // Connected maze as a starting point; remove additional partitions to make
  // it feel like an unnaturally sprawling office rather than a narrow dungeon.
  while (stack.length) {
    const [r, c] = stack[stack.length - 1]
    const neighbors: Array<[number, number, 'N' | 'S' | 'E' | 'W']> = []
    if (r > 0 && !visited[r - 1][c]) neighbors.push([r - 1, c, 'N'])
    if (r < GRID - 1 && !visited[r + 1][c]) neighbors.push([r + 1, c, 'S'])
    if (c > 0 && !visited[r][c - 1]) neighbors.push([r, c - 1, 'W'])
    if (c < GRID - 1 && !visited[r][c + 1]) neighbors.push([r, c + 1, 'E'])
    if (neighbors.length === 0) {
      stack.pop()
      continue
    }
    const [nr, nc, dir] = neighbors[Math.floor(random() * neighbors.length)]
    if (dir === 'N') horizontal[r][c] = false
    if (dir === 'S') horizontal[r + 1][c] = false
    if (dir === 'W') vertical[r][c] = false
    if (dir === 'E') vertical[r][c + 1] = false
    visited[nr][nc] = true
    stack.push([nr, nc])
  }

  for (let r = 0; r < GRID; r++) {
    for (let c = 1; c < GRID; c++) {
      if (random() < 0.65) vertical[r][c] = false
    }
  }
  for (let r = 1; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (random() < 0.65) horizontal[r][c] = false
    }
  }

  // Keep an unobstructed opening around the spawn point.
  vertical[center][center] = false
  vertical[center][center + 1] = false
  horizontal[center][center] = false
  horizontal[center + 1][center] = false

  const barriers: Barrier[] = []
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c <= GRID; c++) {
      if (vertical[r][c]) {
        barriers.push({
          x: -HALF + c * CELL,
          z: -HALF + (r + 0.5) * CELL,
          width: WALL_THICKNESS,
          depth: CELL + WALL_THICKNESS,
          horizontal: false,
        })
      }
    }
  }
  for (let r = 0; r <= GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (horizontal[r][c]) {
        barriers.push({
          x: -HALF + (c + 0.5) * CELL,
          z: -HALF + r * CELL,
          width: CELL + WALL_THICKNESS,
          depth: WALL_THICKNESS,
          horizontal: true,
        })
      }
    }
  }

  const lamps: Lamp[] = []
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const x = -HALF + (c + 0.5) * CELL
      const z = -HALF + (r + 0.5) * CELL
      // One main fluorescent unit per cell, with a handful of dead bulbs.
      lamps.push({ x, z, active: random() > 0.13 })
    }
  }
  return { barriers, lamps }
}

export const world = generateWorld()

export function canOccupy(x: number, z: number, radius = 0.32) {
  if (x < -HALF + radius || x > HALF - radius || z < -HALF + radius || z > HALF - radius) return false
  for (const wall of world.barriers) {
    const nearestX = Math.max(wall.x - wall.width / 2, Math.min(x, wall.x + wall.width / 2))
    const nearestZ = Math.max(wall.z - wall.depth / 2, Math.min(z, wall.z + wall.depth / 2))
    const dx = x - nearestX
    const dz = z - nearestZ
    if (dx * dx + dz * dz < radius * radius) return false
  }
  return true
}
