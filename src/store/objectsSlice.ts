import type { StateCreator } from 'zustand'
import type { LibraryModel, SceneObject } from './types'
import { MODEL_LIBRARY } from './types'
import { uid, releaseUrl } from './utils'
import type { SceneState } from './sceneStore'

export function makeObject(
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

const DUCK = MODEL_LIBRARY.find((m) => m.name === 'Duck')!

export const DEFAULT_OBJECTS: SceneObject[] = [
  makeObject({
    url: DUCK.url,
    fileName: 'Duck.glb',
    isBlob: false,
    rotation: DUCK.rotation,
  }),
]

export type ObjectsSlice = {
  objects: SceneObject[]
  /** transient: ids of objects whose model failed to load (not persisted) */
  objectErrors: Record<string, true>

  addObject: (o: Partial<SceneObject> & { url: string; fileName: string; isBlob: boolean }) => string
  addLibraryModel: (m: LibraryModel) => string
  addFromUrl: (url: string) => string
  updateObject: (id: string, patch: Partial<SceneObject>) => void
  removeObject: (id: string) => void
  setObjectError: (id: string, failed: boolean) => void
  /** re-attach a dropped file to blob objects whose fileName matches */
  attachFile: (fileName: string, url: string) => void
}

export const createObjectsSlice: StateCreator<SceneState, [], [], ObjectsSlice> = (set) => ({
  objects: DEFAULT_OBJECTS,
  objectErrors: {},

  addObject: (o) => {
    const obj = makeObject(o)
    set((s) => ({ objects: [...s.objects, obj], selectedId: obj.id }))
    return obj.id
  },
  addLibraryModel: (m) => {
    const obj = makeObject({
      url: m.url,
      fileName: m.name + '.glb',
      isBlob: false,
      name: m.name,
      rotation: m.rotation,
    })
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
  setObjectError: (id, failed) =>
    set((s) => {
      const next = { ...s.objectErrors }
      if (failed) next[id] = true
      else delete next[id]
      return { objectErrors: next }
    }),
  attachFile: (fileName, url) =>
    set((s) => ({
      objects: s.objects.map((o) => {
        if (o.fileName !== fileName || (o.url && !o.isBlob)) return o
        releaseUrl(o.url) // drop the previous blob before re-attaching
        return { ...o, url, isBlob: true }
      }),
      objectErrors: (() => {
        const next = { ...s.objectErrors }
        const hit = s.objects.find((o) => o.fileName === fileName && (!o.url || o.isBlob))
        if (hit) delete next[hit.id]
        return next
      })(),
    })),
})
