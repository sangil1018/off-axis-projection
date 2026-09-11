import { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { computeOffAxis, makeResult } from './projection'
import type { ScreenConfig, Viewpoint } from './types'

export type OffAxisCameraProps = {
  /** live viewpoint (eye) position in metres, relative to screen centre */
  eye: React.MutableRefObject<Viewpoint>
  /** physical screen the virtual window maps to */
  screen: ScreenConfig
  near?: number
  far?: number
  /** when false the default camera is left untouched (e.g. an editor orbit mode) */
  enabled?: boolean
}

/**
 * Drives R3F's default camera with an asymmetric (off-axis) frustum locked to a
 * virtual "window" the size of the physical screen, centred at the world origin
 * in the XY plane, looking down -Z.
 *
 * Drop it anywhere inside a `<Canvas>`. It owns the camera's projection matrix
 * while `enabled`, so pair it with a plain `<Canvas camera={{ position:[0,0,d] }}>`.
 */
export function OffAxisCamera({
  eye,
  screen,
  near = 0.05,
  far = 100,
  enabled = true,
}: OffAxisCameraProps) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const result = useMemo(makeResult, [])
  const pa = useMemo(() => new THREE.Vector3(), [])
  const pb = useMemo(() => new THREE.Vector3(), [])
  const pc = useMemo(() => new THREE.Vector3(), [])
  const pe = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    if (!enabled) return
    // the virtual window's height stays locked to the calibrated physical
    // screen (that's what fixes the vertical FOV); its width follows
    // whatever aspect the canvas actually renders at instead of the
    // calibrated screenWidthM. If the two disagree — a letterbox aspect
    // mode, or fullscreen filling a differently-shaped monitor — the GPU
    // maps this frustum onto that viewport 1:1, so keeping width tied to
    // screenWidthM would stretch every object non-uniformly to fill it.
    // Widening/narrowing the window instead of warping its contents is
    // also the physically correct behaviour: a wider window shows more of
    // the room at the sides, it doesn't zoom.
    const h = screen.heightM
    const w = h * (size.width / size.height)
    pa.set(-w / 2, -h / 2, 0)
    pb.set(w / 2, -h / 2, 0)
    pc.set(-w / 2, h / 2, 0)
    pe.set(eye.current.x, eye.current.y, Math.max(eye.current.z, 0.05))

    computeOffAxis(pa, pb, pc, pe, near, far, result)

    camera.position.copy(pe)
    camera.quaternion.copy(result.quaternion)
    camera.updateMatrixWorld()
    camera.projectionMatrix.copy(result.projection)
    camera.projectionMatrixInverse.copy(result.projection).invert()
    // priority -1: run before the render (and before any EffectComposer pass)
    // without taking over the render loop
  }, -1)

  return null
}
