import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useGLTF, TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { useScene, type SceneObject } from '../store/sceneStore'
import { useMicShake } from '../audio'
import { EDITOR_ENABLED } from '../config'
import { useLocalBounds, type Bounds } from '../hooks/useLocalBounds'

const DRACO_PATH = 'decoders/draco/'
const BASIS_PATH = 'decoders/basis/'

/** Wireframe box around a model — bold cyan for selection, faint for hover. */
function HighlightBox({ bounds, kind }: { bounds: Bounds; kind: 'select' | 'hover' }) {
  const pad = kind === 'select' ? 1.05 : 1.02
  const [sx, sy, sz] = bounds.size
  const geo = useMemo(() => {
    const box = new THREE.BoxGeometry(sx * pad, sy * pad, sz * pad)
    const edges = new THREE.EdgesGeometry(box)
    box.dispose()
    return edges
  }, [sx, sy, sz, pad])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <lineSegments geometry={geo} position={bounds.center} renderOrder={999}>
      <lineBasicMaterial
        color={kind === 'select' ? '#38bdf8' : '#cbd5e1'}
        depthTest={kind === 'hover' ? true : false}
        transparent
        opacity={kind === 'select' ? 1 : 0.6}
        toneMapped={false}
      />
    </lineSegments>
  )
}

function Model({
  obj,
  onFit,
  hovered,
  selected,
}: {
  obj: SceneObject
  onFit: (scale: number, yOffset: number) => void
  hovered: boolean
  selected: boolean
}) {
  const gl = useThree((s) => s.gl)
  const extendLoader = useMemo(
    () => (loader: { setKTX2Loader: (l: KTX2Loader) => void }) => {
      const ktx2 = new KTX2Loader().setTranscoderPath(BASIS_PATH).detectSupport(gl)
      loader.setKTX2Loader(ktx2)
    },
    [gl],
  )

  // useGLTF(path, dracoDecoderPath, useMeshopt, extendLoader)
  const { scene } = useGLTF(obj.url, DRACO_PATH, true, extendLoader as never)
  const cloned = useMemo(() => scene.clone(true), [scene])

  // reaching here means the model loaded — clear any prior error flag
  const setObjectError = useScene((s) => s.setObjectError)
  useEffect(() => {
    setObjectError(obj.id, false)
  }, [obj.id, obj.url, setObjectError])

  useEffect(() => {
    cloned.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = obj.castShadow
        o.receiveShadow = obj.receiveShadow
      }
    })
  }, [cloned, obj.castShadow, obj.receiveShadow])

  // local bounding box — feeds both the selection wireframe and the one-time
  // auto-fit scale/position below
  const bounds = useLocalBounds(cloned)

  useEffect(() => {
    if (!bounds || obj.fitted) return
    const maxDim = Math.max(...bounds.size) || 1
    const s = 0.28 / maxDim
    const baseY = -0.14
    onFit(s, baseY - (bounds.center[1] - bounds.size[1] / 2) * s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, obj.fitted])

  return (
    <>
      <primitive object={cloned} />
      {bounds && selected && <HighlightBox bounds={bounds} kind="select" />}
      {bounds && hovered && !selected && <HighlightBox bounds={bounds} kind="hover" />}
    </>
  )
}

export function GltfEntity({ obj }: { obj: SceneObject }) {
  const groupRef = useRef<THREE.Group>(null)
  const shakeRef = useRef<THREE.Group>(null)
  const selectedId = useScene((s) => s.selectedId)
  const hoveredId = useScene((s) => s.hoveredId)
  const gizmoMode = useScene((s) => s.gizmoMode)
  const select = useScene((s) => s.select)
  const setHovered = useScene((s) => s.setHovered)
  const updateObject = useScene((s) => s.updateObject)

  // selection/hover/gizmo are editor-only — a production viewer never selects
  const selected = EDITOR_ENABLED && selectedId === obj.id
  const hovered = EDITOR_ENABLED && hoveredId === obj.id
  const [rootReady, setRootReady] = useState(false)

  useEffect(() => {
    setRootReady(true)
  }, [])

  useMicShake(shakeRef, obj.shake, obj.shakeIntensity)

  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.position.fromArray(obj.position)
    g.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2])
    g.scale.fromArray(obj.scale)
  }, [obj.position, obj.rotation, obj.scale])

  const dragging = useRef(false)
  const commit = () => {
    const g = groupRef.current
    if (!g) return
    updateObject(obj.id, {
      position: [g.position.x, g.position.y, g.position.z],
      rotation: [g.rotation.x, g.rotation.y, g.rotation.z],
      scale: [g.scale.x, g.scale.y, g.scale.z],
    })
  }

  const handleFit = (scale: number, yOffset: number) => {
    updateObject(obj.id, {
      scale: [scale, scale, scale],
      position: [obj.position[0], obj.position[1] + yOffset, obj.position[2]],
      fitted: true,
    })
  }

  if (!obj.visible) return null

  return (
    <>
      <group
        ref={groupRef}
        onClick={
          EDITOR_ENABLED
            ? (e) => {
                e.stopPropagation()
                select(obj.id)
              }
            : undefined
        }
        onPointerOver={
          EDITOR_ENABLED
            ? (e) => {
                e.stopPropagation()
                setHovered(obj.id)
              }
            : undefined
        }
        onPointerOut={
          EDITOR_ENABLED
            ? (e) => {
                e.stopPropagation()
                if (useScene.getState().hoveredId === obj.id) setHovered(null)
              }
            : undefined
        }
      >
        <group ref={shakeRef}>
          {obj.url ? (
            <Model obj={obj} onFit={handleFit} hovered={hovered} selected={selected} />
          ) : (
            <mesh>
              <boxGeometry args={[0.1, 0.1, 0.1]} />
              <meshStandardMaterial
                color={hovered ? '#fb7185' : '#f43f5e'}
                emissive={selected ? '#38bdf8' : '#000000'}
                wireframe
              />
            </mesh>
          )}
        </group>
      </group>

      {/* in-view manipulator (both preview & edit mode) — attaches to the group
          as a sibling so the model never remounts on select/deselect */}
      {selected && rootReady && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={gizmoMode}
          onMouseDown={() => (dragging.current = true)}
          onMouseUp={() => {
            dragging.current = false
            commit()
          }}
          onObjectChange={() => {
            if (dragging.current) commit()
          }}
        />
      )}
    </>
  )
}
