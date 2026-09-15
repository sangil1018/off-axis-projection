import { Grid, Environment as DreiEnvironment, Lightformer, Line } from '@react-three/drei'
import { useScene } from '../store/sceneStore'

const GRID_Z = -0.3
const GRID_HALF_EXTENT = 5 // metres — matches Blender's default viewport grid scale

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

/** Blender-style colored origin lines: red along X, green along the depth axis. */
function GridAxes({ floorY }: { floorY: number }) {
  const y = floorY + 0.0005 // nudge above the grid plane to avoid z-fighting
  return (
    <>
      <Line
        points={[
          [-GRID_HALF_EXTENT, y, GRID_Z],
          [GRID_HALF_EXTENT, y, GRID_Z],
        ]}
        color="#a35454"
        lineWidth={1.5}
      />
      <Line
        points={[
          [0, y, GRID_Z - GRID_HALF_EXTENT],
          [0, y, GRID_Z + GRID_HALF_EXTENT],
        ]}
        color="#5a9c62"
        lineWidth={1.5}
      />
    </>
  )
}

export function SceneEnvironment() {
  const showGrid = useScene((s) => s.settings.showGrid)
  const environment = useScene((s) => s.settings.environment)
  const shadows = useScene((s) => s.settings.shadows)
  const screenHeightM = useScene((s) => s.settings.screenHeightM)
  // the off-axis room (WindowFrame/RoomGrid/WindowClip) floors at
  // -screenHeightM/2 — this Blender-style reference grid used to sit at a
  // fixed -0.25 regardless, so it floated at whatever height that happened
  // to land relative to the room instead of forming one continuous floor
  const floorY = -screenHeightM / 2
  return (
    <>
      {environment && <ProceduralIBL />}
      <hemisphereLight args={['#cfe0ff', '#2b2f3a', environment ? 0.15 : 0.6]} />
      {showGrid && (
        <>
          {/* Blender defaults: 1m cells (10 subdivisions of 0.1m each) */}
          <Grid
            position={[0, floorY, GRID_Z]}
            args={[GRID_HALF_EXTENT * 2, GRID_HALF_EXTENT * 2]}
            cellSize={0.1}
            cellThickness={0.5}
            sectionSize={1}
            sectionThickness={1.25}
            sectionColor="#6b6b6b"
            cellColor="#3d3d3d"
            fadeDistance={GRID_HALF_EXTENT * 2}
            fadeStrength={1}
            infiniteGrid
          />
          <GridAxes floorY={floorY} />
        </>
      )}
      {shadows && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, GRID_Z]} receiveShadow>
          <planeGeometry args={[GRID_HALF_EXTENT * 2, GRID_HALF_EXTENT * 2]} />
          <shadowMaterial opacity={0.35} />
        </mesh>
      )}
    </>
  )
}
