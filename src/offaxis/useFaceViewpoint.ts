import { useMemo } from 'react'
import { FaceLandmarker } from '@mediapipe/tasks-vision'
import {
  useVisionViewpoint,
  type VisionStrategy,
  type VisionViewpointOptions,
} from './_useVisionViewpoint'

const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

// eyes + nose tip — enough for a viewpoint anchor and a light overlay
const FACE_VIS_INDICES = [33, 133, 263, 362, 1, 168, 6, 197]

function makeFaceStrategy(): VisionStrategy<FaceLandmarker> {
  return {
    visualKind: 'face',
    loadingMessage: '얼굴 추적 모델 로딩 중…',
    searchingMessage: '얼굴을 찾는 중…',
    create: (fileset) =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
      }),
    read: (lmk, video, ts) => {
      const res = lmk.detectForVideo(video, ts)
      const lm = res.faceLandmarks?.[0]
      if (!lm) return null
      const rEye = lm[33] // right eye outer corner
      const lEye = lm[263] // left eye outer corner
      const nose = lm[1] // nose tip — steadies the anchor against head roll
      return {
        px: (rEye.x + lEye.x + nose.x) / 3,
        py: (rEye.y + lEye.y + nose.y) / 3,
        // inter-ocular distance as the depth proxy
        spread: Math.hypot(lEye.x - rEye.x, lEye.y - rEye.y) || 0.12,
        refSpread: 0.12,
        landmarks: FACE_VIS_INDICES.map((i) => lm[i]).filter(Boolean),
      }
    },
    close: (lmk) => lmk.close(),
  }
}

/** Off-axis viewpoint driven by the webcam face (eye midpoint + IOD depth). */
export function useFaceViewpoint(opts: VisionViewpointOptions) {
  const strategy = useMemo(makeFaceStrategy, [])
  return useVisionViewpoint(strategy, opts)
}
