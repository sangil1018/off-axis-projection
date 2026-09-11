import { useCallback, useEffect, useState } from 'react'

/**
 * Wraps the Fullscreen API for a given element. Fullscreening a specific
 * element (rather than the whole document) hides everything outside it —
 * so pointing this at the viewport container gives an editor-chrome-free,
 * screen-filling view without any extra layout work.
 */
export function useFullscreen(target: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === target.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [target])

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      target.current?.requestFullscreen().catch(() => {})
    }
  }, [target])

  return { isFullscreen, toggle }
}
