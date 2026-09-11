import { useEffect, useRef } from 'react'
import { HAND_CONNECTIONS } from './useHandViewpoint'
import type { TrackerVisual, TrackStatus, ViewpointSource } from './types'

const DOT: Record<TrackStatus, string> = {
  idle: '#64748b',
  loading: '#f59e0b',
  tracking: '#10b981',
  searching: '#f59e0b',
  mouse: '#0ea5e9',
  error: '#f43f5e',
}

function label(status: TrackStatus, source: ViewpointSource): string {
  const noun = source === 'hand' ? '손' : '얼굴'
  switch (status) {
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

export type TrackerPreviewProps = {
  source: ViewpointSource
  status: TrackStatus
  message?: string
  videoRef: React.MutableRefObject<HTMLVideoElement | null>
  visualRef: React.MutableRefObject<TrackerVisual>
  /** shown as a button while status === 'error' */
  onUsePointer?: () => void
  className?: string
}

/**
 * Self-contained webcam preview for the face / hand viewpoint sources, with a
 * live landmark overlay (full skeleton for the hand). DOM component — render it
 * anywhere outside the `<Canvas>`.
 *
 * Note: the default chrome (border/background/status dot/etc.) is styled with
 * Tailwind utility classes, so it renders unstyled in a project without
 * Tailwind. Pass `className` to fully replace it, or copy this component and
 * inline the styles if you need it Tailwind-free.
 */
export function TrackerPreview({
  source,
  status,
  message,
  videoRef,
  visualRef,
  onUsePointer,
  className,
}: TrackerPreviewProps) {
  const holderRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // mount the shared <video> element into this preview
  useEffect(() => {
    const host = holderRef.current
    const el = videoRef.current
    if (el && host && !host.contains(el)) {
      el.className = 'absolute inset-0 h-full w-full -scale-x-100 object-cover'
      host.appendChild(el)
    }
  })

  // draw the landmark overlay every frame
  useEffect(() => {
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const cv = canvasRef.current
      const host = holderRef.current
      if (!cv || !host) return
      const w = host.clientWidth
      const h = host.clientHeight
      if (cv.width !== w || cv.height !== h) {
        cv.width = w
        cv.height = h
      }
      const ctx = cv.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)
      const vis = visualRef.current
      if (!vis) return
      const mx = (x: number) => (1 - x) * w // mirror to match the flipped video
      const my = (y: number) => y * h

      if (vis.kind === 'hand') {
        ctx.strokeStyle = 'rgba(56,189,248,0.9)'
        ctx.lineWidth = 2
        for (const [a, b] of HAND_CONNECTIONS) {
          const pa = vis.landmarks[a]
          const pb = vis.landmarks[b]
          if (!pa || !pb) continue
          ctx.beginPath()
          ctx.moveTo(mx(pa.x), my(pa.y))
          ctx.lineTo(mx(pb.x), my(pb.y))
          ctx.stroke()
        }
        // thumb tip (4) + index tip (8) — the depth pair
        vis.landmarks.forEach((p, i) => {
          const tip = i === 4 || i === 8
          ctx.fillStyle = tip ? '#fbbf24' : '#e2e8f0'
          ctx.beginPath()
          ctx.arc(mx(p.x), my(p.y), tip ? 3.5 : 2, 0, Math.PI * 2)
          ctx.fill()
        })
        const t = vis.landmarks[4]
        const idx = vis.landmarks[8]
        if (t && idx) {
          ctx.strokeStyle = '#fbbf24'
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(mx(t.x), my(t.y))
          ctx.lineTo(mx(idx.x), my(idx.y))
          ctx.stroke()
          ctx.setLineDash([])
        }
      } else {
        ctx.fillStyle = '#38bdf8'
        for (const p of vis.landmarks) {
          ctx.beginPath()
          ctx.arc(mx(p.x), my(p.y), 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [visualRef])

  return (
    <div
      className={
        className ??
        'pointer-events-auto absolute bottom-3 left-3 z-20 w-44 overflow-hidden rounded-lg border border-slate-700 bg-slate-900/90 text-xs shadow-lg backdrop-blur'
      }
    >
      <div ref={holderRef} className="relative aspect-video w-full bg-black">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: DOT[status] }}
        />
        <span className="flex-1 truncate">{label(status, source)}</span>
        {status === 'error' && onUsePointer && (
          <button className="rounded bg-sky-600 px-1.5 py-0.5" onClick={onUsePointer}>
            마우스로
          </button>
        )}
      </div>
      {message && (
        <div className="px-2 pb-1.5 text-[10px] leading-tight text-slate-400">
          {message}
        </div>
      )}
    </div>
  )
}
