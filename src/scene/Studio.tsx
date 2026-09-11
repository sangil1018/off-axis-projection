import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useShallow } from 'zustand/react/shallow'
import { useScene } from '../store/sceneStore'
import { OffAxisCamera, WindowFrame, RoomGrid, type Viewpoint } from '../offaxis'
import { SceneObjects } from './SceneObjects'
import { Lights } from './Lights'
import { SceneEnvironment } from './Environment'
import { MicContext } from '../audio'
import { EDITOR_ENABLED } from '../config'

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
        {editMode && <OrbitControls makeDefault target={[0, 0, -0.3]} />}

        <Lights />
        <Suspense fallback={null}>
          <SceneEnvironment />
        </Suspense>
        {showFrame && <WindowFrame widthM={screenWidthM} heightM={screenHeightM} />}
        {showRoomGrid && (
          <RoomGrid widthM={screenWidthM} heightM={screenHeightM} depthM={roomDepthM} />
        )}
        <SceneObjects />
        <DemoContent />
      </MicContext.Provider>
    </Canvas>
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
