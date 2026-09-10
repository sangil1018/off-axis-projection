import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF, TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { useScene, type SceneObject } from '../store/sceneStore'

const DRACO_PATH = 'decoders/draco/'
const BASIS_PATH = 'decoders/basis/'

function Model({
  obj,
  onFit,
}: {
  obj: SceneObject
  onFit: (scale: number, yOffset: number) => void
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

  useEffect(() => {
    cloned.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = obj.castShadow
        o.receiveShadow = obj.receiveShadow
      }
    })
  }, [cloned, obj.castShadow, obj.receiveShadow])

  // auto-fit once: scale largest dimension to ~0.28m, drop onto y≈-0.15
  useEffect(() => {
    if (obj.fitted) return
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const s = 0.28 / maxDim
    // place the model's base a touch below the screen centre (grid sits at y≈-0.25)
    const baseY = -0.14
    onFit(s, baseY - (center.y - size.y / 2) * s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloned, obj.fitted])

  return <primitive object={cloned} />
}

export function GltfEntity({ obj }: { obj: SceneObject }) {
  const groupRef = useRef<THREE.Group>(null)
  const selectedId = useScene((s) => s.selectedId)
  const editMode = useScene((s) => s.settings.editMode)
  const gizmoMode = useScene((s) => s.gizmoMode)
  const select = useScene((s) => s.select)
  const updateObject = useScene((s) => s.updateObject)

  const selected = selectedId === obj.id

  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.position.fromArray(obj.position)
    g.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2])
    g.scale.fromArray(obj.scale)
  }, [obj.position, obj.rotation, obj.scale])

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

  const content = (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation()
        select(obj.id)
      }}
    >
      {obj.url ? (
        <Model obj={obj} onFit={handleFit} />
      ) : (
        <mesh>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="#f43f5e" wireframe />
        </mesh>
      )}
    </group>
  )

  if (selected && editMode) {
    return (
      <TransformControls mode={gizmoMode} onMouseUp={commit} onObjectChange={commit}>
        {content}
      </TransformControls>
    )
  }
  return content
}
