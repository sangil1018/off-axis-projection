import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useGLTF } from '@react-three/drei'

export type Vec3 = [number, number, number]

/** Release a dropped-file object URL and drop it from the GLTF cache. */
function releaseUrl(url: string | undefined) {
  if (!url || !url.startsWith('blob:')) return
  try {
    URL.revokeObjectURL(url)
    useGLTF.clear(url)
  } catch {
    /* noop */
  }
}

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

type SceneState = {
  objects: SceneObject[]
  lights: SceneLight[]
  settings: Settings
  selectedId: string | null
  hoveredId: string | null
  gizmoMode: GizmoMode
  calibrating: boolean
  inspectorOpen: boolean
  inspectorOpacity: number
  /** transient: ids of objects whose model failed to load (not persisted) */
  objectErrors: Record<string, true>

  setCalibrating: (v: boolean) => void
  setInspectorOpen: (v: boolean) => void
  setInspectorOpacity: (v: number) => void
  select: (id: string | null) => void
  setHovered: (id: string | null) => void
  setGizmoMode: (m: GizmoMode) => void
  setObjectError: (id: string, failed: boolean) => void

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
    shake: o.shake ?? false,
    shakeIntensity: o.shakeIntensity ?? 1,
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
      hoveredId: null,
      gizmoMode: 'translate',
      calibrating: false,
      inspectorOpen: false,
      inspectorOpacity: 0.9,
      objectErrors: {},

      setCalibrating: (calibrating) => set({ calibrating }),
      setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
      setInspectorOpacity: (inspectorOpacity) => set({ inspectorOpacity }),
      select: (id) => set({ selectedId: id }),
      setHovered: (hoveredId) => set({ hoveredId }),
      setGizmoMode: (gizmoMode) => set({ gizmoMode }),
      setObjectError: (id, failed) =>
        set((s) => {
          const next = { ...s.objectErrors }
          if (failed) next[id] = true
          else delete next[id]
          return { objectErrors: next }
        }),

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
        set((s) => {
          const gone = s.objects.find((o) => o.id === id)
          releaseUrl(gone?.url)
          const objectErrors = { ...s.objectErrors }
          delete objectErrors[id]
          return {
            objects: s.objects.filter((o) => o.id !== id),
            selectedId: s.selectedId === id ? null : s.selectedId,
            objectErrors,
          }
        }),

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
        const d = data as Partial<SceneState> & { objects?: SceneObject[] }
        if (!d || typeof d !== 'object') return
        get().objects.forEach((o) => releaseUrl(o.url))
        set({
          objects: (d.objects ?? []).map((o) => ({
            ...o,
            id: uid(),
            isBlob: !o.url || o.url.startsWith('blob:'),
            fitted: o.fitted ?? true,
            shake: o.shake ?? false,
            shakeIntensity: o.shakeIntensity ?? 1,
          })),
          lights: (d.lights ?? DEFAULT_LIGHTS).map((l) => ({ ...l, id: uid() })),
          settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
          selectedId: null,
          objectErrors: {},
        })
      },

      attachFile: (fileName, url) =>
        set((s) => ({
          objects: s.objects.map((o) => {
            if (o.fileName !== fileName || (o.url && !o.isBlob)) return o
            releaseUrl(o.url) // drop the previous blob before re-attaching
            return { ...o, url, isBlob: true }
          }),
          objectErrors: (() => {
            const next = { ...s.objectErrors }
            const hit = s.objects.find(
              (o) => o.fileName === fileName && (!o.url || o.isBlob),
            )
            if (hit) delete next[hit.id]
            return next
          })(),
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
        inspectorOpen: s.inspectorOpen,
        inspectorOpacity: s.inspectorOpacity,
      }),
    },
  ),
)

if (import.meta.env.DEV) {
  ;(window as unknown as { __store?: unknown }).__store = useScene
}
