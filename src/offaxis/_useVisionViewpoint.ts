import { useEffect, useRef, useState } from 'react'
import { FilesetResolver } from '@mediapipe/tasks-vision'
import { ViewpointSmoother } from './Smoother'
import type {
  LandmarkPoint,
  ScreenConfig,
  TrackerVisual,
  TrackingConfig,
  TrackStatus,
  Viewpoint,
} from './types'

export const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm'

type VisionFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>

export type VisionReading = {
  /** normalized image-space viewpoint anchor (0..1) */
  px: number
  py: number
  /** normalized spread used as a depth proxy (bigger = closer) */
  spread: number
  /** spread expected at the nominal viewer distance */
  refSpread: number
  /** landmarks for optional visualisation */
  landmarks: LandmarkPoint[]
}

export type VisionStrategy<L = unknown> = {
  visualKind: 'face' | 'hand'
  loadingMessage: string
  searchingMessage: string
  create: (fileset: VisionFileset) => Promise<L>
  read: (landmarker: L, video: HTMLVideoElement, tsMs: number) => VisionReading | null
  close: (landmarker: L) => void
}

export type VisionViewpointOptions = {
  enabled: boolean
  screen: ScreenConfig
  tracking: TrackingConfig
  /** which webcam to open; null/undefined lets the browser pick a default */
  deviceId?: string | null
  /** called once if the webcam / model cannot start */
  onFallback?: (reason: string) => void
}

export type ViewpointResult = {
  viewpoint: React.MutableRefObject<Viewpoint>
  status: TrackStatus
  message: string
  videoRef: React.MutableRefObject<HTMLVideoElement | null>
  visualRef: React.MutableRefObject<TrackerVisual>
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/**
 * Shared webcam + RAF machinery behind `useFaceViewpoint` / `useHandViewpoint`.
 * Returns a stable `viewpoint` ref (metres, screen-centre origin) plus status.
 */
export function useVisionViewpoint<L>(
  strategy: VisionStrategy<L>,
  opts: VisionViewpointOptions,
): ViewpointResult {
  const viewpoint = useRef<Viewpoint>({ x: 0, y: 0, z: opts.screen.distanceM })
  const smoother = useRef(new ViewpointSmoother())
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const visualRef = useRef<TrackerVisual>(null)
  const [status, setStatus] = useState<TrackStatus>('idle')
  const [message, setMessage] = useState('')

  // keep the latest config readable from inside the RAF loop
  const cfgRef = useRef(opts)
  cfgRef.current = opts

  // publish the smoothed value every frame
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      viewpoint.current.x = smoother.current.x
      viewpoint.current.y = smoother.current.y
      viewpoint.current.z = smoother.current.z
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!opts.enabled) return
    let landmarker: L | null = null
    let stream: MediaStream | null = null
    let raf = 0
    let cancelled = false

    const video = document.createElement('video')
    video.autoplay = true
    video.playsInline = true
    video.muted = true
    videoRef.current = video

    ;(async () => {
      try {
        setStatus('loading')
        setMessage(strategy.loadingMessage)
        const fileset = await FilesetResolver.forVisionTasks(WASM_CDN)
        landmarker = await strategy.create(fileset)
        if (cancelled) return

        // no width/height constraint: forcing a resize on some USB webcams
        // makes the driver fall back to a raw YUY2 mode that Chrome/Windows
        // decodes incorrectly (shows up as a green/corrupted preview) —
        // landmark detection works on any frame size, so let the camera use
        // whatever native mode it decodes correctly.
        stream = await navigator.mediaDevices.getUserMedia({
          video: opts.deviceId ? { deviceId: { exact: opts.deviceId } } : { facingMode: 'user' },
        })
        if (cancelled) return
        video.srcObject = stream
        await video.play()
        smoother.current.reset()
        setStatus('searching')
        setMessage(strategy.searchingMessage)

        const loop = () => {
          if (cancelled || !landmarker) return
          raf = requestAnimationFrame(loop)
          if (video.readyState < 2) return

          const reading = strategy.read(landmarker, video, performance.now())
          if (!reading) {
            visualRef.current = null
            setStatus('searching')
            return
          }
          visualRef.current = { kind: strategy.visualKind, landmarks: reading.landmarks }

          const { screen, tracking } = cfgRef.current
          // keep the anchor away from the frame edge so the frustum can't blow up
          const px = clamp(reading.px, 0.15, 0.85)
          const py = clamp(reading.py, 0.15, 0.85)
          // webcam is mirrored: invert X so moving right -> view moves right
          const x = (0.5 - px) * screen.widthM * 3.2 * tracking.strengthX
          const y = (0.5 - py) * screen.heightM * 3.2 * tracking.strengthY
          const zRaw = clamp(
            screen.distanceM * (reading.refSpread / Math.max(reading.spread, 1e-4)),
            screen.distanceM * 0.4,
            screen.distanceM * 2.2,
          )
          const z = screen.distanceM + (zRaw - screen.distanceM) * tracking.strengthZ

          smoother.current.push(x, y, z, tracking.smoothing)
          setStatus('tracking')
        }
        loop()
      } catch (err) {
        if (cancelled) return
        const reason = err instanceof Error ? err.message : String(err)
        console.warn('[offaxis] vision tracker unavailable:', err)
        setStatus('error')
        setMessage('웹캠/추적 사용 불가 — ' + reason)
        cfgRef.current.onFallback?.(reason)
      }
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      if (landmarker) strategy.close(landmarker)
      stream?.getTracks().forEach((t) => t.stop())
      videoRef.current = null
      visualRef.current = null
    }
  }, [opts.enabled, opts.deviceId, strategy])

  return { viewpoint, status, message, videoRef, visualRef }
}
