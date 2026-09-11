import { Line } from '@react-three/drei'

export type WindowFrameProps = {
  widthM: number
  heightM: number
  color?: string
  lineWidth?: number
}

/**
 * The virtual "window" outline sitting in the screen plane (z = 0). Purely
 * visual — a reference showing where the physical screen edge is.
 */
export function WindowFrame({
  widthM,
  heightM,
  color = '#38bdf8',
  lineWidth = 1.5,
}: WindowFrameProps) {
  const w = widthM / 2
  const h = heightM / 2
  const pts: [number, number, number][] = [
    [-w, -h, 0],
    [w, -h, 0],
    [w, h, 0],
    [-w, h, 0],
    [-w, -h, 0],
  ]
  return <Line points={pts} color={color} lineWidth={lineWidth} />
}
