import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useGLTF, TransformControls } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { useScene, type SceneObject } from '../store/sceneStore'
import { useMic } from './MicContext'

const DRACO_PATH = 'decoders/draco/'
const BASIS_PATH = 'decoders/basis/'
type Bounds = { size: [number, number, number]; center: [number, number, number] }

/** Wireframe box around a model — bold cyan for selection, faint for hover. */
function HighlightBox({ bounds, kind }: { bounds: Bounds; kind: 'select' | 'hover' }) {
  const pad = kind === 'select' ? 1.05 : 1.02
  const geo = useMemo(() => {
    const box = new THREE.BoxGeometry(
      bounds.size[0] * pad,
      bounds.size[1] * pad,
      bounds.size[2] * pad,
    )
    const edges = new THREE.EdgesGeometry(box)
    box.dispose()
    return edges
  }, [bounds.size[0], bounds.size[1], bounds.size[2], pad])
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

  const [bounds, setBounds] = useState<Bounds | null>(null)

  useEffect(() => {
    cloned.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = obj.castShadow
        o.receiveShadow = obj.receiveShadow
      }
    })
  }, [cloned, obj.castShadow, obj.receiveShadow])

  // local bounding box (for the selection wireframe) — recompute after fit
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    setBounds({ size: size.toArray(), center: center.toArray() })

    if (!obj.fitted) {
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      const s = 0.28 / maxDim
      const baseY = -0.14
      onFit(s, baseY - (center.y - size.y / 2) * s)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloned, obj.fitted])

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
  const mic = useMic()

  const selected = selectedId === obj.id
  const hovered = hoveredId === obj.id
  const [rootReady, setRootReady] = useState(false)

  useEffect(() => {
    setRootReady(true)
  }, [])

  // mic-driven shake: magnitude ∝ max(0, loudness - threshold)
  useFrame(() => {
    const g = shakeRef.current
    if (!g) return
    const s = useScene.getState().settings
    const active = s.micEnabled && obj.shake && !s.editMode
    if (!active) {
      if (g.position.x || g.position.y || g.position.z || g.rotation.x) {
        g.position.set(0, 0, 0)
        g.rotation.set(0, 0, 0)
      }
      return
    }
    const over = Math.max(0, mic.current - s.micThreshold)
    const amt = over * s.micGain * obj.shakeIntensity
    const t = performance.now() * 0.001
    const j = amt * 0.045
    g.position.set(
      (Math.sin(t * 97.1) + Math.sin(t * 53.3)) * 0.5 * j,
      (Math.sin(t * 61.7) + Math.sin(t * 88.9)) * 0.5 * j,
      (Math.sin(t * 71.3) + Math.sin(t * 43.7)) * 0.5 * j,
    )
    const r = amt * 0.13
    g.rotation.set(
      Math.sin(t * 67.2) * r,
      Math.sin(t * 59.5) * r,
      Math.sin(t * 73.9) * r,
    )
  })

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
        onClick={(e) => {
          e.stopPropagation()
          select(obj.id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(obj.id)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          if (useScene.getState().hoveredId === obj.id) setHovered(null)
        }}
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
