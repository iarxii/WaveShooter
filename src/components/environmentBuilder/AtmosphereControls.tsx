import React from 'react'
import { LayerControlProps, AtmosphereConfig } from '../../types/environmentBuilder'

export function AtmosphereControls({ config, onChange, disabled }: LayerControlProps<AtmosphereConfig>) {
  const handleParticlesChange = (particles: AtmosphereConfig['particles']) => {
    onChange({ ...config, particles })
  }

  const handleEffectsChange = (effects: AtmosphereConfig['effects']) => {
    onChange({ ...config, effects })
  }

  return (
    <div className="layer-controls atmosphere-controls">
      <h4>Atmosphere Layer</h4>

      <div className="subsection">
        <h5>Particles</h5>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.particles.dust.enabled}
              onChange={(e) => handleParticlesChange({
                ...config.particles,
                dust: { ...config.particles.dust, enabled: e.target.checked }
              })}
              disabled={disabled}
            />
            Dust
          </label>
        </div>
        {config.particles.dust.enabled && (
          <>
            <div className="control-group">
              <label>Density: {config.particles.dust.density.toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.particles.dust.density}
                onChange={(e) => handleParticlesChange({
                  ...config.particles,
                  dust: { ...config.particles.dust, density: parseFloat(e.target.value) }
                })}
                disabled={disabled}
              />
            </div>
            <div className="control-group">
              <label>Color:</label>
              <input
                type="color"
                value={config.particles.dust.color}
                onChange={(e) => handleParticlesChange({
                  ...config.particles,
                  dust: { ...config.particles.dust, color: e.target.value }
                })}
                disabled={disabled}
              />
            </div>
          </>
        )}

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.particles.spores.enabled}
              onChange={(e) => handleParticlesChange({
                ...config.particles,
                spores: { ...config.particles.spores, enabled: e.target.checked }
              })}
              disabled={disabled}
            />
            Spores
          </label>
        </div>
        {config.particles.spores.enabled && (
          <>
            <div className="control-group">
              <label>Density: {config.particles.spores.density.toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.particles.spores.density}
                onChange={(e) => handleParticlesChange({
                  ...config.particles,
                  spores: { ...config.particles.spores, density: parseFloat(e.target.value) }
                })}
                disabled={disabled}
              />
            </div>
            <div className="control-group">
              <label>Color:</label>
              <input
                type="color"
                value={config.particles.spores.color}
                onChange={(e) => handleParticlesChange({
                  ...config.particles,
                  spores: { ...config.particles.spores, color: e.target.value }
                })}
                disabled={disabled}
              />
            </div>
          </>
        )}

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.particles.floating.enabled}
              onChange={(e) => handleParticlesChange({
                ...config.particles,
                floating: { ...config.particles.floating, enabled: e.target.checked }
              })}
              disabled={disabled}
            />
            Floating Elements
          </label>
        </div>
        {config.particles.floating.enabled && (
          <>
            <div className="control-group">
              <label>Density: {config.particles.floating.density.toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.particles.floating.density}
                onChange={(e) => handleParticlesChange({
                  ...config.particles,
                  floating: { ...config.particles.floating, density: parseFloat(e.target.value) }
                })}
                disabled={disabled}
              />
            </div>
            <div className="control-group">
              <label>Color:</label>
              <input
                type="color"
                value={config.particles.floating.color}
                onChange={(e) => handleParticlesChange({
                  ...config.particles,
                  floating: { ...config.particles.floating, color: e.target.value }
                })}
                disabled={disabled}
              />
            </div>
          </>
        )}
      </div>

      <div className="subsection">
        <h5>Effects</h5>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.effects.vignette.enabled}
              onChange={(e) => handleEffectsChange({
                ...config.effects,
                vignette: { ...config.effects.vignette, enabled: e.target.checked }
              })}
              disabled={disabled}
            />
            Vignette
          </label>
        </div>
        {config.effects.vignette.enabled && (
          <div className="control-group">
            <label>Intensity: {config.effects.vignette.intensity.toFixed(1)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.effects.vignette.intensity}
              onChange={(e) => handleEffectsChange({
                ...config.effects,
                vignette: { ...config.effects.vignette, intensity: parseFloat(e.target.value) }
              })}
              disabled={disabled}
            />
          </div>
        )}

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.effects.bloom.enabled}
              onChange={(e) => handleEffectsChange({
                ...config.effects,
                bloom: { ...config.effects.bloom, enabled: e.target.checked }
              })}
              disabled={disabled}
            />
            Bloom
          </label>
        </div>
        {config.effects.bloom.enabled && (
          <div className="control-group">
            <label>Intensity: {config.effects.bloom.intensity.toFixed(1)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.effects.bloom.intensity}
              onChange={(e) => handleEffectsChange({
                ...config.effects,
                bloom: { ...config.effects.bloom, intensity: parseFloat(e.target.value) }
              })}
              disabled={disabled}
            />
          </div>
        )}

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.effects.godRays.enabled}
              onChange={(e) => handleEffectsChange({
                ...config.effects,
                godRays: { ...config.effects.godRays, enabled: e.target.checked }
              })}
              disabled={disabled}
            />
            God Rays
          </label>
        </div>
        {config.effects.godRays.enabled && (
          <div className="control-group">
            <label>Intensity: {config.effects.godRays.intensity.toFixed(1)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.effects.godRays.intensity}
              onChange={(e) => handleEffectsChange({
                ...config.effects,
                godRays: { ...config.effects.godRays, intensity: parseFloat(e.target.value) }
              })}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  )
}