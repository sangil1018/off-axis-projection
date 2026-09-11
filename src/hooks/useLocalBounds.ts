import { useEffect, useState } from 'react'
import * as THREE from 'three'

export type Bounds = { size: [number, number, number]; center: [number, number, number] }

/**
 * The local (pre-transform) axis-aligned bounding box of an Object3D —
 * recomputed whenever the object identity changes.
 *
 * Measured on a throwaway, unattached clone rather than `object` itself:
 * once an object is inserted into a live scene, `Box3.setFromObject` reads
 * its *current* parent-chain matrixWorld, which can still reflect a stale
 * (pre-fit or pre-render) ancestor transform the moment this effect fires —
 * silently shrinking or offsetting the box relative to what's actually
 * drawn. A parent-less clone has no ancestor to contaminate it, so the box
 * is always measured purely from the object's own authored local
 * transforms, however it's later scaled/positioned by its container.
 */
export function useLocalBounds(object: THREE.Object3D | null): Bounds | null {
  const [bounds, setBounds] = useState<Bounds | null>(null)

  useEffect(() => {
    if (!object) {
      setBounds(null)
      return
    }
    const box = new THREE.Box3().setFromObject(object.clone(true))
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    setBounds({ size: size.toArray() as Bounds['size'], center: center.toArray() as Bounds['center'] })
  }, [object])

  return bounds
}
