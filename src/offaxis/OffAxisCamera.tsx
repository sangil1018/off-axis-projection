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
  const result = useMemo(makeResult, [])
  const pa = useMemo(() => new THREE.Vector3(), [])
  const pb = useMemo(() => new THREE.Vector3(), [])
  const pc = useMemo(() => new THREE.Vector3(), [])
  const pe = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    if (!enabled) return
    const w = screen.widthM
    const h = screen.heightM
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
  }, 1)

  return null
}
