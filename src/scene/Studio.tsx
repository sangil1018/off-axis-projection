import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useScene } from '../store/sceneStore'
import { OffAxisCamera, WindowFrame, type Viewpoint } from '../offaxis'
import { SceneObjects } from './SceneObjects'
import { Lights } from './Lights'
import { SceneEnvironment } from './Environment'

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

export function Studio({ eye }: { eye: React.MutableRefObject<Viewpoint> }) {
  const settings = useScene((s) => s.settings)
  const select = useScene((s) => s.select)

  const dpr = useMemo<[number, number]>(
    () => [1, Math.max(0.5, 2 * settings.resolutionScale)],
    [settings.resolutionScale],
  )

  const screen = {
    widthM: settings.screenWidthM,
    heightM: settings.screenHeightM,
    distanceM: settings.viewerDistanceM,
  }

  return (
    <Canvas
      shadows={settings.shadows}
      dpr={dpr}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      camera={{ position: [0, 0, settings.viewerDistanceM], near: settings.near, far: settings.far }}
      onPointerMissed={() => select(null)}
      style={{ background: settings.background }}
    >
      <color attach="background" args={[settings.background]} />
      <ExposureSync exposure={settings.exposure} />
      {import.meta.env.DEV && <DebugBridge />}

      <OffAxisCamera
        eye={eye}
        screen={screen}
        near={settings.near}
        far={settings.far}
        enabled={!settings.editMode}
      />
      {settings.editMode && <OrbitControls makeDefault target={[0, 0, -0.3]} />}

      <Lights />
      <Suspense fallback={null}>
        <SceneEnvironment />
      </Suspense>
      {settings.showFrame && (
        <WindowFrame widthM={settings.screenWidthM} heightM={settings.screenHeightM} />
      )}
      <SceneObjects />
      <DemoContent />
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
