import { useRef, useState } from 'react'
import { useScene, type LightType, MODEL_LIBRARY } from '../store/sceneStore'

export function Toolbar() {
  const gizmoMode = useScene((s) => s.gizmoMode)
  const setGizmoMode = useScene((s) => s.setGizmoMode)
  const editMode = useScene((s) => s.settings.editMode)
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
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/90 px-3 py-2 text-xs backdrop-blur">
      <span className="font-semibold text-sky-300">Off-Axis Studio</span>

      <div className="mx-2 h-4 w-px bg-slate-700" />

      <button
        className={`rounded px-2 py-1 ${editMode ? 'bg-amber-500 text-black' : 'bg-slate-800 hover:bg-slate-700'}`}
        onClick={() => set({ editMode: !editMode })}
        title="편집 모드 (OrbitControls). 끄면 off-axis 프리뷰"
      >
        {editMode ? '● Edit mode' : '○ Preview'}
      </button>

      {(['translate', 'rotate', 'scale'] as const).map((m) => (
        <button
          key={m}
          className={`rounded px-2 py-1 ${gizmoMode === m ? 'bg-sky-600' : 'bg-slate-800 hover:bg-slate-700'}`}
          onClick={() => setGizmoMode(m)}
        >
          {m[0].toUpperCase()}
        </button>
      ))}

      <div className="mx-2 h-4 w-px bg-slate-700" />

      <span className="text-slate-500">+ Model:</span>
      <select
        className="rounded bg-slate-800 px-1.5 py-1 outline-none"
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
      <button
        className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700"
        onClick={() => setUrlOpen((v) => !v)}
      >
        URL…
      </button>
      {urlOpen && (
        <span className="flex items-center gap-1">
          <input
            className="w-56 rounded bg-slate-800 px-1.5 py-1 outline-none focus:ring-1 focus:ring-sky-500"
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
            className="rounded bg-sky-600 px-2 py-1"
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

      <div className="mx-2 h-4 w-px bg-slate-700" />

      <span className="text-slate-500">+ Light:</span>
      {(['ambient', 'directional', 'point', 'spot'] as LightType[]).map((t) => (
        <button
          key={t}
          className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700"
          onClick={() => addLight(t)}
        >
          {t}
        </button>
      ))}

      <div className="ml-auto flex items-center gap-2">
        <button
          className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700"
          onClick={() => {
            const url = new URL(window.location.href)
            url.searchParams.set('viewer', '1')
            window.open(url.toString(), '_blank', 'noopener,noreferrer')
          }}
          title="에디터 UI 없이 카메라 트래킹 뷰어만 새 브라우저 창/탭에서 열기 (실브라우저 확인용)"
        >
          🔗 뷰어로 새 창에서 열기
        </button>
        <button className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700" onClick={() => setCalibrating(true)}>
          Calibrate
        </button>
        <button className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700" onClick={exportScene}>
          Export
        </button>
        <button className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700" onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <button className="rounded bg-rose-900/70 px-2 py-1 hover:bg-rose-800" onClick={() => confirm('씬을 초기화할까요?') && reset()}>
          Reset
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
      </div>
    </div>
  )
}
