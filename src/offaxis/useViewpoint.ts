import { useFaceViewpoint } from './useFaceViewpoint'
import { useHandViewpoint } from './useHandViewpoint'
import { usePointerViewpoint } from './usePointerViewpoint'
import type { ViewpointResult } from './_useVisionViewpoint'
import type { ScreenConfig, TrackingConfig, ViewpointSource } from './types'

export type UseViewpointOptions = {
  source: ViewpointSource
  screen: ScreenConfig
  tracking: TrackingConfig
  /** invoked with a reason when a webcam source cannot start */
  onFallback?: (reason: string) => void
  /** element the pointer source measures against (defaults to window) */
  pointerTarget?: React.RefObject<HTMLElement> | null
  /** master switch — false stops the webcam/pointer listener entirely
   * (e.g. while an orbit-camera editor mode owns the view instead) */
  enabled?: boolean
}

/**
 * One hook, three interchangeable sources. All three run (cheaply) so switching
 * `source` never breaks the rules of hooks; only the active one opens a webcam.
 *
 *   const { viewpoint, status } = useViewpoint({ source, screen, tracking })
 *   // inside <Canvas>: <OffAxisCamera eye={viewpoint} screen={screen} />
 */
export function useViewpoint(opts: UseViewpointOptions): ViewpointResult {
  const enabled = opts.enabled ?? true
  const face = useFaceViewpoint({
    enabled: enabled && opts.source === 'face',
    screen: opts.screen,
    tracking: opts.tracking,
    onFallback: opts.onFallback,
  })
  const hand = useHandViewpoint({
    enabled: enabled && opts.source === 'hand',
    screen: opts.screen,
    tracking: opts.tracking,
    onFallback: opts.onFallback,
  })
  const pointer = usePointerViewpoint({
    enabled: enabled && opts.source === 'mouse',
    screen: opts.screen,
    tracking: opts.tracking,
    target: opts.pointerTarget,
  })

  if (opts.source === 'face') return face
  if (opts.source === 'hand') return hand
  return pointer
}
