import { useShallow } from 'zustand/react/shallow'
import { useScene } from './store/sceneStore'
import { Studio } from './scene/Studio'
import { Toolbar } from './editor/Toolbar'
import { Outliner } from './editor/Outliner'
import { Inspector } from './editor/Inspector'
import { DropZone } from './editor/DropZone'
import { CalibrationWizard } from './components/CalibrationWizard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useFittedSize } from './hooks/useFittedSize'
import { useMicLevel } from './audio'
import { useViewpoint, TrackerPreview } from './offaxis'
import { EDITOR_ENABLED } from './config'

function aspectRatioOf(mode: string, custom: number): number | null {
  switch (mode) {
    case '16:9':
      return 16 / 9
    case '4:3':
      return 4 / 3
    case '1:1':
      return 1
    case 'custom':
      return custom > 0 ? custom : null
    default:
      return null
  }
}

export default function App() {
  // narrow subscription: App only re-renders when a field it actually reads
  // changes — render/look settings (exposure, shadows, background, …) live in
  // Studio/Inspector and shouldn't re-render this shell on every tick
  const {
    aspectMode,
    customAspect,
    headSource,
    screenWidthM,
    screenHeightM,
    viewerDistanceM,
    strengthX,
    strengthY,
    strengthZ,
    smoothing,
    micEnabled,
    editMode,
  } = useScene(
    useShallow((s) => ({
      aspectMode: s.settings.aspectMode,
      customAspect: s.settings.customAspect,
      headSource: s.settings.headSource,
      screenWidthM: s.settings.screenWidthM,
      screenHeightM: s.settings.screenHeightM,
      viewerDistanceM: s.settings.viewerDistanceM,
      strengthX: s.settings.strengthX,
      strengthY: s.settings.strengthY,
      strengthZ: s.settings.strengthZ,
      smoothing: s.settings.smoothing,
      micEnabled: s.settings.micEnabled,
      editMode: s.settings.editMode,
    })),
  )
  const updateSettings = useScene((s) => s.updateSettings)
  const calibrating = useScene((s) => s.calibrating)
  const setCalibrating = useScene((s) => s.setCalibrating)

  // the edit-mode orbit view only exists in the editor build
  const editModeActive = EDITOR_ENABLED && editMode

  const ratio = aspectRatioOf(aspectMode, customAspect)
  const { ref, size } = useFittedSize(ratio)

  // while editing, the mouse drives OrbitControls (pan/orbit/zoom) instead of
  // the off-axis viewpoint — so face/hand/mouse tracking is fully paused
  const { viewpoint, status, message, videoRef, visualRef } = useViewpoint({
    source: headSource,
    screen: { widthM: screenWidthM, heightM: screenHeightM, distanceM: viewerDistanceM },
    tracking: { strengthX, strengthY, strengthZ, smoothing },
    onFallback: () => updateSettings({ headSource: 'mouse' }),
    enabled: !editModeActive,
  })

  const { level: micLevel, status: micStatus } = useMicLevel(micEnabled, () =>
    updateSettings({ micEnabled: false }),
  )

  if (import.meta.env.DEV) {
    ;(window as unknown as { __head?: unknown; __mic?: unknown }).__head = viewpoint
    ;(window as unknown as { __mic?: unknown }).__mic = micLevel
  }

  const viewport = (
    <div ref={ref} className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
      <div className="relative overflow-hidden rounded" style={{ width: size.width, height: size.height }}>
        {size.width > 0 && (
          <ErrorBoundary
            fallback={(err, retry) => (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm font-medium text-rose-300">3D 뷰 렌더 중 오류가 발생했습니다</p>
                <p className="max-w-sm text-xs text-slate-400">{err.message}</p>
                <button className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium" onClick={retry}>
                  다시 시도
                </button>
              </div>
            )}
          >
            <Studio eye={viewpoint} micLevel={micLevel} />
          </ErrorBoundary>
        )}
        {headSource !== 'mouse' && !editModeActive && (
          <TrackerPreview
            source={headSource}
            status={status}
            message={message}
            videoRef={videoRef}
            visualRef={visualRef}
            onUsePointer={() => updateSettings({ headSource: 'mouse' })}
          />
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-full w-full flex-col">
      {EDITOR_ENABLED && <Toolbar />}
      <div className="relative flex min-h-0 flex-1">
        {EDITOR_ENABLED && <Outliner />}
        {EDITOR_ENABLED ? <DropZone>{viewport}</DropZone> : viewport}
        {EDITOR_ENABLED && <Inspector micLevel={micLevel} micStatus={micStatus} />}
      </div>
      {EDITOR_ENABLED && calibrating && <CalibrationWizard onClose={() => setCalibrating(false)} />}
    </div>
  )
}
