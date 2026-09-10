import type { ReactNode } from 'react'
import type { Vec3 } from '../store/sceneStore'

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 py-1 text-xs">
      <span className="w-24 shrink-0 text-slate-400">{label}</span>
      <span className="flex flex-1 items-center gap-1">{children}</span>
    </label>
  )
}

export function NumberField({
  value,
  onChange,
  step = 0.01,
  min,
  max,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
}) {
  return (
    <input
      type="number"
      className="w-full rounded bg-slate-800 px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-sky-500"
      value={Number.isFinite(value) ? +value.toFixed(4) : 0}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  )
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 0.01,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <span className="flex flex-1 items-center gap-2">
      <input
        type="range"
        className="flex-1 accent-sky-500"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="w-10 text-right tabular-nums text-slate-300">
        {value.toFixed(2)}
      </span>
    </span>
  )
}

export function Vec3Field({
  value,
  onChange,
  step = 0.05,
}: {
  value: Vec3
  onChange: (v: Vec3) => void
  step?: number
}) {
  return (
    <span className="flex flex-1 gap-1">
      {(['x', 'y', 'z'] as const).map((axis, i) => (
        <input
          key={axis}
          type="number"
          step={step}
          className="w-full rounded bg-slate-800 px-1 py-1 text-xs outline-none focus:ring-1 focus:ring-sky-500"
          value={+value[i].toFixed(4)}
          onChange={(e) => {
            const next = [...value] as Vec3
            next[i] = parseFloat(e.target.value) || 0
            onChange(next)
          }}
        />
      ))}
    </span>
  )
}

export function ColorField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="color"
      className="h-6 w-10 rounded bg-transparent"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function Toggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 accent-sky-500"
      checked={value}
      onChange={(e) => onChange(e.target.checked)}
    />
  )
}

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly T[]
  onChange: (v: T) => void
}) {
  return (
    <select
      className="w-full rounded bg-slate-800 px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-sky-500"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-slate-800 px-3 py-2">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      {children}
    </div>
  )
}
