import { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { computeOffAxis, makeResult } from './offAxisProjection'
import { useHead } from './HeadContext'
import { useScene } from '../store/sceneStore'

/**
 * Drives the default camera with an asymmetric (off-axis) frustum locked to a
 * virtual "window" the size of the physical screen, centred at the world origin
 * in the XY plane. Disabled while in edit mode (OrbitControls takes over).
 */
export function OffAxisCamera() {
  const camera = useThree((s) => s.camera)
  const head = useHead()
  const result = useMemo(makeResult, [])
  const pa = useMemo(() => new THREE.Vector3(), [])
  const pb = useMemo(() => new THREE.Vector3(), [])
  const pc = useMemo(() => new THREE.Vector3(), [])
  const pe = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const s = useScene.getState().settings
    if (s.editMode) return

    const w = s.screenWidthM
    const h = s.screenHeightM
    pa.set(-w / 2, -h / 2, 0)
    pb.set(w / 2, -h / 2, 0)
    pc.set(-w / 2, h / 2, 0)
    pe.set(head.current.x, head.current.y, Math.max(head.current.z, 0.05))

    computeOffAxis(pa, pb, pc, pe, s.near, s.far, result)

    camera.position.copy(pe)
    camera.quaternion.copy(result.quaternion)
    camera.updateMatrixWorld()
    camera.projectionMatrix.copy(result.projection)
    camera.projectionMatrixInverse.copy(result.projection).invert()
  }, 1)

  return null
}
