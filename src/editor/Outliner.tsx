import { useScene } from '../store/sceneStore'

export function Outliner() {
  const objects = useScene((s) => s.objects)
  const lights = useScene((s) => s.lights)
  const objectErrors = useScene((s) => s.objectErrors)
  const selectedId = useScene((s) => s.selectedId)
  const select = useScene((s) => s.select)
  const removeObject = useScene((s) => s.removeObject)
  const removeLight = useScene((s) => s.removeLight)
  const updateObject = useScene((s) => s.updateObject)
  const updateLight = useScene((s) => s.updateLight)

  return (
    <div className="flex w-56 shrink-0 flex-col border-r border-line bg-panel/80 text-xs backdrop-blur">
      <div className="flex items-center gap-1.5 border-b border-line px-3 py-2 text-[11px] font-medium text-muted">
        <span className="h-2.5 w-[3px] bg-accent" />
        Objects ({objects.length})
      </div>
      <div className="max-h-56 overflow-y-auto">
        {objects.length === 0 && (
          <div className="px-3 py-2 text-muted">GLB 파일을 드래그드롭</div>
        )}
        {objects.map((o) => (
          <Item
            key={o.id}
            name={
              o.name +
              (objectErrors[o.id]
                ? ' (불러오기 실패)'
                : o.url
                  ? ''
                  : ' (파일 없음)')
            }
            error={!!objectErrors[o.id]}
            active={selectedId === o.id}
            visible={o.visible}
            onSelect={() => select(o.id)}
            onToggle={() => updateObject(o.id, { visible: !o.visible })}
            onRemove={() => removeObject(o.id)}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 border-y border-line px-3 py-2 text-[11px] font-medium text-muted">
        <span className="h-2.5 w-[3px] bg-accent" />
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
  error,
  onSelect,
  onToggle,
  onRemove,
}: {
  name: string
  active: boolean
  visible: boolean
  error?: boolean
  onSelect: () => void
  onToggle: () => void
  onRemove: () => void
}) {
  return (
    <div
      className={`group flex items-center gap-1 border-l-2 px-2 py-1 ${
        active ? 'border-accent bg-panel2 text-fg' : 'border-transparent hover:bg-panel2/60'
      }`}
    >
      <button
        className="w-5 text-center text-muted hover:text-fg"
        onClick={onToggle}
        title="표시 토글"
      >
        {visible ? '●' : '○'}
      </button>
      <button
        className={`flex-1 truncate text-left ${error ? 'text-rose-400' : ''}`}
        onClick={onSelect}
      >
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
