import React from 'react'
import { useEnvironment } from '../contexts/EnvironmentContext.tsx'
import { ENV_OPTIONS_ORDERED } from '../environments/environments'

// Simple prototype UI to tweak current environment spec at runtime.
// This merges shallow overrides on top of the selected environment.
export default function EnvironmentFactoryPage() {
  const { env, envId, setEnvId, overrides, setOverrides, clearOverrides } = useEnvironment()

  const update = (path: string, value: any) => {
    const segs = path.split('.')
    const next: any = { ...(overrides || {}) }
    let cursor = next
    for (let i = 0; i < segs.length - 1; i++) {
      const k = segs[i]
      cursor[k] = { ...(cursor[k] || {}) }
      cursor = cursor[k]
    }
    cursor[segs[segs.length - 1]] = value
    setOverrides(next)
  }

  const NumberInput = ({ label, path, step = 0.01, min, max }: { label: string; path: string; step?: number; min?: number; max?: number }) => {
    // Resolve value from overrides first, then env as fallback
    const segs = path.split('.')
    let cur: any = overrides as any
    for (const s of segs) cur = cur?.[s]
    if (cur === undefined) {
      cur = env as any
      for (const s of segs) cur = cur?.[s]
    }
    const v = typeof cur === 'number' ? cur : 0
    return (
      <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, margin:'6px 0' }}>
        <span style={{ width: 160, opacity: 0.9 }}>{label}</span>
        <input type="range" value={v} step={step} min={min as any} max={max as any} onChange={e=> update(path, parseFloat(e.target.value))} style={{ flex: 1 }} />
        <input type="number" value={v} step={step} onChange={e=> update(path, parseFloat(e.target.value))} style={{ width: 86 }} />
      </label>
    )
  }

  const ColorInput = ({ label, path }: { label: string; path: string }) => {
    const segs = path.split('.')
    let cur: any = overrides as any
    for (const s of segs) cur = cur?.[s]
    if (cur === undefined) {
      cur = env as any
      for (const s of segs) cur = cur?.[s]
    }
    const v = typeof cur === 'string' ? cur : '#ffffff'
    return (
      <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, margin:'6px 0' }}>
        <span style={{ width: 160, opacity: 0.9 }}>{label}</span>
        <input type="color" value={v} onChange={e=> update(path, e.target.value)} />
        <input type="text" value={v} onChange={e=> update(path, e.target.value)} style={{ width: 120 }} />
      </label>
    )
  }

  return (
    <div style={{ padding: 16, color:'#fff' }}>
      <h2 style={{ marginTop: 0 }}>Environment Factory</h2>
      <p style={{ marginTop:0, fontSize:12, opacity:0.85 }}>Fine-tune the active environment. Export JSON to integrate presets.</p>
      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
        <Panel title="Selection & Export">
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
            <span style={{ width: 120, opacity: 0.9 }}>Environment</span>
            <EnvSelect value={envId as any} onChange={(v)=> setEnvId(v as any)} />
          </label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
            <button className="button" onClick={clearOverrides}>Clear Overrides</button>
            <button className="button" onClick={() => {
              const cleaned = exportCurrent(env, overrides)
              const blob = new Blob([JSON.stringify(cleaned, null, 2)], { type:'application/json' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `${env.id}_prototype.json`
              a.click()
            }}>Export JSON</button>
            <button className="button" onClick={() => {
              navigator.clipboard?.writeText(JSON.stringify(exportCurrent(env, overrides), null, 2))
            }}>Copy JSON</button>
          </div>
        </Panel>

        <Panel title="Lighting & Tone">
          <NumberInput label="Exposure" path="exposure" step={0.01} min={0} max={2} />
          <ColorInput label="Ambient Color" path="ambient.color" />
          <NumberInput label="Ambient Intensity" path="ambient.intensity" step={0.01} min={0} max={2} />
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, margin:'6px 0' }}>
            <span style={{ width: 160, opacity: 0.9 }}>Background (HDRI)</span>
            <input type="checkbox" checked={!!(overrides.background ?? env.background)} onChange={e=> update('background', e.target.checked)} />
          </label>
        </Panel>

        <Panel title="Fog">
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, margin:'6px 0' }}>
            <span style={{ width: 160, opacity: 0.9 }}>Enabled</span>
            <input type="checkbox" checked={!!(overrides.fog?.enabled ?? env.fog?.enabled)} onChange={e=> update('fog.enabled', e.target.checked)} />
          </label>
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, margin:'6px 0' }}>
            <span style={{ width: 160, opacity: 0.9 }}>Type</span>
            <select className="themed-select" value={(overrides.fog?.type ?? env.fog?.type) || 'linear'} onChange={e=> update('fog.type', e.target.value)}>
              <option value="linear">linear</option>
              <option value="exp2">exp2</option>
            </select>
          </label>
          <ColorInput label="Color" path="fog.color" />
          <NumberInput label="Near" path="fog.near" step={1} min={0} max={800} />
          <NumberInput label="Far" path="fog.far" step={1} min={0} max={1600} />
          <NumberInput label="Density" path="fog.density" step={0.0005} min={0} max={0.05} />
          <div style={{marginTop:6,fontSize:11,opacity:0.75}}>TopDown/Static camera visibility can suffer when fog distance is low. Raise far or disable for clarity.</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:6 }}>
            <button className="button" onClick={() => {
              const t = (overrides.fog?.type ?? env.fog?.type) || 'linear'
              if (t === 'linear') {
                update('fog.near', Math.min( (overrides.fog?.near ?? env.fog?.near ?? 60), 120))
                update('fog.far', Math.max( (overrides.fog?.far ?? env.fog?.far ?? 160), 300))
              } else {
                update('fog.density', Math.max(0, (overrides.fog?.density ?? env.fog?.density ?? 0.006) * 0.5))
              }
            }}>Optimize for TopDown</button>
            <button className="button" onClick={() => update('fog.enabled', false)}>Disable Fog</button>
          </div>
        </Panel>

        <Panel title="Arena Shader Colors">
          <ColorInput label="Base" path="arenaColors.base" />
          <ColorInput label="Veins" path="arenaColors.veins" />
          <ColorInput label="Telegraph" path="arenaColors.telegraph" />
        </Panel>

        <Panel title="Advanced Preview">
          <textarea
            style={{width:'100%',minHeight:160, background:'rgba(0,0,0,0.55)', color:'#eafff6', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, padding:8, fontSize:12}}
            readOnly
            value={JSON.stringify(exportCurrent(env, overrides), null, 2)}
          />
          <div style={{fontSize:11,opacity:0.7,marginTop:6}}>Read-only preview. Use Export/Copy above to persist.</div>
        </Panel>
      </div>

      <div style={{ marginTop:16, opacity:0.85, fontSize:12 }}>
        Merged Spec (runtime):
        <pre style={{marginTop:8, background:'rgba(0,0,0,0.4)', padding:8, borderRadius:8, maxHeight:240, overflow:'auto', fontSize:11}}>{JSON.stringify(env, null, 2)}</pre>
      </div>
    </div>
  )
}

function EnvSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="themed-select" value={value} onChange={e=> onChange(e.target.value)}>
      {ENV_OPTIONS_ORDERED.map((o: any) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth:320, maxWidth:520, background:'rgba(0,0,0,0.35)', padding:12, borderRadius:8, border:'1px solid rgba(255,255,255,0.08)' }}>
      <h3 style={{ marginTop:0, color:'#34d399' }}>{title}</h3>
      {children}
    </div>
  )
}

function exportCurrent(env: any, overrides: any) {
  return {
    ...env,
    ...(overrides || {}),
    fog: overrides?.fog ? { ...(env.fog || {}), ...overrides.fog } : env.fog,
    ambient: overrides?.ambient ? { ...(env.ambient || {}), ...overrides.ambient } : env.ambient,
    arenaColors: overrides?.arenaColors ? { ...(env.arenaColors || {}), ...overrides.arenaColors } : env.arenaColors,
  }
}
