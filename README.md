# Off-Axis Projection Studio

`icurtis1/off-axis-sneaker`의 off-axis(비대칭 절두체) 프로젝션 효과를 재현하고,
그 위에 씬 에디터를 얹은 프로젝트.

## 기능

- **Off-axis 프로젝션**: 물리 스크린 크기를 기준으로 한 generalized perspective
  projection (Kooima 2008). 머리를 움직이면 화면이 "창문 너머 공간"처럼 보임.
- **시점 트래킹**: MediaPipe로 **얼굴 / 손** 중 선택(웹캠), 또는 **마우스**.
  얼굴은 양안, 손은 손바닥 중심 + 손가락 관절 폭을 깊이(z) 추정에 사용.
  웹캠 불가 시 마우스로 자동 전환.
- **glTF / GLB**: 창에 드래그드롭, 또는 툴바에서 라이브러리 모델 / URL 로 추가.
  로드 시 자동으로 크기·위치가 보정됨(auto-fit). TransformControls 기즈모(T/R/S)로
  이동·회전·스케일, Inspector에서 수치 편집. **DRACO · Meshopt · KTX2** 압축 GLB 지원
  (디코더는 `public/decoders/` 에 로컬 번들 — 오프라인 동작).
- **캘리브레이션**: 툴바 `Calibrate` → 모니터 대각선(inch)+화면비 또는 가로·세로(mm),
  시청 거리(cm) 입력 → off-axis 절두체가 물리적으로 정확해짐.
- **라이트**: ambient / directional / point / spot 추가·삭제, 색·강도·위치·그림자·
  스팟 각도/penumbra 등 제어. 선택 시 헬퍼 표시.
- **해상도 / 비율**: resolution scale(0.25–2), aspect(fill·16:9·4:3·1:1·custom),
  exposure, 배경색, IBL, 그림자, 그리드, 윈도우 프레임 토글.
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

`npm run build` — 타입체크 + 프로덕션 빌드.

> 웹캠 얼굴 추적은 `localhost` 또는 `https` 에서만 동작합니다. 권한을 거부하면
> 자동으로 마우스 모드로 전환됩니다.

## 조작

- 상단 **Preview / Edit mode** 토글: Edit는 OrbitControls로 씬 편집, Preview는
  off-axis 카메라 프리뷰.
- 좌측 **Outliner**: 선택 / 표시 토글 / 삭제.
- 우측 **Inspector**: 선택 항목 속성 + 전역 설정.
