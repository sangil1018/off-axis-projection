import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

export type RoomGridProps = {
  widthM: number
  heightM: number
  /** how far the room extends behind the window (metres) */
  depthM: number
  /** grid cell size in metres */
  cellM?: number
  color?: string
  opacity?: number
}

type V3 = [number, number, number]

function pushPlaneGrid(
  out: number[],
  origin: V3,
  uDir: V3,
  uLen: number,
  vDir: V3,
  vLen: number,
  cell: number,
) {
  const uN = Math.max(1, Math.round(uLen / cell))
  const vN = Math.max(1, Math.round(vLen / cell))
  const at = (a: V3, s: number, d: V3): V3 => [
    a[0] + d[0] * s,
    a[1] + d[1] * s,
    a[2] + d[2] * s,
  ]
  for (let i = 0; i <= uN; i++) {
    const p = at(origin, (i / uN) * uLen, uDir)
    const q = at(p, vLen, vDir)
    out.push(...p, ...q)
  }
  for (let j = 0; j <= vN; j++) {
    const p = at(origin, (j / vN) * vLen, vDir)
    const q = at(p, uLen, uDir)
    out.push(...p, ...q)
  }
}

/**
 * A translucent grid "room" whose front opening is the virtual window (screen
 * plane at z = 0). Floor / ceiling / side / back faces — no front — so an
 * off-axis camera sees the box perspective shear as the viewpoint moves.
 */
export function RoomGrid({
  widthM,
  heightM,
  depthM,
  cellM = 0.05,
  color = '#ff8a4c',
  opacity = 0.28,
}: RoomGridProps) {
  const geometry = useMemo(() => {
    const w = widthM / 2
    const h = heightM / 2
    const d = depthM
    const X: V3 = [1, 0, 0]
    const Y: V3 = [0, 1, 0]
    const BACK: V3 = [0, 0, -1]
    const pts: number[] = []
    // floor & ceiling
    pushPlaneGrid(pts, [-w, -h, 0], X, widthM, BACK, d, cellM)
    pushPlaneGrid(pts, [-w, h, 0], X, widthM, BACK, d, cellM)
    // left & right walls
    pushPlaneGrid(pts, [-w, -h, 0], Y, heightM, BACK, d, cellM)
    pushPlaneGrid(pts, [w, -h, 0], Y, heightM, BACK, d, cellM)
    // back wall
    pushPlaneGrid(pts, [-w, -h, -d], X, widthM, Y, heightM, cellM)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [widthM, heightM, depthM, cellM])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <lineSegments geometry={geometry} frustumCulled={false} renderOrder={-1}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  )
}
