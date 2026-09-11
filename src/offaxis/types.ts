/** Public types for the reusable off-axis projection module. */

export type Vec3 = [number, number, number]

/** Viewpoint (eye) position in metres, relative to the screen centre. */
export type Viewpoint = { x: number; y: number; z: number }

export type ViewpointSource = 'face' | 'hand' | 'mouse'

export type TrackStatus =
  | 'idle'
  | 'loading'
  | 'tracking'
  | 'searching'
  | 'mouse'
  | 'error'

/** Physical screen the virtual window maps to. */
export type ScreenConfig = {
  /** screen width in metres */
  widthM: number
  /** screen height in metres */
  heightM: number
  /** nominal viewer distance in metres (baseline for depth tracking) */
  distanceM: number
}

/** How raw tracker motion is translated into viewpoint motion. */
export type TrackingConfig = {
  strengthX: number
  strengthY: number
  strengthZ: number
  /** EMA factor, 0 = frozen … 1 = no smoothing */
  smoothing: number
}

export const DEFAULT_TRACKING: TrackingConfig = {
  strengthX: 1,
  strengthY: 1,
  strengthZ: 1,
  smoothing: 0.35,
}

/** One normalized landmark point (0..1 image space). */
export type LandmarkPoint = { x: number; y: number; z?: number }

/** What the webcam trackers expose for optional visualisation. */
export type TrackerVisual = {
  kind: 'face' | 'hand'
  landmarks: LandmarkPoint[]
} | null
