import { useMemo } from 'react'
import { HandLandmarker } from '@mediapipe/tasks-vision'
import {
  useVisionViewpoint,
  type VisionStrategy,
  type VisionViewpointOptions,
} from './_useVisionViewpoint'

const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

/** MediaPipe hand skeleton edges (21 landmarks). */
export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm base
]

const PALM = [0, 5, 9, 13, 17]

function makeHandStrategy(): VisionStrategy<HandLandmarker> {
  return {
    visualKind: 'hand',
    loadingMessage: '손 추적 모델 로딩 중…',
    searchingMessage: '손을 찾는 중…',
    create: (fileset) =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      }),
    read: (lmk, video, ts) => {
      const res = lmk.detectForVideo(video, ts)
      const lm = res.landmarks?.[0]
      if (!lm) return null
      // viewpoint anchor: palm centroid (stable under a pinch)
      let px = 0
      let py = 0
      for (const i of PALM) {
        px += lm[i].x
        py += lm[i].y
      }
      px /= PALM.length
      py /= PALM.length
      // depth proxy: thumb-tip (4) to index-tip (8) gap — pinch to pull closer
      const thumb = lm[4]
      const index = lm[8]
      const spread = Math.hypot(thumb.x - index.x, thumb.y - index.y) || 0.02
      return { px, py, spread, refSpread: 0.12, landmarks: lm }
    },
    close: (lmk) => lmk.close(),
  }
}

/**
 * Off-axis viewpoint driven by the webcam hand: palm centroid for X/Y, the
 * thumb-tip↔index-tip gap for depth (pinch = move the viewpoint closer).
 * `visualRef` carries all 21 landmarks for skeleton drawing.
 */
export function useHandViewpoint(opts: VisionViewpointOptions) {
  const strategy = useMemo(makeHandStrategy, [])
  return useVisionViewpoint(strategy, opts)
}
