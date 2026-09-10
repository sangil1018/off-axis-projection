import { Grid, Environment as DreiEnvironment, Lightformer, Line } from '@react-three/drei'
import { useScene } from '../store/sceneStore'

/** The virtual "window" frame sitting in the screen plane (z = 0). */
export function WindowFrame() {
  const show = useScene((s) => s.settings.showFrame)
  const w = useScene((s) => s.settings.screenWidthM)
  const h = useScene((s) => s.settings.screenHeightM)
  if (!show) return null
  const pts: [number, number, number][] = [
    [-w / 2, -h / 2, 0],
    [w / 2, -h / 2, 0],
    [w / 2, h / 2, 0],
    [-w / 2, h / 2, 0],
    [-w / 2, -h / 2, 0],
  ]
  return <Line points={pts} color="#38bdf8" lineWidth={1.5} />
}

/**
 * Fully procedural image-based lighting — no external HDR download, works offline.
 */
function ProceduralIBL() {
  return (
    <DreiEnvironment resolution={256}>
      <group>
        <Lightformer intensity={2} position={[0, 4, -6]} scale={[10, 6, 1]} color="#ffffff" />
        <Lightformer intensity={1.2} position={[-5, 1, 2]} scale={[4, 8, 1]} color="#bcd4ff" />
        <Lightformer intensity={1.2} position={[5, 1, 2]} scale={[4, 8, 1]} color="#ffe6c2" />
        <Lightformer intensity={0.6} position={[0, -3, 3]} scale={[10, 4, 1]} color="#8892a8" />
      </group>
    </DreiEnvironment>
  )
}

export function SceneEnvironment() {
  const showGrid = useScene((s) => s.settings.showGrid)
  const environment = useScene((s) => s.settings.environment)
  const shadows = useScene((s) => s.settings.shadows)
  return (
    <>
      {environment && <ProceduralIBL />}
      <hemisphereLight args={['#cfe0ff', '#2b2f3a', environment ? 0.15 : 0.6]} />
      {showGrid && (
        <Grid
          position={[0, -0.25, -0.3]}
          args={[10, 10]}
          cellSize={0.1}
          cellThickness={0.6}
          sectionSize={0.5}
          sectionThickness={1}
          sectionColor="#3b82f6"
          cellColor="#334155"
          fadeDistance={6}
          infiniteGrid
        />
      )}
      {shadows && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, -0.3]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.35} />
        </mesh>
      )}
    </>
  )
}
