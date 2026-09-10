import { useCallback, useRef, useState } from 'react'
import { useScene } from '../store/sceneStore'

/** Full-window drag target: drop a .glb/.gltf to add it to the scene. */
export function DropZone({ children }: { children: React.ReactNode }) {
  const [over, setOver] = useState(false)
  const depth = useRef(0)
  const addObject = useScene((s) => s.addObject)
  const attachFile = useScene((s) => s.attachFile)

  const handleFiles = useCallback(
    (files: FileList) => {
      for (const file of Array.from(files)) {
        if (!/\.(glb|gltf)$/i.test(file.name)) continue
        const url = URL.createObjectURL(file)
        const existing = useScene
          .getState()
          .objects.find((o) => o.fileName === file.name && !o.url)
        if (existing) attachFile(file.name, url)
        else addObject({ url, fileName: file.name, isBlob: true })
      }
    },
    [addObject, attachFile],
  )

  return (
    <div
      className="relative flex-1"
      onDragEnter={(e) => {
        e.preventDefault()
        depth.current++
        setOver(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current--
        if (depth.current <= 0) setOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        depth.current = 0
        setOver(false)
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
      }}
    >
      {children}
      {over && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-4 border-dashed border-sky-400/70 bg-sky-500/10 text-lg font-semibold text-sky-200">
          glTF / GLB 파일 놓기
        </div>
      )}
    </div>
  )
}
