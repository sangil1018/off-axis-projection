import type { StateCreator } from 'zustand'
import type { Settings } from './types'
import type { SceneState } from './sceneStore'

/** Vertical FOV (degrees) that frames a screen of this height at this eye
 * distance — the value the physical off-axis frustum works out to for a
 * centred eye, used as the Edit-mode orbit camera's starting point so
 * switching Preview↔Edit doesn't jump-zoom. */
export function deriveFovDeg(screenHeightM: number, viewerDistanceM: number): number {
  return (2 * Math.atan(screenHeightM / 2 / Math.max(viewerDistanceM, 0.01)) * 180) / Math.PI
}

const DEFAULT_SCREEN_HEIGHT_M = 0.34
const DEFAULT_VIEWER_DISTANCE_M = 0.6

export const DEFAULT_SETTINGS: Settings = {
  resolutionScale: 1,
  aspectMode: '16:9',
  customAspect: 16 / 9,
  screenWidthM: 0.6,
  screenHeightM: DEFAULT_SCREEN_HEIGHT_M,
  viewerDistanceM: DEFAULT_VIEWER_DISTANCE_M,
  fovDeg: deriveFovDeg(DEFAULT_SCREEN_HEIGHT_M, DEFAULT_VIEWER_DISTANCE_M),
  near: 0.05,
  far: 100,
  headSource: 'face',
  cameraDeviceId: null,
  strengthX: 1,
  strengthY: 1,
  strengthZ: 1,
  smoothing: 0.35,
  showFrame: true,
  showGrid: true,
  showRoomGrid: import.meta.env.DEV,
  roomDepthM: 1.2,
  micEnabled: false,
  micThreshold: 0.12,
  micGain: 1,
  background: '#0d1017',
  environment: true,
  exposure: 1,
  shadows: true,
  // editor build opens ready to arrange the scene; a production viewer forces
  // this off regardless (see EDITOR_ENABLED / editModeActive)
  editMode: import.meta.env.DEV,
}

export type SettingsSlice = {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}

export const createSettingsSlice: StateCreator<SceneState, [], [], SettingsSlice> = (set) => ({
  settings: DEFAULT_SETTINGS,
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
})
