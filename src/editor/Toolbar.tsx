import { useRef, useState } from 'react'
import { useScene, type LightType, MODEL_LIBRARY } from '../store/sceneStore'
import { UI_THEMES } from '../store/uiThemes'

const btn = 'rounded-sm border border-line bg-panel2 px-2 py-1 text-fg hover:border-accent'

export function Toolbar() {
  const gizmoMode = useScene((s) => s.gizmoMode)
  const setGizmoMode = useScene((s) => s.setGizmoMode)
  const editMode = useScene((s) => s.settings.editMode)
  const uiTheme = useScene((s) => s.settings.uiTheme)
  const set = useScene((s) => s.updateSettings)
  const addLight = useScene((s) => s.addLight)
  const addLibraryModel = useScene((s) => s.addLibraryModel)
  const addFromUrl = useScene((s) => s.addFromUrl)
  const exportScene = useScene((s) => s.exportScene)
  const importScene = useScene((s) => s.importScene)
  const reset = useScene((s) => s.reset)
  const setCalibrating = useScene((s) => s.setCalibrating)
  const fileRef = useRef<HTMLInputElement>(null)
  const [urlOpen, setUrlOpen] = useState(false)
  const [url, setUrl] = useState('')

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    f.text().then((t) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(t)
      } catch {
        alert('JSON 파싱 실패')
        return
      }
      try {
        importScene(parsed)
      } catch (err) {
        alert(err instanceof Error ? err.message : '씬을 불러오지 못했습니다')
      }
    })
    e.target.value = ''
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2 text-xs backdrop-blur">
      <span className="flex items-center gap-1.5 font-semibold text-fg">
        <span className="h-2.5 w-[3px] bg-accent" />
        Off-Axis Studio
      </span>

      <div className="mx-2 h-4 w-px bg-line" />

      <button
        className={editMode ? 'rounded-sm bg-accent px-2 py-1 text-ink' : btn}
        onClick={() => set({ editMode: !editMode })}
        title="편집 모드 (OrbitControls). 끄면 off-axis 프리뷰"
      >
        {editMode ? '● Edit mode' : '○ Preview'}
      </button>

      {(['translate', 'rotate', 'scale'] as const).map((m) => (
        <button
          key={m}
          className={`rounded-sm px-2 py-1 ${gizmoMode === m ? 'bg-accent text-ink' : btn}`}
          onClick={() => setGizmoMode(m)}
        >
          {m[0].toUpperCase()}
        </button>
      ))}

      <div className="mx-2 h-4 w-px bg-line" />

      <span className="text-muted">+ Model:</span>
      <select
        className={btn}
        value=""
        onChange={(e) => {
          const m = MODEL_LIBRARY.find((x) => x.name === e.target.value)
          if (m) addLibraryModel(m)
          e.target.value = ''
        }}
      >
        <option value="">라이브러리…</option>
        {MODEL_LIBRARY.map((m) => (
          <option key={m.name} value={m.name}>
            {m.name}
          </option>
        ))}
      </select>
      <button className={btn} onClick={() => setUrlOpen((v) => !v)}>
        URL…
      </button>
      {urlOpen && (
        <span className="flex items-center gap-1">
          <input
            className="w-56 rounded-sm border border-line bg-panel2 px-1.5 py-1 text-fg outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            placeholder="https://…/model.glb"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && url.trim()) {
                addFromUrl(url.trim())
                setUrl('')
                setUrlOpen(false)
              }
            }}
          />
          <button
            className="rounded-sm bg-accent px-2 py-1 text-ink"
            onClick={() => {
              if (url.trim()) {
                addFromUrl(url.trim())
                setUrl('')
                setUrlOpen(false)
              }
            }}
          >
            추가
          </button>
        </span>
      )}

      <div className="mx-2 h-4 w-px bg-line" />

      <span className="text-muted">+ Light:</span>
      {(['ambient', 'directional', 'point', 'spot'] as LightType[]).map((t) => (
        <button key={t} className={btn} onClick={() => addLight(t)}>
          {t}
        </button>
      ))}

      <div className="ml-auto flex items-center gap-2">
        <span className="flex items-center gap-1 rounded-sm border border-line px-1.5 py-1">
          {UI_THEMES.map((t) => (
            <button
              key={t.id}
              className={`h-4 w-4 rounded-full ${
                uiTheme === t.id ? 'ring-2 ring-fg ring-offset-1 ring-offset-panel' : ''
              }`}
              style={{ background: t.swatch }}
              onClick={() => set({ uiTheme: t.id })}
              title={t.label}
            />
          ))}
        </span>
        <button
          className={btn}
          onClick={() => {
            const url = new URL(window.location.href)
            url.searchParams.set('viewer', '1')
            window.open(url.toString(), '_blank', 'noopener,noreferrer')
          }}
          title="에디터 UI 없이 카메라 트래킹 뷰어만 새 브라우저 창/탭에서 열기 (실브라우저 확인용)"
        >
          🔗 뷰어로 새 창에서 열기
        </button>
        <button className={btn} onClick={() => setCalibrating(true)}>
          Calibrate
        </button>
        <button className={btn} onClick={exportScene}>
          Export
        </button>
        <button className={btn} onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <button
          className="rounded-sm border border-line px-2 py-1 text-muted hover:border-accent hover:text-accent"
          onClick={() => confirm('씬을 초기화할까요?') && reset()}
        >
          Reset
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
      </div>
    </div>
  )
}
