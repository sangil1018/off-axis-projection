import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Watches an element and returns the largest width/height with the given
 * aspect ratio (w/h) that fits inside it — i.e. letterboxed both directions.
 * Pass ratio = null to just fill the container.
 */
export function useFittedSize(ratio: number | null) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const compute = () => {
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (ratio == null) {
        setSize({ width: cw, height: ch })
        return
      }
      let w = cw
      let h = w / ratio
      if (h > ch) {
        h = ch
        w = h * ratio
      }
      setSize({ width: Math.round(w), height: Math.round(h) })
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ratio])

  return { ref, size }
}
