import type { StateCreator } from 'zustand'
import type { Settings } from './types'
import type { SceneState } from './sceneStore'

export const DEFAULT_SETTINGS: Settings = {
  resolutionScale: 1,
  aspectMode: '16:9',
  customAspect: 16 / 9,
  screenWidthM: 0.6,
  screenHeightM: 0.34,
  viewerDistanceM: 0.6,
  near: 0.05,
  far: 100,
  headSource: 'face',
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
  editMode: false,
}

export type SettingsSlice = {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}

export const createSettingsSlice: StateCreator<SceneState, [], [], SettingsSlice> = (set) => ({
  settings: DEFAULT_SETTINGS,
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
})
