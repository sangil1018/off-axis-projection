import { useEffect, useRef } from 'react'
import type { TrackStatus, HeadSource } from '../hooks/useHeadTracking'
import { useScene } from '../store/sceneStore'

const COLOR: Record<TrackStatus, string> = {
  idle: 'bg-slate-500',
  loading: 'bg-amber-500',
  tracking: 'bg-emerald-500',
  searching: 'bg-amber-500',
  mouse: 'bg-sky-500',
  error: 'bg-rose-500',
}

function label(status: TrackStatus, source: HeadSource): string {
  const noun = source === 'hand' ? '손' : '얼굴'
  switch (status) {
    case 'idle':
      return '대기'
    case 'loading':
      return '모델 로딩'
    case 'tracking':
      return `${noun} 추적중`
    case 'searching':
      return `${noun} 탐색중`
    case 'mouse':
      return '마우스 모드'
    case 'error':
      return '오류'
    default:
      return '대기'
  }
}

export function TrackingOverlay({
  source,
  status,
  message,
  video,
}: {
  source: HeadSource
  status: TrackStatus
  message: string
  video: React.MutableRefObject<HTMLVideoElement | null>
}) {
  const holder = useRef<HTMLDivElement>(null)
  const set = useScene((s) => s.updateSettings)

  useEffect(() => {
    const el = video.current
    const host = holder.current
    if (el && host && !host.contains(el)) {
      el.className = 'h-full w-full -scale-x-100 object-cover'
      host.appendChild(el)
    }
  })

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-20 w-44 overflow-hidden rounded-lg border border-slate-700 bg-slate-900/90 text-xs shadow-lg backdrop-blur">
      <div ref={holder} className="aspect-video w-full bg-black" />
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className={`h-2 w-2 rounded-full ${COLOR[status]}`} />
        <span className="flex-1 truncate">{label(status, source)}</span>
        {status === 'error' && (
          <button
            className="rounded bg-sky-600 px-1.5 py-0.5"
            onClick={() => set({ headSource: 'mouse' })}
          >
            마우스로
          </button>
        )}
      </div>
      {message && (
        <div className="px-2 pb-1.5 text-[10px] leading-tight text-slate-400">{message}</div>
      )}
    </div>
  )
}
