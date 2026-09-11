import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import type * as THREE from 'three'
import { useScene } from '../store/sceneStore'
import { useMic } from './MicContext'

/**
 * Drives a group's position/rotation with a mic-loudness-proportional jitter.
 * Magnitude ∝ max(0, loudness − threshold) × global gain × per-model
 * intensity; below the threshold (or mic/shake off, or in edit mode) the
 * group snaps back to identity. Attach the ref to a group nested *inside*
 * whatever transform you don't want the jitter to fight (e.g. the entity's
 * own position/rotation/scale group).
 */
export function useMicShake(
  ref: RefObject<THREE.Group>,
  enabled: boolean,
  intensity: number,
) {
  const mic = useMic()

  useFrame(() => {
    const g = ref.current
    if (!g) return
    const s = useScene.getState().settings
    const active = s.micEnabled && enabled && !s.editMode
    if (!active) {
      if (g.position.x || g.position.y || g.position.z || g.rotation.x) {
        g.position.set(0, 0, 0)
        g.rotation.set(0, 0, 0)
      }
      return
    }
    const over = Math.max(0, mic.current - s.micThreshold)
    const amt = over * s.micGain * intensity
    const t = performance.now() * 0.001
    const j = amt * 0.045
    g.position.set(
      (Math.sin(t * 97.1) + Math.sin(t * 53.3)) * 0.5 * j,
      (Math.sin(t * 61.7) + Math.sin(t * 88.9)) * 0.5 * j,
      (Math.sin(t * 71.3) + Math.sin(t * 43.7)) * 0.5 * j,
    )
    const r = amt * 0.13
    g.rotation.set(Math.sin(t * 67.2) * r, Math.sin(t * 59.5) * r, Math.sin(t * 73.9) * r)
  })
}
