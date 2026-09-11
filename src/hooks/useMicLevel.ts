import { useEffect, useRef, useState } from 'react'

export type MicStatus = 'idle' | 'starting' | 'active' | 'error'

/**
 * Live microphone loudness as a stable ref (0..1, roughly perceptual).
 * Attack-fast / release-slow so it drives a believable "shake" envelope.
 */
export function useMicLevel(
  enabled: boolean,
  onFallback?: (reason: string) => void,
) {
  const level = useRef(0)
  const [status, setStatus] = useState<MicStatus>('idle')
  const [message, setMessage] = useState('')

  const fbRef = useRef(onFallback)
  fbRef.current = onFallback

  useEffect(() => {
    if (!enabled) {
      level.current = 0
      setStatus('idle')
      setMessage('')
      return
    }
    let ctx: AudioContext | null = null
    let stream: MediaStream | null = null
    let raf = 0
    let cancelled = false

    ;(async () => {
      try {
        setStatus('starting')
        setMessage('마이크 준비 중…')
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        })
        if (cancelled) return
        ctx = new AudioContext()
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 1024
        analyser.smoothingTimeConstant = 0.2
        src.connect(analyser)
        const buf = new Float32Array(analyser.fftSize)
        setStatus('active')
        setMessage('')

        const tick = () => {
          raf = requestAnimationFrame(tick)
          analyser.getFloatTimeDomainData(buf)
          let sum = 0
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
          const rms = Math.sqrt(sum / buf.length)
          const inst = Math.min(1, rms * 3)
          const k = inst > level.current ? 0.6 : 0.1
          level.current += (inst - level.current) * k
        }
        tick()
      } catch (err) {
        if (cancelled) return
        const reason = err instanceof Error ? err.message : String(err)
        console.warn('[mic] unavailable:', err)
        setStatus('error')
        setMessage('마이크 사용 불가 — ' + reason)
        fbRef.current?.(reason)
      }
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      ctx?.close()
      level.current = 0
    }
  }, [enabled])

  return { level, status, message }
}
