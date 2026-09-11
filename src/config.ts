/**
 * The editor chrome (Toolbar, Outliner, Inspector, calibration wizard, the
 * in-view gizmo/hover/selection affordances) only ships in development. A
 * production build is a locked viewer: it renders whatever scene was last
 * authored and tracks the viewer's face/hand/mouse, with no way to edit it.
 */
export const EDITOR_ENABLED = import.meta.env.DEV
