import { useEffect, useRef } from 'react'
import { useScene, type LightType } from '../store/sceneStore'
import type { MicStatus } from '../hooks/useMicLevel'
import {
  ColorField,
  NumberField,
  Row,
  Section,
  Select,
  Slider,
  Toggle,
  Vec3Field,
} from './controls'

const LIGHT_TYPES: readonly LightType[] = ['ambient', 'directional', 'point', 'spot']
const ASPECTS = ['fill', '16:9', '4:3', '1:1', 'custom'] as const

export function Inspector({
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
    <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-slate-800 bg-slate-900/80 backdrop-blur">
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
          <NumberField value={settings.screenWidthM} step={0.01} min={0.05} onChange={(v) => set({ screenWidthM: v })} />
        </Row>
        <Row label="Screen H (m)">
          <NumberField value={settings.screenHeightM} step={0.01} min={0.03} onChange={(v) => set({ screenHeightM: v })} />
        </Row>
        <Row label="Distance (m)">
          <Slider min={0.2} max={2} value={settings.viewerDistanceM} onChange={(v) => set({ viewerDistanceM: v })} />
        </Row>
        <Row label="Near">
          <NumberField value={settings.near} step={0.01} min={0.01} onChange={(v) => set({ near: v })} />
        </Row>
        <Row label="Far">
          <NumberField value={settings.far} step={1} min={1} onChange={(v) => set({ far: v })} />
        </Row>
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
