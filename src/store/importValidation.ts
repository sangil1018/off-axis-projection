import type { LightType, SceneLight, SceneObject, Settings, Vec3 } from './sceneStore'

/**
 * Sanitizes an untrusted parsed-JSON scene file before it ever reaches
 * zustand `set()`. Nothing here is about prototype pollution (object spread
 * of parsed JSON can't touch a prototype) — this is about clamping values to
 * sane ranges, capping how much a single file can allocate, and refusing URL
 * schemes that could turn "load a scene" into "make an outbound request to
 * wherever I want" or "inject CSS/markup" via a free-text field.
 */

export const MAX_OBJECTS = 200
export const MAX_LIGHTS = 64
const MAX_NAME_LEN = 120
const SUPPORTED_VERSION = 1

const LIGHT_TYPES: readonly LightType[] = ['ambient', 'directional', 'point', 'spot']
const ASPECT_MODES = ['fill', '16:9', '4:3', '1:1', 'custom'] as const

// relative paths, same-origin absolute paths, http(s), blob:, and data: URIs
// (GLTFLoader can consume all of these) — never javascript:, file:, vbscript:
const SAFE_URL_RE = /^(?:https?:\/\/|blob:|data:|\/(?!\/)|models\/|\.{1,2}\/|[\w.-][\w./-]*$)/i

// #rgb[a] / #rrggbb[aa], CSS named colors, or rgb()/rgba() — rejects anything
// that could carry more than a color (url(), semicolons, expressions, …)
const SAFE_COLOR_RE = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+\s*)?\))$/

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function num(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback
  return Math.min(hi, Math.max(lo, n))
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function str(v: unknown, maxLen: number, fallback: string): string {
  return typeof v === 'string' ? v.slice(0, maxLen) : fallback
}

function oneOf<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback
}

function vec3(v: unknown, fallback: Vec3): Vec3 {
  if (!Array.isArray(v) || v.length !== 3) return fallback
  const [x, y, z] = v
  if (![x, y, z].every((n) => typeof n === 'number' && Number.isFinite(n))) return fallback
  // clamp to a range no legitimate scene value needs, so a huge number can't
  // blow up the frustum math or push geometry to infinity
  const c = (n: number) => Math.min(1e4, Math.max(-1e4, n))
  return [c(x), c(y), c(z)]
}

function sanitizeUrl(v: unknown): string {
  if (typeof v !== 'string') return ''
  const trimmed = v.trim().slice(0, 2000)
  return SAFE_URL_RE.test(trimmed) ? trimmed : ''
}

function sanitizeColor(v: unknown, fallback: string): string {
  return typeof v === 'string' && SAFE_COLOR_RE.test(v.trim()) ? v.trim() : fallback
}

export function sanitizeObject(raw: unknown, index: number): Omit<SceneObject, 'id'> | null {
  if (!isRecord(raw)) return null
  const url = sanitizeUrl(raw.url)
  const fileName = str(raw.fileName, MAX_NAME_LEN, `model-${index}.glb`)
  return {
    name: str(raw.name, MAX_NAME_LEN, fileName.replace(/\.(glb|gltf)$/i, '') || `Object ${index + 1}`),
    url,
    fileName,
    isBlob: !url || url.startsWith('blob:'),
    position: vec3(raw.position, [0, 0, -0.3]),
    rotation: vec3(raw.rotation, [0, 0, 0]),
    scale: vec3(raw.scale, [1, 1, 1]).map((n) => num(n, 0.001, 1000, 1)) as Vec3,
    visible: bool(raw.visible, true),
    castShadow: bool(raw.castShadow, true),
    receiveShadow: bool(raw.receiveShadow, true),
    fitted: bool(raw.fitted, true),
    shake: bool(raw.shake, false),
    shakeIntensity: num(raw.shakeIntensity, 0, 10, 1),
  }
}

export function sanitizeLight(raw: unknown): Omit<SceneLight, 'id'> | null {
  if (!isRecord(raw)) return null
  const type = oneOf(raw.type, LIGHT_TYPES, 'point')
  return {
    name: str(raw.name, MAX_NAME_LEN, type),
    type,
    color: sanitizeColor(raw.color, '#ffffff'),
    intensity: num(raw.intensity, 0, 100, 1),
    position: vec3(raw.position, [2, 3, 2]),
    target: vec3(raw.target, [0, 0, 0]),
    distance: num(raw.distance, 0, 1000, 0),
    decay: num(raw.decay, 0, 10, 2),
    angle: num(raw.angle, 0, Math.PI / 2, Math.PI / 6),
    penumbra: num(raw.penumbra, 0, 1, 0.3),
    castShadow: bool(raw.castShadow, false),
    visible: bool(raw.visible, true),
  }
}

/** Clamps every setting to the range its own Inspector control allows. */
export function sanitizeSettings(raw: unknown, defaults: Settings): Settings {
  const r = isRecord(raw) ? raw : {}
  return {
    resolutionScale: num(r.resolutionScale, 0.1, 3, defaults.resolutionScale),
    aspectMode: oneOf(r.aspectMode, ASPECT_MODES, defaults.aspectMode),
    customAspect: num(r.customAspect, 0.2, 10, defaults.customAspect),
    screenWidthM: num(r.screenWidthM, 0.05, 5, defaults.screenWidthM),
    screenHeightM: num(r.screenHeightM, 0.03, 5, defaults.screenHeightM),
    viewerDistanceM: num(r.viewerDistanceM, 0.1, 5, defaults.viewerDistanceM),
    fovDeg: num(r.fovDeg, 10, 120, defaults.fovDeg),
    near: num(r.near, 0.001, 1, defaults.near),
    far: num(r.far, 1, 10000, defaults.far),
    // never auto-trigger a camera prompt from a file — land on mouse, same as mic
    headSource: 'mouse',
    // a device id is a per-browser-profile hash from whoever exported the
    // file — meaningless (or worse, misleading) on this machine
    cameraDeviceId: null,
    strengthX: num(r.strengthX, 0, 10, defaults.strengthX),
    strengthY: num(r.strengthY, 0, 10, defaults.strengthY),
    strengthZ: num(r.strengthZ, 0, 10, defaults.strengthZ),
    smoothing: num(r.smoothing, 0.001, 1, defaults.smoothing),
    showFrame: bool(r.showFrame, defaults.showFrame),
    showGrid: bool(r.showGrid, defaults.showGrid),
    showRoomGrid: bool(r.showRoomGrid, defaults.showRoomGrid),
    roomDepthM: num(r.roomDepthM, 0.1, 10, defaults.roomDepthM),
    micEnabled: false, // never auto-enable the mic from a file, regardless of its content
    micThreshold: num(r.micThreshold, 0, 1, defaults.micThreshold),
    micGain: num(r.micGain, 0, 20, defaults.micGain),
    background: sanitizeColor(r.background, defaults.background),
    environment: bool(r.environment, defaults.environment),
    exposure: num(r.exposure, 0.05, 10, defaults.exposure),
    shadows: bool(r.shadows, defaults.shadows),
    editMode: false, // a file shouldn't be able to switch the view mode
  }
}

export type SanitizedScene = {
  version: number
  objects: Array<Omit<SceneObject, 'id'>>
  lights: Array<Omit<SceneLight, 'id'>>
  settings: Settings
}

/**
 * Validates + clamps a parsed scene file. Returns null (with a reason) if the
 * top-level shape isn't even a scene file — callers should surface that,
 * everything past that point degrades to defaults instead of failing.
 */
export function sanitizeScene(
  data: unknown,
  defaultSettings: Settings,
): { ok: true; scene: SanitizedScene } | { ok: false; reason: string } {
  if (!isRecord(data)) {
    return { ok: false, reason: '올바른 씬 파일이 아닙니다 (JSON 객체가 아님).' }
  }
  const version = typeof data.version === 'number' ? data.version : 1
  if (version > SUPPORTED_VERSION) {
    console.warn(`[importScene] unknown schema version ${version}, importing best-effort`)
  }

  const rawObjects = Array.isArray(data.objects) ? data.objects : []
  const rawLights = Array.isArray(data.lights) ? data.lights : []

  const objects = rawObjects
    .slice(0, MAX_OBJECTS)
    .map((o, i) => sanitizeObject(o, i))
    .filter((o): o is Omit<SceneObject, 'id'> => o !== null)

  const lights = rawLights
    .slice(0, MAX_LIGHTS)
    .map(sanitizeLight)
    .filter((l): l is Omit<SceneLight, 'id'> => l !== null)

  return {
    ok: true,
    scene: {
      version,
      objects,
      lights,
      settings: sanitizeSettings(data.settings, defaultSettings),
    },
  }
}
