import type { StateCreator } from 'zustand'
import type { GizmoMode } from './types'
import type { SceneState } from './sceneStore'

/** Selection, hover, gizmo mode, and the editor-chrome bits (calibration
 * wizard, Inspector overlay) — none of it is scene data. */
export type UiSlice = {
  selectedId: string | null
  hoveredId: string | null
  gizmoMode: GizmoMode
  calibrating: boolean
  inspectorOpen: boolean
  inspectorOpacity: number

  select: (id: string | null) => void
  setHovered: (id: string | null) => void
  setGizmoMode: (m: GizmoMode) => void
  setCalibrating: (v: boolean) => void
  setInspectorOpen: (v: boolean) => void
  setInspectorOpacity: (v: number) => void
}

export const createUiSlice: StateCreator<SceneState, [], [], UiSlice> = (set) => ({
  selectedId: null,
  hoveredId: null,
  gizmoMode: 'translate',
  calibrating: false,
  inspectorOpen: false,
  inspectorOpacity: 0.9,

  select: (id) => set({ selectedId: id }),
  setHovered: (hoveredId) => set({ hoveredId }),
  setGizmoMode: (gizmoMode) => set({ gizmoMode }),
  setCalibrating: (calibrating) => set({ calibrating }),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  setInspectorOpacity: (inspectorOpacity) => set({ inspectorOpacity }),
})
