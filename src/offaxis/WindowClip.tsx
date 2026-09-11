import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { fitScreenWidthM } from './screenFit'

export type WindowClipProps = {
  /** calibrated physical screen height (metres) — width is derived to match
   * the canvas's actual aspect, same as the off-axis frustum itself */
  heightM: number
  /** off while an editor orbit camera owns the view — clipping the scene to
   * the window would just hide what you're trying to arrange */
  enabled?: boolean
}

/**
 * A real window is a hole cut into an opaque wall: whatever room you see
 * through it, you never see past its rectangular edge, no matter how far you
 * lean to the side. Nothing enforced that here — an object (or an extreme
 * tracked eye position) could render anywhere on screen, spilling past where
 * the window frame is drawn. This clips the whole scene to the window's
 * world-space rectangle (extruded through Z, both directions), so content
 * can never appear beyond its left/right/top/bottom edge.
 */
export function WindowClip({ heightM, enabled = true }: WindowClipProps) {
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const widthM = fitScreenWidthM(heightM, size.width, size.height)

  const planes = useMemo(
    () => [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), // keeps x >= -w/2
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), // keeps x <= w/2
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), // keeps y >= -h/2
      new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), // keeps y <= h/2
    ],
    [],
  )

  useEffect(() => {
    const [left, right, bottom, top] = planes
    left.constant = widthM / 2
    right.constant = widthM / 2
    bottom.constant = heightM / 2
    top.constant = heightM / 2
  }, [planes, widthM, heightM])

  useEffect(() => {
    gl.localClippingEnabled = true
    gl.clippingPlanes = enabled ? planes : []
    return () => {
      gl.clippingPlanes = []
    }
  }, [gl, enabled, planes])

  return null
}
