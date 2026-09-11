import { useScene } from './store/sceneStore'
import { Studio } from './scene/Studio'
import { Toolbar } from './editor/Toolbar'
import { Outliner } from './editor/Outliner'
import { Inspector } from './editor/Inspector'
import { DropZone } from './editor/DropZone'
import { CalibrationWizard } from './components/CalibrationWizard'
import { useFittedSize } from './hooks/useFittedSize'
import { useMicLevel } from './hooks/useMicLevel'
import { useViewpoint, TrackerPreview } from './offaxis'

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
  const settings = useScene((s) => s.settings)
  const updateSettings = useScene((s) => s.updateSettings)
  const calibrating = useScene((s) => s.calibrating)
  const setCalibrating = useScene((s) => s.setCalibrating)

  const ratio = aspectRatioOf(settings.aspectMode, settings.customAspect)
  const { ref, size } = useFittedSize(ratio)

  const { viewpoint, status, message, videoRef, visualRef } = useViewpoint({
    source: settings.headSource,
    screen: {
      widthM: settings.screenWidthM,
      heightM: settings.screenHeightM,
      distanceM: settings.viewerDistanceM,
    },
    tracking: {
      strengthX: settings.strengthX,
      strengthY: settings.strengthY,
      strengthZ: settings.strengthZ,
      smoothing: settings.smoothing,
    },
    onFallback: () => updateSettings({ headSource: 'mouse' }),
  })

  const { level: micLevel, status: micStatus } = useMicLevel(
    settings.micEnabled,
    () => updateSettings({ micEnabled: false }),
  )

  if (import.meta.env.DEV) {
    ;(window as unknown as { __head?: unknown; __mic?: unknown }).__head = viewpoint
    ;(window as unknown as { __mic?: unknown }).__mic = micLevel
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Toolbar />
      <div className="relative flex min-h-0 flex-1">
        <Outliner />
        <DropZone>
          <div ref={ref} className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
            <div
              className="relative overflow-hidden rounded"
              style={{ width: size.width, height: size.height }}
            >
              {size.width > 0 && <Studio eye={viewpoint} micLevel={micLevel} />}
              {settings.headSource !== 'mouse' && (
                <TrackerPreview
                  source={settings.headSource}
                  status={status}
                  message={message}
                  videoRef={videoRef}
                  visualRef={visualRef}
                  onUsePointer={() => updateSettings({ headSource: 'mouse' })}
                />
              )}
            </div>
          </div>
        </DropZone>
        <Inspector micLevel={micLevel} micStatus={micStatus} />
      </div>
      {calibrating && <CalibrationWizard onClose={() => setCalibrating(false)} />}
    </div>
  )
}
