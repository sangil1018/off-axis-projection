import { useScene } from '../store/sceneStore'

export function Outliner() {
  const objects = useScene((s) => s.objects)
  const lights = useScene((s) => s.lights)
  const selectedId = useScene((s) => s.selectedId)
  const select = useScene((s) => s.select)
  const removeObject = useScene((s) => s.removeObject)
  const removeLight = useScene((s) => s.removeLight)
  const updateObject = useScene((s) => s.updateObject)
  const updateLight = useScene((s) => s.updateLight)

  return (
    <div className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900/80 text-xs backdrop-blur">
      <div className="border-b border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Objects ({objects.length})
      </div>
      <div className="max-h-56 overflow-y-auto">
        {objects.length === 0 && (
          <div className="px-3 py-2 text-slate-600">GLB 파일을 드래그드롭</div>
        )}
        {objects.map((o) => (
          <Item
            key={o.id}
            name={o.name + (o.url ? '' : ' (파일 없음)')}
            active={selectedId === o.id}
            visible={o.visible}
            onSelect={() => select(o.id)}
            onToggle={() => updateObject(o.id, { visible: !o.visible })}
            onRemove={() => removeObject(o.id)}
          />
        ))}
      </div>
      <div className="border-y border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Lights ({lights.length})
      </div>
      <div className="flex-1 overflow-y-auto">
        {lights.map((l) => (
          <Item
            key={l.id}
            name={`${l.name} · ${l.type}`}
            active={selectedId === l.id}
            visible={l.visible}
            onSelect={() => select(l.id)}
            onToggle={() => updateLight(l.id, { visible: !l.visible })}
            onRemove={() => removeLight(l.id)}
          />
        ))}
      </div>
    </div>
  )
}

function Item({
  name,
  active,
  visible,
  onSelect,
  onToggle,
  onRemove,
}: {
  name: string
  active: boolean
  visible: boolean
  onSelect: () => void
  onToggle: () => void
  onRemove: () => void
}) {
  return (
    <div
      className={`group flex items-center gap-1 px-2 py-1 ${
        active ? 'bg-sky-600/30 text-sky-200' : 'hover:bg-slate-800/60'
      }`}
    >
      <button
        className="w-5 text-center text-slate-500 hover:text-slate-200"
        onClick={onToggle}
        title="표시 토글"
      >
        {visible ? '●' : '○'}
      </button>
      <button className="flex-1 truncate text-left" onClick={onSelect}>
        {name}
      </button>
      <button
        className="hidden text-rose-400 hover:text-rose-300 group-hover:block"
        onClick={onRemove}
        title="삭제"
      >
        ✕
      </button>
    </div>
  )
}
