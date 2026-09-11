/** Domain types shared by every store slice. No slice-specific logic here. */

export type Vec3 = [number, number, number]

export type SceneObject = {
  id: string
  name: string
  /** remote path (persisted & restorable) or blob: URL (session only) */
  url: string
  /** original file name, used to re-match a dropped GLB after import */
  fileName: string
  isBlob: boolean
  position: Vec3
  rotation: Vec3
  scale: Vec3
  visible: boolean
  castShadow: boolean
  receiveShadow: boolean
  /** false until auto-fit (scale/recenter to a sane size) has run once */
  fitted: boolean
  /** vibrate this model with the mic loudness (above the threshold) */
  shake: boolean
  /** per-model multiplier on the shake magnitude */
  shakeIntensity: number
}

export type LibraryModel = { name: string; url: string; rotation?: Vec3 }

export const MODEL_LIBRARY: LibraryModel[] = [
  // Duck.glb's own forward axis faces +X (screen-right) at rotation 0, which
  // reads as a flat side profile — turn it to a mostly-frontal 3/4 view
  { name: 'Duck', url: 'models/Duck.glb', rotation: [0, -1.1, 0] },
  { name: 'Box', url: 'models/Box.glb' },
]

export type LightType = 'ambient' | 'directional' | 'point' | 'spot'

export type SceneLight = {
  id: string
  name: string
  type: LightType
  color: string
  intensity: number
  position: Vec3
  target: Vec3
  distance: number
  decay: number
  angle: number
  penumbra: number
  castShadow: boolean
  visible: boolean
}

export type AspectMode = 'fill' | '16:9' | '4:3' | '1:1' | 'custom'

export type Settings = {
  // resolution / ratio
  resolutionScale: number
  aspectMode: AspectMode
  customAspect: number
  // physical screen (meters) for the off-axis frustum
  screenWidthM: number
  screenHeightM: number
  viewerDistanceM: number
  // camera
  near: number
  far: number
  // viewpoint tracking
  headSource: 'face' | 'hand' | 'mouse'
  strengthX: number
  strengthY: number
  strengthZ: number
  smoothing: number
  // scene look
  showFrame: boolean
  showGrid: boolean
  /** translucent deforming "room" grid — dev aid by default */
  showRoomGrid: boolean
  roomDepthM: number
  // microphone-driven shake
  micEnabled: boolean
  /** loudness (0..1) the shake starts at */
  micThreshold: number
  /** global multiplier from (loudness - threshold) to shake magnitude */
  micGain: number
  background: string
  environment: boolean
  exposure: number
  shadows: boolean
  editMode: boolean
}

export type GizmoMode = 'translate' | 'rotate' | 'scale'
