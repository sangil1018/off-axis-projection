import { useEffect, useRef, useState } from 'react'
import {
  FaceLandmarker,
  HandLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision'
import { HeadSmoother } from '../three/headPose'
import { useScene } from '../store/sceneStore'

export type TrackStatus =
  | 'idle'
  | 'loading'
  | 'tracking'
  | 'searching'
  | 'mouse'
  | 'error'

export type HeadRef = { x: number; y: number; z: number }
export type HeadSource = 'face' | 'hand' | 'mouse'

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm'
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

/**
 * Shared viewpoint position (meters, relative to screen centre) updated every
 * frame. `head` is a stable ref you can read inside useFrame. The source can be
 * the webcam face, the webcam hand, or the mouse.
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

  // ---- webcam face / hand tracking (MediaPipe Tasks Vision) ----
  useEffect(() => {
    if (headSource !== 'face' && headSource !== 'hand') return
    const isHand = headSource === 'hand'
    let landmarker: FaceLandmarker | HandLandmarker | null = null
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
        setMessage(isHand ? '손 추적 모델 로딩 중…' : '얼굴 추적 모델 로딩 중…')
        const fileset = await FilesetResolver.forVisionTasks(WASM_CDN)
        landmarker = isHand
          ? await HandLandmarker.createFromOptions(fileset, {
              baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
              runningMode: 'VIDEO',
              numHands: 1,
            })
          : await FaceLandmarker.createFromOptions(fileset, {
              baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'GPU' },
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
        setMessage(isHand ? '손을 찾는 중…' : '얼굴을 찾는 중…')

        const loop = () => {
          if (cancelled || !landmarker) return
          raf = requestAnimationFrame(loop)
          if (video.readyState < 2) return
          const s = settingsRef.current
          const now = performance.now()

          let px: number, py: number, spread: number, refSpread: number

          if (isHand) {
            const res = (landmarker as HandLandmarker).detectForVideo(video, now)
            const lm = res.landmarks?.[0]
            if (!lm) {
              setStatus('searching')
              return
            }
            // palm centre = wrist + index-MCP + pinky-MCP
            px = (lm[0].x + lm[5].x + lm[17].x) / 3
            py = (lm[0].y + lm[5].y + lm[17].y) / 3
            // knuckle span as depth proxy
            spread = Math.hypot(lm[5].x - lm[17].x, lm[5].y - lm[17].y) || 0.1
            refSpread = 0.1
          } else {
            const res = (landmarker as FaceLandmarker).detectForVideo(video, now)
            const lm = res.faceLandmarks?.[0]
            if (!lm) {
              setStatus('searching')
              return
            }
            const rEye = lm[33]
            const lEye = lm[263]
            px = (rEye.x + lEye.x) / 2
            py = (rEye.y + lEye.y) / 2
            // inter-ocular distance as depth proxy
            spread = Math.hypot(lEye.x - rEye.x, lEye.y - rEye.y) || 0.12
            refSpread = 0.12
          }

          // webcam is mirrored: invert X so moving right -> view moves right
          const x = (0.5 - px) * s.screenWidthM * 3.2 * s.strengthX
          const y = (0.5 - py) * s.screenHeightM * 3.2 * s.strengthY
          const z = clamp(
            s.viewerDistanceM * (refSpread / spread),
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
          '웹캠/추적 사용 불가 — 마우스 모드로 자동 전환 (' +
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
