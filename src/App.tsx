import { useEffect, useRef } from 'react'
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
import { useFullscreen } from './hooks/useFullscreen'
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
    cameraDeviceId,
    screenWidthM,
    screenHeightM,
    viewerDistanceM,
    strengthX,
    strengthY,
    strengthZ,
    smoothing,
    micEnabled,
    editMode,
    uiTheme,
  } = useScene(
    useShallow((s) => ({
      aspectMode: s.settings.aspectMode,
      customAspect: s.settings.customAspect,
      headSource: s.settings.headSource,
      cameraDeviceId: s.settings.cameraDeviceId,
      screenWidthM: s.settings.screenWidthM,
      screenHeightM: s.settings.screenHeightM,
      viewerDistanceM: s.settings.viewerDistanceM,
      strengthX: s.settings.strengthX,
      strengthY: s.settings.strengthY,
      strengthZ: s.settings.strengthZ,
      smoothing: s.settings.smoothing,
      micEnabled: s.settings.micEnabled,
      editMode: s.settings.editMode,
      uiTheme: s.settings.uiTheme,
    })),
  )
  const updateSettings = useScene((s) => s.updateSettings)
  const calibrating = useScene((s) => s.calibrating)
  const setCalibrating = useScene((s) => s.setCalibrating)

  // the edit-mode orbit view only exists in the editor build
  const editModeActive = EDITOR_ENABLED && editMode

  // purely cosmetic — swaps the editor chrome's accent color (see
  // src/index.css's [data-ui-theme] blocks); has no effect on the rendered
  // scene, so it's harmless to apply even in a production viewer build
  useEffect(() => {
    document.documentElement.dataset.uiTheme = uiTheme
  }, [uiTheme])

  const viewportRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(viewportRef)
  // fullscreen means "fill the display" — the configured aspect ratio only
  // makes sense as a letterbox inside a windowed layout
  const ratio = isFullscreen ? null : aspectRatioOf(aspectMode, customAspect)
  const { ref, size } = useFittedSize(ratio, viewportRef)

  // while editing, the mouse drives OrbitControls (pan/orbit/zoom) instead of
  // the off-axis viewpoint — so face/hand/mouse tracking is fully paused
  const { viewpoint, status, message, videoRef, visualRef } = useViewpoint({
    source: headSource,
    screen: { widthM: screenWidthM, heightM: screenHeightM, distanceM: viewerDistanceM },
    tracking: { strengthX, strengthY, strengthZ, smoothing },
    deviceId: cameraDeviceId,
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
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-ink p-6 text-center">
                <p className="text-sm font-medium text-rose-300">3D 뷰 렌더 중 오류가 발생했습니다</p>
                <p className="max-w-sm text-xs text-muted">{err.message}</p>
                <button className="rounded-sm bg-accent px-3 py-1.5 text-xs font-medium text-ink" onClick={retry}>
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
            deviceId={cameraDeviceId}
            onSelectDevice={(id) => updateSettings({ cameraDeviceId: id })}
          />
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? '전체화면 종료' : '전체화면'}
          className="absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-sm bg-black/40 text-fg opacity-60 backdrop-blur transition hover:text-accent hover:opacity-100"
        >
          {isFullscreen ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M3 15h4a2 2 0 0 1 2 2v4M15 21v-4a2 2 0 0 1 2-2h4" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 1-2-2h-4M3 15v4a2 2 0 0 0 2 2h4M21 15v4a2 2 0 0 1-2 2h-4" />
            </svg>
          )}
        </button>
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
