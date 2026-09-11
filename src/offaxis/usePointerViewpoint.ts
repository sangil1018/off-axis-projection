import { useEffect, useRef, useState } from 'react'
import { ViewpointSmoother } from './Smoother'
import type {
  ScreenConfig,
  TrackerVisual,
  TrackingConfig,
  TrackStatus,
  Viewpoint,
} from './types'
import type { ViewpointResult } from './_useVisionViewpoint'

export type PointerViewpointOptions = {
  enabled: boolean
  screen: ScreenConfig
  tracking: TrackingConfig
  /** DOM element to read pointer coords from; defaults to window */
  target?: React.RefObject<HTMLElement> | null
}

/**
 * Off-axis viewpoint driven by the mouse / pointer — the no-webcam fallback.
 * Same return shape as the webcam hooks (videoRef / visualRef stay null).
 */
export function usePointerViewpoint(opts: PointerViewpointOptions): ViewpointResult {
  const viewpoint = useRef<Viewpoint>({ x: 0, y: 0, z: opts.screen.distanceM })
  const smoother = useRef(new ViewpointSmoother())
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const visualRef = useRef<TrackerVisual>(null)
  const [status, setStatus] = useState<TrackStatus>('idle')

  const cfgRef = useRef(opts)
  cfgRef.current = opts

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
    setStatus('mouse')
    smoother.current.reset()

    const onMove = (e: PointerEvent) => {
      const { screen, tracking, target } = cfgRef.current
      const el = target?.current
      let nx: number
      let ny: number
      if (el) {
        const r = el.getBoundingClientRect()
        nx = (e.clientX - r.left) / r.width - 0.5
        ny = (e.clientY - r.top) / r.height - 0.5
      } else {
        nx = e.clientX / window.innerWidth - 0.5
        ny = e.clientY / window.innerHeight - 0.5
      }
      smoother.current.push(
        nx * screen.widthM * 1.6 * tracking.strengthX,
        -ny * screen.heightM * 1.6 * tracking.strengthY,
        screen.distanceM,
        1,
      )
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [opts.enabled])

  return { viewpoint, status, message: '마우스로 시점 제어 중', videoRef, visualRef }
}
