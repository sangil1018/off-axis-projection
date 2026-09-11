import { useGLTF } from '@react-three/drei'

export const uid = () => Math.random().toString(36).slice(2, 10)

/** Release a dropped-file object URL and drop it from the GLTF cache. */
export function releaseUrl(url: string | undefined) {
  if (!url || !url.startsWith('blob:')) return
  try {
    URL.revokeObjectURL(url)
    useGLTF.clear(url)
  } catch {
    /* noop */
  }
}
