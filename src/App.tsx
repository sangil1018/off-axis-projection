import { useHeadTracking } from './hooks/useHeadTracking'
import { useScene } from './store/sceneStore'
import { Studio } from './scene/Studio'
import { Toolbar } from './editor/Toolbar'
import { Outliner } from './editor/Outliner'
import { Inspector } from './editor/Inspector'
import { DropZone } from './editor/DropZone'
import { TrackingOverlay } from './components/TrackingOverlay'
import { CalibrationWizard } from './components/CalibrationWizard'
import { useFittedSize } from './hooks/useFittedSize'

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
  const { head, status, message, videoRef } = useHeadTracking()
  const aspectMode = useScene((s) => s.settings.aspectMode)
  const customAspect = useScene((s) => s.settings.customAspect)
  const headSource = useScene((s) => s.settings.headSource)
  const calibrating = useScene((s) => s.calibrating)
  const setCalibrating = useScene((s) => s.setCalibrating)

  const ratio = aspectRatioOf(aspectMode, customAspect)
  const { ref, size } = useFittedSize(ratio)

  if (import.meta.env.DEV) {
    ;(window as unknown as { __head?: unknown }).__head = head
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <Outliner />
        <DropZone>
          <div ref={ref} className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
            <div
              className="relative overflow-hidden rounded"
              style={{ width: size.width, height: size.height }}
            >
              {size.width > 0 && <Studio head={head} />}
              {headSource === 'face' && (
                <TrackingOverlay status={status} message={message} video={videoRef} />
              )}
            </div>
          </div>
        </DropZone>
        <Inspector />
      </div>
      {calibrating && <CalibrationWizard onClose={() => setCalibrating(false)} />}
    </div>
  )
}
