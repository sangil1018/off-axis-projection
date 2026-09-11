/**
 * off-axis projection — a self-contained, store-free module.
 *
 * Wire a physical screen + a viewpoint source to an asymmetric camera frustum so
 * an R3F scene reads as a window into real space (head/hand-tracked parallax).
 *
 *   import { useViewpoint, OffAxisCamera, WindowFrame, TrackerPreview } from './offaxis'
 *
 *   const { viewpoint, status, message, videoRef, visualRef } = useViewpoint({
 *     source, screen: { widthM, heightM, distanceM }, tracking: DEFAULT_TRACKING,
 *   })
 *   // outside the canvas:
 *   <TrackerPreview {...{ source, status, message, videoRef, visualRef }} />
 *   // inside <Canvas camera={{ position:[0,0,distanceM] }}>:
 *   <OffAxisCamera eye={viewpoint} screen={screen} enabled={!editMode} />
 *   <WindowFrame widthM={widthM} heightM={heightM} />
 */
export * from './types'
export { computeOffAxis, makeResult, type OffAxisResult } from './projection'
export { ViewpointSmoother } from './Smoother'
export { OffAxisCamera, type OffAxisCameraProps } from './OffAxisCamera'
export { WindowFrame, type WindowFrameProps } from './WindowFrame'
export { RoomGrid, type RoomGridProps } from './RoomGrid'
export { WindowClip, type WindowClipProps } from './WindowClip'
export { fitScreenWidthM, useFittedScreenWidthM } from './screenFit'
export { TrackerPreview, type TrackerPreviewProps } from './TrackerPreview'
export { useViewpoint, type UseViewpointOptions } from './useViewpoint'
export { useFaceViewpoint } from './useFaceViewpoint'
export { useHandViewpoint, HAND_CONNECTIONS } from './useHandViewpoint'
export { usePointerViewpoint, type PointerViewpointOptions } from './usePointerViewpoint'
export {
  type VisionViewpointOptions,
  type ViewpointResult,
  type VisionStrategy,
  useVisionViewpoint,
} from './_useVisionViewpoint'
