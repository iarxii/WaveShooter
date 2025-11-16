import React from 'react'
import { LayerControlProps, LightingConfig } from '../../types/environmentBuilder'

export function LightingControls({ config, onChange, disabled }: LayerControlProps<LightingConfig>) {
  const handlePresetChange = (preset: string) => {
    onChange({ ...config, preset })
  }

  const handleDirectionalChange = (directional: LightingConfig['directional']) => {
    onChange({ ...config, directional })
  }

  const handleHemisphereChange = (hemisphere: LightingConfig['hemisphere']) => {
    onChange({ ...config, hemisphere })
  }

  const handleFogChange = (fog: LightingConfig['fog']) => {
    onChange({ ...config, fog })
  }

  const handleAmbientChange = (ambient: LightingConfig['ambient']) => {
    onChange({ ...config, ambient })
  }

  return (
    <div className="layer-controls lighting-controls">
      <h4>Lighting Layer</h4>

      <div className="control-group">
        <label>Preset:</label>
        <select
          value={config.preset || ''}
          onChange={(e) => handlePresetChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">Custom</option>
          <option value="hospital">Hospital</option>
          <option value="surgery">Surgery</option>
          <option value="lab">Lab</option>
          <option value="outdoor">Outdoor</option>
        </select>
      </div>

      <div className="subsection">
        <h5>Directional Light</h5>
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.directional.enabled}
              onChange={(e) => handleDirectionalChange({ ...config.directional, enabled: e.target.checked })}
              disabled={disabled}
            />
            Enabled
          </label>
        </div>
        {config.directional.enabled && (
          <>
            <div className="control-group">
              <label>Intensity: {config.directional.intensity.toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.directional.intensity}
                onChange={(e) => handleDirectionalChange({ ...config.directional, intensity: parseFloat(e.target.value) })}
                disabled={disabled}
              />
            </div>
            <div className="control-group">
              <label>Color:</label>
              <input
                type="color"
                value={config.directional.color}
                onChange={(e) => handleDirectionalChange({ ...config.directional, color: e.target.value })}
                disabled={disabled}
              />
            </div>
          </>
        )}
      </div>

      <div className="subsection">
        <h5>Hemisphere Light</h5>
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.hemisphere.enabled}
              onChange={(e) => handleHemisphereChange({ ...config.hemisphere, enabled: e.target.checked })}
              disabled={disabled}
            />
            Enabled
          </label>
        </div>
        {config.hemisphere.enabled && (
          <>
            <div className="control-group">
              <label>Intensity: {config.hemisphere.intensity.toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.hemisphere.intensity}
                onChange={(e) => handleHemisphereChange({ ...config.hemisphere, intensity: parseFloat(e.target.value) })}
                disabled={disabled}
              />
            </div>
            <div className="control-group">
              <label>Sky Color:</label>
              <input
                type="color"
                value={config.hemisphere.skyColor}
                onChange={(e) => handleHemisphereChange({ ...config.hemisphere, skyColor: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div className="control-group">
              <label>Ground Color:</label>
              <input
                type="color"
                value={config.hemisphere.groundColor}
                onChange={(e) => handleHemisphereChange({ ...config.hemisphere, groundColor: e.target.value })}
                disabled={disabled}
              />
            </div>
          </>
        )}
      </div>

      <div className="subsection">
        <h5>Fog</h5>
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.fog.enabled}
              onChange={(e) => handleFogChange({ ...config.fog, enabled: e.target.checked })}
              disabled={disabled}
            />
            Enabled
          </label>
        </div>
        {config.fog.enabled && (
          <>
            <div className="control-group">
              <label>Type:</label>
              <select
                value={config.fog.type}
                onChange={(e) => handleFogChange({ ...config.fog, type: e.target.value as 'linear' | 'exp2' })}
                disabled={disabled}
              >
                <option value="linear">Linear</option>
                <option value="exp2">Exponential</option>
              </select>
            </div>
            <div className="control-group">
              <label>Color:</label>
              <input
                type="color"
                value={config.fog.color}
                onChange={(e) => handleFogChange({ ...config.fog, color: e.target.value })}
                disabled={disabled}
              />
            </div>
            {config.fog.type === 'linear' && (
              <>
                <div className="control-group">
                  <label>Near: {config.fog.near}</label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={config.fog.near || 10}
                    onChange={(e) => handleFogChange({ ...config.fog, near: parseFloat(e.target.value) })}
                    disabled={disabled}
                  />
                </div>
                <div className="control-group">
                  <label>Far: {config.fog.far}</label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={config.fog.far || 100}
                    onChange={(e) => handleFogChange({ ...config.fog, far: parseFloat(e.target.value) })}
                    disabled={disabled}
                  />
                </div>
              </>
            )}
            {config.fog.type === 'exp2' && (
              <div className="control-group">
                <label>Density: {(config.fog.density || 0.01).toFixed(3)}</label>
                <input
                  type="range"
                  min="0.001"
                  max="0.1"
                  step="0.001"
                  value={config.fog.density || 0.01}
                  onChange={(e) => handleFogChange({ ...config.fog, density: parseFloat(e.target.value) })}
                  disabled={disabled}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="subsection">
        <h5>Ambient Light</h5>
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.ambient.enabled}
              onChange={(e) => handleAmbientChange({ ...config.ambient, enabled: e.target.checked })}
              disabled={disabled}
            />
            Enabled
          </label>
        </div>
        {config.ambient.enabled && (
          <>
            <div className="control-group">
              <label>Intensity: {config.ambient.intensity.toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.ambient.intensity}
                onChange={(e) => handleAmbientChange({ ...config.ambient, intensity: parseFloat(e.target.value) })}
                disabled={disabled}
              />
            </div>
            <div className="control-group">
              <label>Color:</label>
              <input
                type="color"
                value={config.ambient.color}
                onChange={(e) => handleAmbientChange({ ...config.ambient, color: e.target.value })}
                disabled={disabled}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}