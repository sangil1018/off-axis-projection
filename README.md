# Off-Axis Projection Studio

[![CI](https://github.com/sangil1018/off-axis-projection/actions/workflows/ci.yml/badge.svg)](https://github.com/sangil1018/off-axis-projection/actions/workflows/ci.yml)

`icurtis1/off-axis-sneaker`의 off-axis(비대칭 절두체) 프로젝션 효과를 재현하고,
그 위에 씬 에디터를 얹은 프로젝트.

## 기능

- **Off-axis 프로젝션**: 물리 스크린 크기를 기준으로 한 generalized perspective
  projection (Kooima 2008). 머리를 움직이면 화면이 "창문 너머 공간"처럼 보임.
- **시점 트래킹**: MediaPipe로 **얼굴 / 손** 중 선택(웹캠), 또는 **마우스**.
  얼굴은 양안 중점 + 양안 간 거리(깊이), 손은 손바닥 중심 + **엄지·검지 끝 간격**(깊이,
  모을수록 가까이). 손은 21개 랜드마크 전체를 검출해 프리뷰에 스켈레톤을 그림.
  웹캠 불가 시 마우스로 자동 전환.

### 재사용 가능한 `src/offaxis/` 모듈

off-axis 렌더링·트래킹은 **스토어 의존성이 전혀 없는** 독립 모듈로 분리돼 있어
다른 R3F 프로젝트에 그대로 붙여 쓸 수 있습니다.

```tsx
import { useViewpoint, OffAxisCamera, WindowFrame, TrackerPreview } from './offaxis'

const { viewpoint, status, message, videoRef, visualRef } = useViewpoint({
  source,                                   // 'face' | 'hand' | 'mouse'
  screen: { widthM, heightM, distanceM },
  tracking: { strengthX, strengthY, strengthZ, smoothing },
  onFallback: () => setSource('mouse'),
})

// 캔버스 밖
<TrackerPreview {...{ source, status, message, videoRef, visualRef }} />

// <Canvas camera={{ position:[0,0,distanceM] }}> 안
<OffAxisCamera eye={viewpoint} screen={screen} enabled={!editMode} />
<WindowFrame widthM={widthM} heightM={heightM} />
<RoomGrid widthM={widthM} heightM={heightM} depthM={1.2} />  {/* 개발용 반투명 룸 그리드 */}
```

- `useFaceViewpoint` / `useHandViewpoint` / `usePointerViewpoint` — 개별 훅으로도 사용 가능
- `computeOffAxis()` — 순수 함수 (Kooima projection matrix), `src/offaxis/projection.test.ts`로 검증됨
- `ViewpointSmoother` — EMA 스무더

마이크 관련(`useMicLevel`, `MicContext`, `useMicShake`)도 같은 방식으로
`src/audio/`에 스토어 의존성 없이 분리돼 있습니다.
- **glTF / GLB**: 창에 드래그드롭, 또는 툴바에서 라이브러리 모델 / URL 로 추가.
  로드 시 자동으로 크기·위치가 보정됨(auto-fit). TransformControls 기즈모(T/R/S)로
  이동·회전·스케일, Inspector에서 수치 편집. **DRACO · Meshopt · KTX2** 압축 GLB 지원
  (디코더는 `public/decoders/` 에 로컬 번들 — 오프라인 동작).
- **캘리브레이션**: 툴바 `Calibrate` → 모니터 대각선(inch)+화면비 또는 가로·세로(mm),
  시청 거리(cm) 입력 → off-axis 절두체가 물리적으로 정확해짐.
- **선택 UX**: 오브젝트 호버 시 옅은 와이어박스, 선택 시 굵은 시안 테두리(항상 위에
  표시) + 뷰 안의 이동/회전/크기 매니퓰레이터(Preview·Edit 모드 공통). 드래그 값은
  Inspector와 양방향 연동.
- **Inspector**: 기본 접힘(⚙ 버튼) → 열면 우측 반투명 오버레이. 헤더의 투명도
  슬라이더로 패널 투명도 조절.
- **라이트**: ambient / directional / point / spot 추가·삭제, 색·강도·위치·그림자·
  스팟 각도/penumbra 등 제어. 선택 시 헬퍼 표시.
- **해상도 / 비율**: resolution scale(0.25–2), aspect(fill·16:9·4:3·1:1·custom),
  exposure, 배경색, IBL, 그림자, 그리드, 윈도우 프레임 토글.
- **뷰 공간 룸 그리드**: 화면 평면을 앞면으로 하는 반투명 그리드 박스(바닥·천장·좌우·
  뒷벽). 시점이 움직이면 원근이 함께 변형됨. 개발 빌드 기본 ON / 프로덕션 기본 OFF,
  Inspector `Room grid (dev)` 토글 + 깊이 슬라이더.
- **마이크 → 셰이크**: Inspector `Microphone → Shake` 에서 마이크 입력 ON + 임계값·
  게인 설정. 모델별 `Shake (mic)` 를 켜면 마이크 음량이 **임계값을 넘는 만큼에 비례해**
  해당 모델이 진동(위치+회전). 마이크 거부 시 자동 OFF.
- **환경광(IBL)**: Lightformer 기반 절차적 스튜디오 환경맵 — 외부 HDR 다운로드 없이
  오프라인에서 동작.
- **저장**: localStorage 자동 저장 + JSON export / import. (드롭한 GLB는 blob이라
  새로고침/임포트 후 같은 파일을 다시 드롭하면 파일명으로 재연결됨. 라이브러리·URL
  모델은 경로가 저장돼 완전 복원됨.)

## 개발

```bash
npm install
npm run dev
```

`src/store/`는 zustand slices 패턴으로 구성됩니다: `objectsSlice` / `lightsSlice` /
`settingsSlice` / `uiSlice`를 `sceneStore.ts`가 결합하고, 여러 슬라이스에 걸친
액션(reset/export/import)만 그 파일에 남아있습니다. 외부에서는 여전히
`useScene()` 훅 하나로 씁니다.

`npm run build` — 타입체크 + 프로덕션 빌드. `npm run lint` — ESLint. `npm run test`
— Vitest(`src/offaxis/projection.test.ts`가 off-axis 절두체 수식을 검증).
`npm run typecheck`.

CI(`.github/workflows/ci.yml`)가 push/PR마다 lint·typecheck·test·build·프로덕션
의존성 `npm audit`을 실행합니다.

프로덕션 빌드에만 Content-Security-Policy `<meta>`가 주입됩니다(`vite.config.ts`
의 `cspMetaPlugin`) — 개발 서버(HMR 웹소켓)는 영향받지 않습니다.

> 웹캠 얼굴 추적은 `localhost` 또는 `https` 에서만 동작합니다. 권한을 거부하면
> 자동으로 마우스 모드로 전환됩니다.

## 조작

- 상단 **Preview / Edit mode** 토글: Edit는 OrbitControls로 씬 편집, Preview는
  off-axis 카메라 프리뷰.
- 좌측 **Outliner**: 선택 / 표시 토글 / 삭제.
- 우측 **Inspector**: 선택 항목 속성 + 전역 설정.
