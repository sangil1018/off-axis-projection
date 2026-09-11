import { Suspense } from 'react'
import { useScene } from '../store/sceneStore'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { GltfEntity } from './GltfEntity'

export function SceneObjects() {
  const objects = useScene((s) => s.objects)
  const setObjectError = useScene((s) => s.setObjectError)

  return (
    <Suspense fallback={null}>
      {objects.map((o) => (
        <ErrorBoundary
          key={o.id}
          resetKey={o.url}
          onError={() => setObjectError(o.id, true)}
          fallback={null}
        >
          <GltfEntity obj={o} />
        </ErrorBoundary>
      ))}
    </Suspense>
  )
}
