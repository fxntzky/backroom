import { useCallback, useEffect, useRef, useState } from 'react'
import { Experience } from './Experience'
import { downloadPhotograph, loadPhotographs, removePhotograph, storePhotograph, type Photograph, type RoomId, type CameraPose } from './photography'
import './styles.css'

type Mode = 'explore' | 'photo' | 'gallery'

function App() {
  const [active, setActive] = useState(false)
  const [mode, setMode] = useState<Mode>('explore')
  const [room, setRoom] = useState<RoomId>('office')
  const [travel, setTravel] = useState<{ id: number; room: RoomId; pose?: CameraPose } | null>(null)
  const travelNumber = useRef(0)
  const [prompt, setPrompt] = useState('')
  const [position, setPosition] = useState({ x: 0, z: 0 })
  const [photos, setPhotos] = useState<Photograph[]>([])
  const [selected, setSelected] = useState<Photograph | null>(null)
  const [notice, setNotice] = useState('')
  const captureRef = useRef<(() => { data: string; pose: CameraPose }) | null>(null)
  const modeRef = useRef(mode)
  modeRef.current = mode

  const onPosition = useCallback((x: number, z: number) => setPosition({ x, z }), [])
  const registerCapture = useCallback((capture: (() => { data: string; pose: CameraPose }) | null) => { captureRef.current = capture }, [])

  useEffect(() => {
    loadPhotographs().then(setPhotos).catch(() => setNotice('LOCAL STORAGE UNAVAILABLE'))
    const update = () => setActive(document.pointerLockElement === document.querySelector('#root canvas'))
    document.addEventListener('pointerlockchange', update)
    return () => document.removeEventListener('pointerlockchange', update)
  }, [])

  const enter = () => {
    const canvas = document.querySelector('#root canvas')
    if (canvas instanceof HTMLCanvasElement) void canvas.requestPointerLock()
  }

  const switchMode = (next: Mode) => {
    setSelected(null)
    setMode(next)
    if (document.pointerLockElement) document.exitPointerLock()
  }

  const capture = useCallback(async () => {
    if (modeRef.current !== 'photo' || !captureRef.current) return
    try {
      const { data, pose } = captureRef.current()
      const photo: Photograph = {
        id: crypto.randomUUID(), data, pose, room, createdAt: Date.now(),
        location: room === 'baths' ? 'THE BATHS' : room === 'cloud' ? 'CLOUD CHAMBER' : 'ENDLESS OFFICE',
      }
      await storePhotograph(photo)
      setPhotos(previous => [...previous, photo])
      setNotice('PHOTOGRAPH ADDED TO COLLECTION')
    } catch (error) {
      console.error(error)
      setNotice('CAPTURE FAILED — CHECK BROWSER STORAGE / CONSOLE')
    }
  }, [room])

  const changeRoom = useCallback((nextRoom: RoomId, pose?: CameraPose) => {
    setTravel({ id: ++travelNumber.current, room: nextRoom, pose })
    setRoom(nextRoom)
    setPrompt('')
    setMode('explore')
    if (document.pointerLockElement) document.exitPointerLock()
  }, [])

  const revisit = useCallback((photo: Photograph) => {
    if (!photo.pose || !photo.room) { setNotice('THIS OLDER PHOTOGRAPH HAS NO SAVED LOCATION'); return }
    changeRoom(photo.room, photo.pose)
  }, [changeRoom])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (selected) return
      if (event.repeat) return
      if (event.code === 'KeyF' && modeRef.current === 'explore' && document.pointerLockElement) {
        event.preventDefault()
        switchMode('photo')
      } else if (event.code === 'KeyG' && modeRef.current === 'explore' && document.pointerLockElement) {
        event.preventDefault()
        switchMode('gallery')
      } else if (event.code === 'KeyG' && modeRef.current === 'gallery' && document.pointerLockElement) {
        event.preventDefault()
        switchMode('explore')
      } else if (event.code === 'Escape' && modeRef.current === 'photo') {
        switchMode('explore')
      } else if ((event.code === 'Space' || event.code === 'Enter') && modeRef.current === 'photo') {
        event.preventDefault()
        void capture()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [capture, selected])

  const deletePhoto = async (photo: Photograph) => {
    try {
      await removePhotograph(photo.id)
      setPhotos(previous => previous.filter(item => item.id !== photo.id))
      setSelected(null)
    } catch { setNotice('COULD NOT REMOVE PHOTOGRAPH') }
  }

  return (
    <main className={`app mode-${mode}`}>
      <Experience active={active} mode={mode} room={room} travel={travel} photos={photos} onPosition={onPosition}
        onPrompt={setPrompt} onEnterBaths={() => changeRoom('baths')} onExitBaths={() => changeRoom('office')}
        onEnterCloud={() => changeRoom('cloud')} onExitCloud={() => changeRoom('office')}
        onRevisit={revisit} registerCapture={registerCapture} />
      <div className="noise" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      {mode !== 'photo' && <header className="hud-header">
        <div className="identity"><span className="identity-mark">B/</span><span>THE BACKROOM<br /><small>{mode === 'gallery' ? 'YOUR COLLECTION / 001' : 'EXPERIMENT 004'}</small></span></div>
        <div className="status"><span className="indicator" /> {mode === 'gallery' ? 'THE GALLERY' : room === 'baths' ? 'THE BATHS' : room === 'cloud' ? 'CLOUD CHAMBER' : 'ENVIRONMENT ACTIVE'}</div>
      </header>}
      {active && mode !== 'photo' && <>
        <div className="crosshair" aria-hidden="true" />
        <div className="coordinates">{mode === 'gallery' ? `${photos.length} WORKS / PRIVATE COLLECTION` : `POS  ${position.x.toFixed(1)} / ${position.z.toFixed(1)} · LVL 00`}</div>
        <div className="hint">{mode === 'gallery' ? 'WASD — WALK   /   G — RETURN TO OFFICE   /   ESC — PAUSE' : 'WASD — MOVE   /   SHIFT — RUN   /   E — ENTER   /   F — CAMERA   /   G — GALLERY   /   ESC — PAUSE'}</div>
      </>}
      {prompt && active && mode !== 'photo' && <div className="portal-prompt">{prompt}</div>}
      {mode === 'photo' && <>
        <div className="photo-viewfinder" aria-hidden="true"><i /><i /><i /><i /><span className="photo-center">+</span></div>
        <header className="photo-top"><span>B/ &nbsp; CAMERA 001</span><span>PHOTOGRAPHIC MODE / 16:9</span></header>
        <footer className="photo-bottom">
          <span>DRAG — LOOK &nbsp; / &nbsp; SCROLL — ZOOM &nbsp; / &nbsp; SPACE — CAPTURE &nbsp; / &nbsp; ESC — EXIT</span>
          <div><button type="button" className="text-button" onClick={() => switchMode('explore')}>CANCEL</button><button type="button" className="shutter" onClick={() => void capture()}>● &nbsp; CAPTURE</button></div>
        </footer>
      </>}
      {!active && mode !== 'photo' && <div className="overlay" onClick={enter}>
        <section className="entry" onClick={event => event.stopPropagation()}>
          <p className="eyebrow"><span className="indicator" /> {mode === 'gallery' ? 'A ROOM BUILT FROM YOUR PHOTOGRAPHS' : room === 'baths' ? 'A LIMINAL PHOTOGRAPHY EXPERIENCE / ROOM 001' : room === 'cloud' ? 'A LIMINAL PHOTOGRAPHY EXPERIENCE / ROOM 002' : 'AN EXPLORABLE PHOTOGRAPHY EXPERIENCE'}</p>
          <h1>{mode === 'gallery' ? <>YOUR<br /><em>GALLERY.</em></> : room === 'baths' ? <>THE<br /><em>BATHS.</em></> : room === 'cloud' ? <>CLOUD<br /><em>CHAMBER.</em></> : <>FIND YOUR<br /><em>FRAME.</em></>}</h1>
          <p className="description">{mode === 'gallery' ? `${photos.length} photographs. A collection shaped by the way you see.` : room === 'baths' ? 'A place where the water remains perfectly still.' : room === 'cloud' ? 'A room that forgot the difference between inside and outside.' : 'Explore a world. Photograph something more.'}</p>
          <button className="enter" type="button" onClick={enter}><span>{mode === 'gallery' ? 'ENTER GALLERY' : 'ENTER ENVIRONMENT'}</span><span>↗</span></button>
          {mode === 'gallery' && <button type="button" className="secondary-enter" onClick={() => switchMode('explore')}>← RETURN TO OFFICE</button>}
          <div className="instructions"><span>WASD / MOVE</span><span>MOUSE / LOOK</span><span>F / PHOTO MODE</span><span>G / GALLERY</span></div>
        </section>
        <p className="overlay-footer">BACKROOM &nbsp; — &nbsp; AN INTERACTIVE VISUAL EXPERIENCE</p>
      </div>}
      {active && mode === 'gallery' && photos.length === 0 && <div className="gallery-empty">THE WALLS ARE WAITING FOR YOUR PHOTOGRAPHS.<br /><small>PRESS G, THEN F IN THE OFFICE TO USE YOUR CAMERA.</small></div>}
      {mode === 'gallery' && !active && photos.length > 0 && <button type="button" className="collection-button" onClick={() => setSelected(photos[photos.length - 1])}>VIEW COLLECTION ({photos.length})</button>}
      {mode === 'gallery' && active && photos.length > 0 && <button type="button" className="collection-button" onClick={() => { if (document.pointerLockElement) document.exitPointerLock(); setSelected(photos[photos.length - 1]) }}>VIEW COLLECTION ({photos.length})</button>}
      {selected && <div className="photo-modal"><div className="photo-modal-inner"><img src={selected.data} alt="Your photograph from Backroom" /><div className="photo-modal-actions"><span>{new Date(selected.createdAt).toLocaleString()} / {selected.location}</span><button onClick={() => downloadPhotograph(selected)}>DOWNLOAD</button>{selected.pose && selected.room && <button onClick={() => { setSelected(null); revisit(selected) }}>REVISIT PLACE ↗</button>}<button onClick={() => void deletePhoto(selected)}>DELETE</button><button onClick={() => setSelected(null)}>CLOSE ×</button></div><div className="photo-thumbnails">{photos.map(photo => <button key={photo.id} onClick={() => setSelected(photo)} className={selected.id === photo.id ? 'chosen' : ''}><img src={photo.data} alt="" /></button>)}</div></div></div>}
      {notice && <div className="notification" role="status" onClick={() => setNotice('')}>{notice} &nbsp; ×</div>}
    </main>
  )
}

export default App
