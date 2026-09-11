import type { StateCreator } from 'zustand'
import type { LightType, SceneLight, Vec3 } from './types'
import { uid } from './utils'
import type { SceneState } from './sceneStore'

export function defaultLight(type: LightType): SceneLight {
  return {
    id: uid(),
    name: type[0].toUpperCase() + type.slice(1) + ' Light',
    type,
    color: '#ffffff',
    intensity: type === 'ambient' ? 0.4 : type === 'directional' ? 1.2 : 8,
    position: [2, 3, 2] as Vec3,
    target: [0, 0, 0] as Vec3,
    distance: 0,
    decay: 2,
    angle: Math.PI / 6,
    penumbra: 0.3,
    castShadow: type === 'directional' || type === 'spot',
    visible: true,
  }
}

export const DEFAULT_LIGHTS: SceneLight[] = [
  { ...defaultLight('ambient'), name: 'Ambient', position: [0, 0, 0] },
  { ...defaultLight('directional'), name: 'Key Light', position: [3, 5, 4], intensity: 1.4 },
]

export type LightsSlice = {
  lights: SceneLight[]
  addLight: (type: LightType) => string
  updateLight: (id: string, patch: Partial<SceneLight>) => void
  removeLight: (id: string) => void
}

export const createLightsSlice: StateCreator<SceneState, [], [], LightsSlice> = (set) => ({
  lights: DEFAULT_LIGHTS,

  addLight: (type) => {
    const l = defaultLight(type)
    set((s) => ({ lights: [...s.lights, l], selectedId: l.id }))
    return l.id
  },
  updateLight: (id, patch) =>
    set((s) => ({
      lights: s.lights.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),
  removeLight: (id) =>
    set((s) => ({
      lights: s.lights.filter((l) => l.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
})
