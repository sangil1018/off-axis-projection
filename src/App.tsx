import { useHeadTracking } from './hooks/useHeadTracking'
import { useScene } from './store/sceneStore'
import { Studio } from './scene/Studio'
import { Toolbar } from './editor/Toolbar'
import { Outliner } from './editor/Outliner'
import { Inspector } from './editor/Inspector'
import { DropZone } from './editor/DropZone'
import { TrackingOverlay } from './components/TrackingOverlay'
import { CalibrationWizard } from './components/CalibrationWizard'

function aspectValue(mode: string, custom: number): string | undefined {
  switch (mode) {
    case '16:9':
      return '16 / 9'
    case '4:3':
      return '4 / 3'
    case '1:1':
      return '1 / 1'
    case 'custom':
      return `${custom} / 1`
    default:
      return undefined
  }
}

export default function App() {
  const { head, status, message, videoRef } = useHeadTracking()
  const aspectMode = useScene((s) => s.settings.aspectMode)
  const customAspect = useScene((s) => s.settings.customAspect)
  const headSource = useScene((s) => s.settings.headSource)
  const calibrating = useScene((s) => s.calibrating)
  const setCalibrating = useScene((s) => s.setCalibrating)

  const ar = aspectValue(aspectMode, customAspect)

  return (
    <div className="flex h-full w-full flex-col">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <Outliner />
        <DropZone>
          <div className="flex h-full w-full items-center justify-center bg-black p-2">
            <div
              className="relative h-full w-full max-h-full max-w-full overflow-hidden rounded"
              style={ar ? { aspectRatio: ar, width: 'auto', height: '100%' } : undefined}
            >
              <Studio head={head} />
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
