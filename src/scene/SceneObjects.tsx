import { Suspense } from 'react'
import { useScene } from '../store/sceneStore'
import { GltfEntity } from './GltfEntity'

export function SceneObjects() {
  const objects = useScene((s) => s.objects)
  return (
    <Suspense fallback={null}>
      {objects.map((o) => (
        <GltfEntity key={o.id} obj={o} />
      ))}
    </Suspense>
  )
}
