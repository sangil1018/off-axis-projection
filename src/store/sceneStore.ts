import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
}

export type LibraryModel = { name: string; url: string }

export const MODEL_LIBRARY: LibraryModel[] = [
  { name: 'Duck', url: 'models/Duck.glb' },
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
  // head tracking
  headSource: 'face' | 'mouse'
  strengthX: number
  strengthY: number
  strengthZ: number
  smoothing: number
  // scene look
  showFrame: boolean
  showGrid: boolean
  background: string
  environment: boolean
  exposure: number
  shadows: boolean
  editMode: boolean
}

export type GizmoMode = 'translate' | 'rotate' | 'scale'

type SceneState = {
  objects: SceneObject[]
  lights: SceneLight[]
  settings: Settings
  selectedId: string | null
  gizmoMode: GizmoMode
  calibrating: boolean

  setCalibrating: (v: boolean) => void
  select: (id: string | null) => void
  setGizmoMode: (m: GizmoMode) => void

  addObject: (o: Partial<SceneObject> & { url: string; fileName: string; isBlob: boolean }) => string
  addLibraryModel: (m: LibraryModel) => string
  addFromUrl: (url: string) => string
  updateObject: (id: string, patch: Partial<SceneObject>) => void
  removeObject: (id: string) => void

  addLight: (type: LightType) => string
  updateLight: (id: string, patch: Partial<SceneLight>) => void
  removeLight: (id: string) => void

  updateSettings: (patch: Partial<Settings>) => void

  reset: () => void
  exportScene: () => void
  importScene: (data: unknown) => void
  /** re-attach a dropped file to blob objects whose fileName matches */
  attachFile: (fileName: string, url: string) => void
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const DEFAULT_SETTINGS: Settings = {
  resolutionScale: 1,
  aspectMode: 'fill',
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
  background: '#0d1017',
  environment: true,
  exposure: 1,
  shadows: true,
  editMode: false,
}

function defaultLight(type: LightType): SceneLight {
  const base = {
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
  return base
}

function makeObject(
  o: Partial<SceneObject> & { url: string; fileName: string; isBlob: boolean },
): SceneObject {
  return {
    id: uid(),
    name: o.name ?? o.fileName.replace(/\.(glb|gltf)$/i, ''),
    url: o.url,
    fileName: o.fileName,
    isBlob: o.isBlob,
    position: o.position ?? [0, 0, -0.3],
    rotation: o.rotation ?? [0, 0, 0],
    scale: o.scale ?? [1, 1, 1],
    visible: o.visible ?? true,
    castShadow: o.castShadow ?? true,
    receiveShadow: o.receiveShadow ?? true,
    fitted: o.fitted ?? false,
  }
}

const DEFAULT_OBJECTS: SceneObject[] = [
  makeObject({ url: 'models/Duck.glb', fileName: 'Duck.glb', isBlob: false }),
]

const DEFAULT_LIGHTS: SceneLight[] = [
  { ...defaultLight('ambient'), name: 'Ambient', position: [0, 0, 0] },
  {
    ...defaultLight('directional'),
    name: 'Key Light',
    position: [3, 5, 4],
    intensity: 1.4,
  },
]

export const useScene = create<SceneState>()(
  persist(
    (set, get) => ({
      objects: DEFAULT_OBJECTS,
      lights: DEFAULT_LIGHTS,
      settings: DEFAULT_SETTINGS,
      selectedId: null,
      gizmoMode: 'translate',
      calibrating: false,

      setCalibrating: (calibrating) => set({ calibrating }),
      select: (id) => set({ selectedId: id }),
      setGizmoMode: (gizmoMode) => set({ gizmoMode }),

      addObject: (o) => {
        const obj = makeObject(o)
        set((s) => ({ objects: [...s.objects, obj], selectedId: obj.id }))
        return obj.id
      },
      addLibraryModel: (m) => {
        const obj = makeObject({ url: m.url, fileName: m.name + '.glb', isBlob: false, name: m.name })
        set((s) => ({ objects: [...s.objects, obj], selectedId: obj.id }))
        return obj.id
      },
      addFromUrl: (url) => {
        const fileName = url.split('/').pop()?.split('?')[0] || 'model.glb'
        const obj = makeObject({ url, fileName, isBlob: false })
        set((s) => ({ objects: [...s.objects, obj], selectedId: obj.id }))
        return obj.id
      },
      updateObject: (id, patch) =>
        set((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),
      removeObject: (id) =>
        set((s) => ({
          objects: s.objects.filter((o) => o.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

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

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      reset: () =>
        set({
          objects: DEFAULT_OBJECTS,
          lights: DEFAULT_LIGHTS,
          settings: DEFAULT_SETTINGS,
          selectedId: null,
        }),

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
        const d = data as Partial<SceneState> & { objects?: SceneObject[] }
        if (!d || typeof d !== 'object') return
        set({
          objects: (d.objects ?? []).map((o) => ({
            ...o,
            id: uid(),
            isBlob: !o.url || o.url.startsWith('blob:'),
            fitted: o.fitted ?? true,
          })),
          lights: (d.lights ?? DEFAULT_LIGHTS).map((l) => ({ ...l, id: uid() })),
          settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
          selectedId: null,
        })
      },

      attachFile: (fileName, url) =>
        set((s) => ({
          objects: s.objects.map((o) =>
            o.fileName === fileName && (!o.url || o.isBlob)
              ? { ...o, url, isBlob: true }
              : o,
          ),
        })),
    }),
    {
      name: 'off-axis-projection-studio',
      partialize: (s) => ({
        // don't persist blob URLs (they die on reload); keep the metadata
        objects: s.objects.map((o) => (o.isBlob ? { ...o, url: '' } : o)),
        lights: s.lights,
        settings: s.settings,
        gizmoMode: s.gizmoMode,
      }),
    },
  ),
)
