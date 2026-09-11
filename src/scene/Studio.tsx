import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useShallow } from 'zustand/react/shallow'
import { useScene } from '../store/sceneStore'
import {
  OffAxisCamera,
  WindowFrame,
  RoomGrid,
  WindowClip,
  useFittedScreenWidthM,
  type Viewpoint,
} from '../offaxis'
import { SceneObjects } from './SceneObjects'
import { Lights } from './Lights'
import { SceneEnvironment } from './Environment'
import { MicContext } from '../audio'
import { EDITOR_ENABLED } from '../config'

// where the Edit-mode orbit camera looks by default — matches DemoContent's
// depth so an empty scene frames nicely
const EDIT_TARGET: [number, number, number] = [0, 0, -0.3]

function DemoContent() {
  const objects = useScene((s) => s.objects)
  if (objects.length > 0) return null
  return (
    <group position={[0, -0.05, -0.35]}>
      <mesh position={[-0.12, 0.05, -0.15]} castShadow>
        <boxGeometry args={[0.12, 0.12, 0.12]} />
        <meshStandardMaterial color="#f97316" roughness={0.4} />
      </mesh>
      <mesh position={[0.13, 0.08, 0.1]} castShadow>
        <icosahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial color="#22d3ee" roughness={0.2} metalness={0.3} />
      </mesh>
      <mesh position={[0.02, 0.14, -0.35]} castShadow>
        <torusKnotGeometry args={[0.07, 0.022, 128, 16]} />
        <meshStandardMaterial color="#a855f7" roughness={0.3} metalness={0.4} />
      </mesh>
    </group>
  )
}

export function Studio({
  eye,
  micLevel,
}: {
  eye: React.MutableRefObject<Viewpoint>
  micLevel: React.MutableRefObject<number>
}) {
  // narrow subscription: Studio only re-renders when a field it actually uses
  // changes (not on every settings tick — tracking/mic/aspect sliders live
  // elsewhere and shouldn't re-render the Canvas tree)
  const {
    resolutionScale,
    screenWidthM,
    screenHeightM,
    viewerDistanceM,
    fovDeg,
    shadows,
    near,
    far,
    background,
    exposure,
    editMode: rawEditMode,
    showFrame,
    showRoomGrid,
    roomDepthM,
  } = useScene(
    useShallow((s) => ({
      resolutionScale: s.settings.resolutionScale,
      screenWidthM: s.settings.screenWidthM,
      screenHeightM: s.settings.screenHeightM,
      viewerDistanceM: s.settings.viewerDistanceM,
      fovDeg: s.settings.fovDeg,
      shadows: s.settings.shadows,
      near: s.settings.near,
      far: s.settings.far,
      background: s.settings.background,
      exposure: s.settings.exposure,
      editMode: s.settings.editMode,
      showFrame: s.settings.showFrame,
      showRoomGrid: s.settings.showRoomGrid,
      roomDepthM: s.settings.roomDepthM,
    })),
  )
  const select = useScene((s) => s.select)
  // the orbit-camera editor view only exists in the editor build
  const editMode = EDITOR_ENABLED && rawEditMode

  const dpr = useMemo<[number, number]>(
    () => [1, Math.max(0.5, 2 * resolutionScale)],
    [resolutionScale],
  )

  const screen = { widthM: screenWidthM, heightM: screenHeightM, distanceM: viewerDistanceM }

  return (
    <Canvas
      shadows={shadows}
      dpr={dpr}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      camera={{ position: [0, 0, viewerDistanceM], near, far, fov: fovDeg }}
      onPointerMissed={() => select(null)}
      style={{ background }}
    >
      <color attach="background" args={[background]} />
      <ExposureSync exposure={exposure} />
      {import.meta.env.DEV && <DebugBridge />}

      <MicContext.Provider value={micLevel}>
        <OffAxisCamera eye={eye} screen={screen} near={near} far={far} enabled={!editMode} />
        <EditCameraReset
          active={editMode}
          distanceM={viewerDistanceM}
          fovDeg={fovDeg}
          near={near}
          far={far}
        />
        {editMode && <OrbitControls makeDefault target={EDIT_TARGET} />}

        <Lights />
        <Suspense fallback={null}>
          <SceneEnvironment />
        </Suspense>
        <FittedWindow
          heightM={screenHeightM}
          depthM={roomDepthM}
          showFrame={showFrame}
          showRoomGrid={showRoomGrid}
        />
        <WindowClip heightM={screenHeightM} enabled={!editMode} />
        <SceneObjects />
        <DemoContent />
      </MicContext.Provider>
    </Canvas>
  )
}

/**
 * OffAxisCamera writes straight to camera.position/quaternion/projectionMatrix
 * every frame while Preview is active, bypassing the normal fov-based matrix
 * entirely. If Edit mode just inherits whatever that left behind — the eye's
 * last tracked position, a skewed asymmetric projection — OrbitControls starts
 * from a nonsensical, jump-cut view. Reset the camera to a plain symmetric
 * default the instant Edit mode turns on, so Preview -> Edit always starts
 * from the same predictable framing.
 */
function EditCameraReset({
  active,
  distanceM,
  fovDeg,
  near,
  far,
}: {
  active: boolean
  distanceM: number
  fovDeg: number
  near: number
  far: number
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const wasActive = useRef(false)
  useEffect(() => {
    if (active && !wasActive.current) {
      camera.up.set(0, 1, 0)
      camera.position.set(0, 0, distanceM)
      camera.lookAt(...EDIT_TARGET)
      camera.fov = fovDeg
      camera.near = near
      camera.far = far
      camera.updateProjectionMatrix()
    }
    wasActive.current = active
  }, [active, camera, distanceM, fovDeg, near, far])
  return null
}

/**
 * Renders the window frame outline / room grid at the same aspect-fitted
 * width OffAxisCamera derives its frustum from (see fitScreenWidthM) —
 * otherwise they'd draw the calibrated screenWidthM while the actual view is
 * wider or narrower, leaving the frame floating away from the true edge of
 * what's visible instead of tracing it.
 */
function FittedWindow({
  heightM,
  depthM,
  showFrame,
  showRoomGrid,
}: {
  heightM: number
  depthM: number
  showFrame: boolean
  showRoomGrid: boolean
}) {
  const widthM = useFittedScreenWidthM(heightM)
  return (
    <>
      {showFrame && <WindowFrame widthM={widthM} heightM={heightM} />}
      {showRoomGrid && <RoomGrid widthM={widthM} heightM={heightM} depthM={depthM} />}
    </>
  )
}

function DebugBridge() {
  const get = useThree((s) => s.get)
  ;(window as unknown as { __r3f?: unknown }).__r3f = get()
  return null
}

function ExposureSync({ exposure }: { exposure: number }) {
  const gl = useThree((s) => s.gl)
  useFrame(() => {
    if (gl.toneMappingExposure !== exposure) gl.toneMappingExposure = exposure
  })
  return null
}
