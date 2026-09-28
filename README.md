# BACKROOM / Experiment 001

A self-contained procedural first-person environment built with Vite, React, TypeScript, Three.js, and React Three Fiber. The scene is generated at runtime: no `.blend`, `.glb`, or external texture assets are required. The optional Google Fonts request falls back to local system fonts if offline.

## Setup (macOS)

Extract the ZIP, then in Terminal:

```bash
cd /Volumes/FF29/2026/code/backroom
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## Controls

- Click **ENTER ENVIRONMENT** to lock the mouse.
- **W A S D** or arrow keys: move
- **Mouse**: look around
- **Shift**: run
- **Esc**: release pointer and pause
- Click **ENTER ENVIRONMENT** again to resume

## Build

```bash
npm run build
npm run preview
```

Deploy to Vercel as a standard Vite project (framework preset: Vite). No backend or environment variables.

## Structure

- `src/world.ts`: deterministic, connected maze, additional openings, wall colliders
- `src/textures.ts`: procedural canvas textures for carpet, wallpaper, ceiling
- `src/Experience.tsx`: instanced geometry, nearby fluorescent lights, FPS movement and sliding collision
- `src/App.tsx`: entry/pause overlay and HUD
- `src/styles.css`: visual interface

This is a **new reinterpretation**, not a conversion of the original Blender scene. Kept deliberately asset-free to avoid UV and GLB export problems. Desktop keyboard/mouse recommended; mobile has no touch movement controls.
