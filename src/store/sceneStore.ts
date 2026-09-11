import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sanitizeScene } from './importValidation'
import { releaseUrl, uid } from './utils'
import {
  createObjectsSlice,
  DEFAULT_OBJECTS,
  type ObjectsSlice,
} from './objectsSlice'
import { createLightsSlice, DEFAULT_LIGHTS, type LightsSlice } from './lightsSlice'
import { createSettingsSlice, DEFAULT_SETTINGS, type SettingsSlice } from './settingsSlice'
import { createUiSlice, type UiSlice } from './uiSlice'

// re-exported so existing `from '../store/sceneStore'` imports keep working —
// the domain types and constants actually live in ./types and the slice files
export type {
  AspectMode,
  GizmoMode,
  LibraryModel,
  LightType,
  SceneLight,
  SceneObject,
  Settings,
  Vec3,
} from './types'
export { MODEL_LIBRARY } from './types'
export { DEFAULT_SETTINGS } from './settingsSlice'

/**
 * The store is composed of independent slices (objects / lights / settings /
 * ui) combined here, plus a few actions that legitimately span more than one
 * slice (reset, export/import). Each slice's own file owns its shape and
 * defaults — this file only wires them together.
 */
export type SceneState = ObjectsSlice &
  LightsSlice &
  SettingsSlice &
  UiSlice & {
    reset: () => void
    exportScene: () => void
    importScene: (data: unknown) => void
  }

export const useScene = create<SceneState>()(
  persist(
    (set, get, api) => ({
      ...createObjectsSlice(set, get, api),
      ...createLightsSlice(set, get, api),
      ...createSettingsSlice(set, get, api),
      ...createUiSlice(set, get, api),

      reset: () => {
        get().objects.forEach((o) => releaseUrl(o.url))
        set({
          objects: DEFAULT_OBJECTS,
          lights: DEFAULT_LIGHTS,
          settings: DEFAULT_SETTINGS,
          selectedId: null,
          objectErrors: {},
        })
      },

      exportScene: () => {
        const { objects, lights, settings } = get()
        const payload = {
          version: 1,
          objects: objects.map((o) => ({
            ...o,
            // never persist a dead blob URL
            url: o.isBlob ? '' : o.url,
          })),
          lights,
          settings,
        }
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: 'application/json',
        })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `off-axis-scene-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(a.href)
      },

      importScene: (data) => {
        const result = sanitizeScene(data, DEFAULT_SETTINGS)
        if (!result.ok) {
          throw new Error(result.reason)
        }
        const { scene } = result
        get().objects.forEach((o) => releaseUrl(o.url))
        set({
          objects: scene.objects.map((o) => ({ ...o, id: uid() })),
          lights: scene.lights.length
            ? scene.lights.map((l) => ({ ...l, id: uid() }))
            : DEFAULT_LIGHTS.map((l) => ({ ...l, id: uid() })),
          settings: scene.settings,
          selectedId: null,
          objectErrors: {},
        })
      },
    }),
    {
      name: 'off-axis-projection-studio',
      // zustand's default merge is a shallow `{...current, ...persisted}` —
      // that would let an older saved `settings` blob (missing a newer field
      // such as fovDeg) wholesale replace DEFAULT_SETTINGS and silently drop
      // it. Merge `settings` one level deeper so new fields keep their
      // default until the user actually changes them.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SceneState>
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...p.settings },
        }
      },
      partialize: (s) => ({
        // don't persist blob URLs (they die on reload); keep the metadata
        objects: s.objects.map((o) => (o.isBlob ? { ...o, url: '' } : o)),
        lights: s.lights,
        settings: s.settings,
        gizmoMode: s.gizmoMode,
        inspectorOpen: s.inspectorOpen,
        inspectorOpacity: s.inspectorOpacity,
      }),
    },
  ),
)

if (import.meta.env.DEV) {
  ;(window as unknown as { __store?: unknown }).__store = useScene
}
