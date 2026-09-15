import { useState } from 'react'
import { useScene } from '../store/sceneStore'
import { deriveFovDeg } from '../store/settingsSlice'

const ASPECTS: Record<string, number> = {
  '16:9': 16 / 9,
  '16:10': 16 / 10,
  '21:9': 21 / 9,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
}

/** Guided physical-screen calibration for the off-axis frustum. */
export function CalibrationWizard({ onClose }: { onClose: () => void }) {
  const settings = useScene((s) => s.settings)
  const set = useScene((s) => s.updateSettings)

  const [mode, setMode] = useState<'diagonal' | 'manual'>('diagonal')
  const [diagIn, setDiagIn] = useState(24)
  const [aspect, setAspect] = useState('16:9')
  const [widthMm, setWidthMm] = useState(Math.round(settings.screenWidthM * 1000))
  const [heightMm, setHeightMm] = useState(Math.round(settings.screenHeightM * 1000))
  const [distCm, setDistCm] = useState(Math.round(settings.viewerDistanceM * 100))

  let w = settings.screenWidthM
  let h = settings.screenHeightM
  if (mode === 'diagonal') {
    const ar = ASPECTS[aspect] ?? 16 / 9
    const diagM = diagIn * 0.0254
    h = diagM / Math.sqrt(ar * ar + 1)
    w = h * ar
  } else {
    w = widthMm / 1000
    h = heightMm / 1000
  }

  const apply = () => {
    const viewerDistanceM = +(distCm / 100).toFixed(3)
    const screenHeightM = +h.toFixed(4)
    set({
      screenWidthM: +w.toFixed(4),
      screenHeightM,
      viewerDistanceM,
      // keep the Edit-mode camera framed like this new physical setup
      fovDeg: +deriveFovDeg(screenHeightM, viewerDistanceM).toFixed(2),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-96 rounded-sm border border-line bg-panel p-4 text-sm text-fg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2 text-base font-semibold">
          <span className="h-3 w-[3px] bg-accent" />
          스크린 캘리브레이션
        </div>
        <p className="mb-3 text-xs text-muted">
          모니터의 실제 크기와 시청 거리를 입력하면 off-axis 원근이 물리적으로 정확해집니다.
        </p>

        <div className="mb-3 flex gap-2 text-xs">
          <button
            className={`rounded-sm px-2 py-1 ${
              mode === 'diagonal' ? 'bg-accent text-ink' : 'border border-line bg-panel2'
            }`}
            onClick={() => setMode('diagonal')}
          >
            대각선 인치
          </button>
          <button
            className={`rounded-sm px-2 py-1 ${
              mode === 'manual' ? 'bg-accent text-ink' : 'border border-line bg-panel2'
            }`}
            onClick={() => setMode('manual')}
          >
            가로·세로 직접
          </button>
        </div>

        {mode === 'diagonal' ? (
          <div className="space-y-2">
            <Field label="대각선 (inch)">
              <input type="number" className="fld" value={diagIn} step={0.5} onChange={(e) => setDiagIn(+e.target.value || 0)} />
            </Field>
            <Field label="화면비">
              <select className="fld" value={aspect} onChange={(e) => setAspect(e.target.value)}>
                {Object.keys(ASPECTS).map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
          </div>
        ) : (
          <div className="space-y-2">
            <Field label="가로 (mm)">
              <input type="number" className="fld" value={widthMm} onChange={(e) => setWidthMm(+e.target.value || 0)} />
            </Field>
            <Field label="세로 (mm)">
              <input type="number" className="fld" value={heightMm} onChange={(e) => setHeightMm(+e.target.value || 0)} />
            </Field>
          </div>
        )}

        <div className="mt-2 space-y-2">
          <Field label="시청 거리 (cm)">
            <input type="number" className="fld" value={distCm} onChange={(e) => setDistCm(+e.target.value || 0)} />
          </Field>
        </div>

        <div className="mt-3 space-y-0.5 rounded-sm border border-line bg-panel2 px-3 py-2 text-xs text-muted">
          <div>
            계산된 스크린:{' '}
            <b className="tabular-nums text-fg">
              {(w * 100).toFixed(1)} × {(h * 100).toFixed(1)} cm
            </b>
          </div>
          <div>
            거리: <b className="tabular-nums text-fg">{distCm} cm</b>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-sm border border-line px-3 py-1.5 text-muted hover:text-fg" onClick={onClose}>
            취소
          </button>
          <button className="rounded-sm bg-accent px-3 py-1.5 font-medium text-ink" onClick={apply}>
            적용
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs text-muted">{label}</span>
      {children}
    </label>
  )
}
