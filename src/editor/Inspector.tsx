import { useEffect, useRef } from 'react'
import { useScene, type LightType } from '../store/sceneStore'
import type { MicStatus } from '../audio'
import {
  ColorField,
  NumberField,
  NumberSlider,
  Row,
  Section,
  Select,
  Slider,
  Toggle,
  Vec3Field,
} from './controls'

const LIGHT_TYPES: readonly LightType[] = ['ambient', 'directional', 'point', 'spot']
const ASPECTS = ['fill', '16:9', '4:3', '1:1', 'custom'] as const

export function Inspector(props: {
  micLevel: React.MutableRefObject<number>
  micStatus: MicStatus
}) {
  const open = useScene((s) => s.inspectorOpen)
  const opacity = useScene((s) => s.inspectorOpacity)
  const setOpen = useScene((s) => s.setInspectorOpen)
  const setOpacity = useScene((s) => s.setInspectorOpacity)

  if (!open) {
    return (
      <button
        className="absolute right-3 top-3 z-30 rounded-md border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg backdrop-blur hover:bg-slate-800"
        onClick={() => setOpen(true)}
      >
        ⚙ Inspector
      </button>
    )
  }

  return (
    <div
      className="absolute right-0 top-0 z-30 flex h-full w-80 flex-col border-l border-slate-700 shadow-2xl backdrop-blur"
      style={{ backgroundColor: `rgba(15, 23, 42, ${opacity})` }}
    >
      <div className="flex items-center gap-2 border-b border-slate-700/70 px-3 py-2">
        <span className="text-xs font-semibold text-sky-300">Inspector</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
          투명도
          <input
            type="range"
            className="w-20 accent-sky-500"
            min={0.15}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
          />
        </span>
        <button
          className="rounded px-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
          onClick={() => setOpen(false)}
          title="닫기"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <InspectorBody {...props} />
      </div>
    </div>
  )
}

function InspectorBody({
  micLevel,
  micStatus,
}: {
  micLevel: React.MutableRefObject<number>
  micStatus: MicStatus
}) {
  const selectedId = useScene((s) => s.selectedId)
  const object = useScene((s) => s.objects.find((o) => o.id === s.selectedId))
  const light = useScene((s) => s.lights.find((l) => l.id === s.selectedId))
  const updateObject = useScene((s) => s.updateObject)
  const updateLight = useScene((s) => s.updateLight)
  const settings = useScene((s) => s.settings)
  const set = useScene((s) => s.updateSettings)

  return (
    <div className="flex flex-col">
      {object && (
        <Section title={`Object · ${object.name}`}>
          <Row label="Position">
            <Vec3Field value={object.position} onChange={(v) => updateObject(object.id, { position: v })} />
          </Row>
          <Row label="Rotation">
            <Vec3Field value={object.rotation} step={0.05} onChange={(v) => updateObject(object.id, { rotation: v })} />
          </Row>
          <Row label="Scale">
            <Vec3Field value={object.scale} onChange={(v) => updateObject(object.id, { scale: v })} />
          </Row>
          <Row label="Uniform">
            <Slider
              min={0.01}
              max={20}
              step={0.01}
              value={object.scale[0]}
              onChange={(v) => updateObject(object.id, { scale: [v, v, v] })}
            />
          </Row>
          <Row label="Visible">
            <Toggle value={object.visible} onChange={(v) => updateObject(object.id, { visible: v })} />
          </Row>
          <Row label="Cast shadow">
            <Toggle value={object.castShadow} onChange={(v) => updateObject(object.id, { castShadow: v })} />
          </Row>
          <Row label="Recv shadow">
            <Toggle value={object.receiveShadow} onChange={(v) => updateObject(object.id, { receiveShadow: v })} />
          </Row>
          <Row label="Shake (mic)">
            <Toggle value={object.shake} onChange={(v) => updateObject(object.id, { shake: v })} />
          </Row>
          {object.shake && (
            <Row label="Shake amount">
              <Slider
                min={0}
                max={4}
                value={object.shakeIntensity}
                onChange={(v) => updateObject(object.id, { shakeIntensity: v })}
              />
            </Row>
          )}
        </Section>
      )}

      {light && (
        <Section title={`Light · ${light.name}`}>
          <Row label="Type">
            <Select value={light.type} options={LIGHT_TYPES} onChange={(v) => updateLight(light.id, { type: v })} />
          </Row>
          <Row label="Color">
            <ColorField value={light.color} onChange={(v) => updateLight(light.id, { color: v })} />
          </Row>
          <Row label="Intensity">
            <Slider min={0} max={light.type === 'ambient' || light.type === 'directional' ? 5 : 40} value={light.intensity} onChange={(v) => updateLight(light.id, { intensity: v })} />
          </Row>
          {light.type !== 'ambient' && (
            <Row label="Position">
              <Vec3Field value={light.position} onChange={(v) => updateLight(light.id, { position: v })} />
            </Row>
          )}
          {(light.type === 'point' || light.type === 'spot') && (
            <>
              <Row label="Distance">
                <NumberField value={light.distance} min={0} onChange={(v) => updateLight(light.id, { distance: v })} />
              </Row>
              <Row label="Decay">
                <NumberField value={light.decay} min={0} onChange={(v) => updateLight(light.id, { decay: v })} />
              </Row>
            </>
          )}
          {light.type === 'spot' && (
            <>
              <Row label="Angle">
                <Slider min={0.05} max={Math.PI / 2} value={light.angle} onChange={(v) => updateLight(light.id, { angle: v })} />
              </Row>
              <Row label="Penumbra">
                <Slider min={0} max={1} value={light.penumbra} onChange={(v) => updateLight(light.id, { penumbra: v })} />
              </Row>
            </>
          )}
          {light.type !== 'ambient' && (
            <Row label="Cast shadow">
              <Toggle value={light.castShadow} onChange={(v) => updateLight(light.id, { castShadow: v })} />
            </Row>
          )}
        </Section>
      )}

      {!selectedId && (
        <div className="px-3 py-3 text-xs text-slate-600">
          Outliner에서 오브젝트나 라이트를 선택하세요.
        </div>
      )}

      <Section title="Resolution / Ratio">
        <Row label="Res scale">
          <Slider min={0.25} max={2} step={0.05} value={settings.resolutionScale} onChange={(v) => set({ resolutionScale: v })} />
        </Row>
        <Row label="Aspect">
          <Select value={settings.aspectMode} options={ASPECTS} onChange={(v) => set({ aspectMode: v })} />
        </Row>
        {settings.aspectMode === 'custom' && (
          <Row label="Custom W/H">
            <NumberField value={settings.customAspect} step={0.01} min={0.2} onChange={(v) => set({ customAspect: v })} />
          </Row>
        )}
        <Row label="Exposure">
          <Slider min={0.1} max={3} value={settings.exposure} onChange={(v) => set({ exposure: v })} />
        </Row>
        <Row label="Background">
          <ColorField value={settings.background} onChange={(v) => set({ background: v })} />
        </Row>
        <Row label="Env (IBL)">
          <Toggle value={settings.environment} onChange={(v) => set({ environment: v })} />
        </Row>
        <Row label="Shadows">
          <Toggle value={settings.shadows} onChange={(v) => set({ shadows: v })} />
        </Row>
        <Row label="Grid">
          <Toggle value={settings.showGrid} onChange={(v) => set({ showGrid: v })} />
        </Row>
        <Row label="Window frame">
          <Toggle value={settings.showFrame} onChange={(v) => set({ showFrame: v })} />
        </Row>
        <Row label="Room grid (dev)">
          <Toggle value={settings.showRoomGrid} onChange={(v) => set({ showRoomGrid: v })} />
        </Row>
        {settings.showRoomGrid && (
          <Row label="Room depth">
            <Slider min={0.3} max={3} value={settings.roomDepthM} onChange={(v) => set({ roomDepthM: v })} />
          </Row>
        )}
      </Section>

      <Section title="Off-Axis Camera">
        <Row label="Screen W (m)">
          <NumberSlider min={0.05} max={3} step={0.01} value={settings.screenWidthM} onChange={(v) => set({ screenWidthM: v })} />
        </Row>
        <Row label="Screen H (m)">
          <NumberSlider min={0.03} max={2} step={0.01} value={settings.screenHeightM} onChange={(v) => set({ screenHeightM: v })} />
        </Row>
        <Row label="Distance (m)">
          <NumberSlider min={0.1} max={3} step={0.01} value={settings.viewerDistanceM} onChange={(v) => set({ viewerDistanceM: v })} />
        </Row>
        <Row label="Edit FOV (°)">
          <NumberSlider min={10} max={120} step={0.5} decimals={1} value={settings.fovDeg} onChange={(v) => set({ fovDeg: v })} />
        </Row>
        <Row label="Near">
          <NumberSlider min={0.01} max={2} step={0.01} value={settings.near} onChange={(v) => set({ near: v })} />
        </Row>
        <Row label="Far">
          <NumberSlider min={1} max={300} step={1} decimals={0} value={settings.far} onChange={(v) => set({ far: v })} />
        </Row>
        <div className="pt-1 text-[10px] leading-tight text-slate-500">
          Edit FOV은 Edit 모드(오빗 카메라) 화각만 조절합니다 — Preview의 off-axis
          원근은 화면 크기·거리로 계산되어 영향받지 않습니다.
        </div>
      </Section>

      <Section title="Viewpoint Tracking">
        <Row label="Source">
          <Select
            value={settings.headSource}
            options={['face', 'hand', 'mouse'] as const}
            onChange={(v) => set({ headSource: v })}
          />
        </Row>
        <Row label="Strength X">
          <Slider min={0} max={4} value={settings.strengthX} onChange={(v) => set({ strengthX: v })} />
        </Row>
        <Row label="Strength Y">
          <Slider min={0} max={4} value={settings.strengthY} onChange={(v) => set({ strengthY: v })} />
        </Row>
        <Row label="Strength Z">
          <Slider min={0} max={4} value={settings.strengthZ} onChange={(v) => set({ strengthZ: v })} />
        </Row>
        <Row label="Smoothing">
          <Slider min={0.02} max={1} value={settings.smoothing} onChange={(v) => set({ smoothing: v })} />
        </Row>
      </Section>

      <Section title="Microphone → Shake">
        <Row label="Mic input">
          <Toggle value={settings.micEnabled} onChange={(v) => set({ micEnabled: v })} />
        </Row>
        {settings.micEnabled && (
          <>
            <Row label="Level">
              <MicMeter level={micLevel} threshold={settings.micThreshold} status={micStatus} />
            </Row>
            <Row label="Threshold">
              <Slider min={0} max={1} value={settings.micThreshold} onChange={(v) => set({ micThreshold: v })} />
            </Row>
            <Row label="Shake gain">
              <Slider min={0} max={5} value={settings.micGain} onChange={(v) => set({ micGain: v })} />
            </Row>
            <div className="pt-1 text-[10px] leading-tight text-slate-500">
              모델별 <b>Shake (mic)</b>를 켜면 임계값 초과분에 비례해 진동합니다.
            </div>
          </>
        )}
      </Section>
    </div>
  )
}

function MicMeter({
  level,
  threshold,
  status,
}: {
  level: React.MutableRefObject<number>
  threshold: number
  status: MicStatus
}) {
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = barRef.current
      if (el) el.style.width = `${Math.min(100, level.current * 100).toFixed(1)}%`
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [level])
  return (
    <span className="relative block h-3 w-full overflow-hidden rounded bg-slate-800">
      <span
        ref={barRef}
        className={`absolute inset-y-0 left-0 ${status === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}
        style={{ width: '0%' }}
      />
      <span
        className="absolute inset-y-0 w-px bg-amber-400"
        style={{ left: `${Math.min(100, threshold * 100)}%` }}
      />
    </span>
  )
}
