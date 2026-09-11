import { useThree } from '@react-three/fiber'

/**
 * Widens/narrows the virtual window to match the canvas's actual render
 * aspect ratio, keeping its calibrated height fixed. Used everywhere the
 * window's on-screen extent has to agree with the real viewport shape
 * (the off-axis frustum itself, the window frame outline, the room grid) —
 * if any of them used the calibrated screenWidthM instead, they'd disagree
 * with what the GPU actually draws whenever the canvas aspect doesn't match
 * calibration (a non-default aspect mode, or fullscreen on a differently
 * shaped monitor), which either stretches objects or misaligns the frame
 * against the true edge of view.
 */
export function fitScreenWidthM(heightM: number, canvasWidthPx: number, canvasHeightPx: number): number {
  if (canvasHeightPx <= 0) return heightM
  return heightM * (canvasWidthPx / canvasHeightPx)
}

/** Reactive version of {@link fitScreenWidthM} for use inside a `<Canvas>`. */
export function useFittedScreenWidthM(heightM: number): number {
  const size = useThree((s) => s.size)
  return fitScreenWidthM(heightM, size.width, size.height)
}
