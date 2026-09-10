import { useRef } from 'react'
import * as THREE from 'three'
import { useHelper } from '@react-three/drei'
import { useScene, type SceneLight } from '../store/sceneStore'

function LightItem({ light }: { light: SceneLight }) {
  const selectedId = useScene((s) => s.selectedId)
  const editMode = useScene((s) => s.settings.editMode)
  const selected = selectedId === light.id && editMode

  const dirRef = useRef<THREE.DirectionalLight>(null!)
  const pointRef = useRef<THREE.PointLight>(null!)
  const spotRef = useRef<THREE.SpotLight>(null!)

  useHelper(selected && light.type === 'directional' ? dirRef : null, THREE.DirectionalLightHelper, 0.5, '#fbbf24')
  useHelper(selected && light.type === 'point' ? pointRef : null, THREE.PointLightHelper, 0.2, '#fbbf24')
  useHelper(selected && light.type === 'spot' ? spotRef : null, THREE.SpotLightHelper, '#fbbf24')

  if (!light.visible) return null

  switch (light.type) {
    case 'ambient':
      return <ambientLight color={light.color} intensity={light.intensity} />
    case 'directional':
      return (
        <directionalLight
          ref={dirRef}
          color={light.color}
          intensity={light.intensity}
          position={light.position}
          castShadow={light.castShadow}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0005}
        />
      )
    case 'point':
      return (
        <pointLight
          ref={pointRef}
          color={light.color}
          intensity={light.intensity}
          position={light.position}
          distance={light.distance}
          decay={light.decay}
          castShadow={light.castShadow}
        />
      )
    case 'spot':
      return (
        <spotLight
          ref={spotRef}
          color={light.color}
          intensity={light.intensity}
          position={light.position}
          angle={light.angle}
          penumbra={light.penumbra}
          distance={light.distance}
          decay={light.decay}
          castShadow={light.castShadow}
        />
      )
  }
}

export function Lights() {
  const lights = useScene((s) => s.lights)
  return (
    <>
      {lights.map((l) => (
        <LightItem key={l.id} light={l} />
      ))}
    </>
  )
}
