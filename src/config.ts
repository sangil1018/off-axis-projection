/**
 * The editor chrome (Toolbar, Outliner, Inspector, calibration wizard, the
 * in-view gizmo/hover/selection affordances) only ships in development. A
 * production build is a locked viewer: it renders whatever scene was last
 * authored and tracks the viewer's face/hand/mouse, with no way to edit it.
 *
 * A dev build can opt into that same locked-viewer layout via `?viewer` in
 * the URL — used by the Toolbar's "새 창에서 열기" (open viewer) button so it
 * can preview the real, editor-free presentation without a production build.
 */
const isViewerOnly =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('viewer')

export const EDITOR_ENABLED = import.meta.env.DEV && !isViewerOnly
