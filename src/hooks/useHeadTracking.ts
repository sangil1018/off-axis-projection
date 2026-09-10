import { useEffect, useRef, useState } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { HeadSmoother } from '../three/headPose'
import { useScene } from '../store/sceneStore'

export type TrackStatus = 'idle' | 'loading' | 'tracking' | 'searching' | 'mouse' | 'error'

export type HeadRef = { x: number; y: number; z: number }

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

/**
 * Shared head position (meters, relative to screen centre) updated every frame.
 * `head` is a stable ref you can read inside useFrame.
 */
export function useHeadTracking() {
  const head = useRef<HeadRef>({ x: 0, y: 0, z: 0.6 })
  const smoother = useRef(new HeadSmoother())
  const [status, setStatus] = useState<TrackStatus>('idle')
  const [message, setMessage] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const headSource = useScene((s) => s.settings.headSource)
  const settingsRef = useRef(useScene.getState().settings)
  useEffect(
    () => useScene.subscribe((s) => (settingsRef.current = s.settings)),
    [],
  )

  // ---- mouse / pointer fallback ----
  useEffect(() => {
    if (headSource !== 'mouse') return
    setStatus('mouse')
    setMessage('마우스로 시점 제어 중')
    smoother.current.reset()
    const onMove = (e: PointerEvent) => {
      const s = settingsRef.current
      const nx = e.clientX / window.innerWidth - 0.5
      const ny = e.clientY / window.innerHeight - 0.5
      smoother.current.push(
        nx * s.screenWidthM * 1.6 * s.strengthX,
        -ny * s.screenHeightM * 1.6 * s.strengthY,
        s.viewerDistanceM,
        1,
      )
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [headSource])

  // ---- face tracking ----
  useEffect(() => {
    if (headSource !== 'face') return
    let landmarker: FaceLandmarker | null = null
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
        setMessage('얼굴 추적 모델 로딩 중…')
        const fileset = await FilesetResolver.forVisionTasks(WASM_CDN)
        landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
        })
        if (cancelled) return

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        })
        if (cancelled) return
        video.srcObject = stream
        await video.play()
        smoother.current.reset()
        setStatus('searching')
        setMessage('얼굴을 찾는 중…')

        const loop = () => {
          if (cancelled || !landmarker) return
          raf = requestAnimationFrame(loop)
          if (video.readyState < 2) return
          const res = landmarker.detectForVideo(video, performance.now())
          const lm = res.faceLandmarks?.[0]
          if (!lm) {
            if (status !== 'searching') setStatus('searching')
            return
          }
          const s = settingsRef.current
          const rEye = lm[33]
          const lEye = lm[263]
          const midX = (rEye.x + lEye.x) / 2
          const midY = (rEye.y + lEye.y) / 2
          const ipd = Math.hypot(lEye.x - rEye.x, lEye.y - rEye.y) || 0.12

          // webcam is mirrored: invert X so leaning right -> view moves right
          const x = (0.5 - midX) * s.screenWidthM * 3.2 * s.strengthX
          const y = (0.5 - midY) * s.screenHeightM * 3.2 * s.strengthY
          const z = clamp(
            s.viewerDistanceM * (0.12 / ipd),
            s.viewerDistanceM * 0.4,
            s.viewerDistanceM * 2.2,
          )
          const zBlended =
            s.viewerDistanceM + (z - s.viewerDistanceM) * s.strengthZ

          smoother.current.push(x, y, zBlended, s.smoothing)
          setStatus('tracking')
        }
        loop()
      } catch (err) {
        if (cancelled) return
        console.warn('[head-tracking] falling back to mouse:', err)
        setStatus('error')
        setMessage(
          '웹캠/얼굴추적 사용 불가 — 마우스 모드로 자동 전환 (' +
            (err instanceof Error ? err.message : String(err)) +
            ')',
        )
        useScene.getState().updateSettings({ headSource: 'mouse' })
      }
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      landmarker?.close()
      stream?.getTracks().forEach((t) => t.stop())
      videoRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headSource])

  // publish smoothed value every frame regardless of source
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      head.current.x = smoother.current.x
      head.current.y = smoother.current.y
      head.current.z = smoother.current.z
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  return { head, status, message, videoRef }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi)
}
