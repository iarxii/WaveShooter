import React from 'react'
import { LayerControlProps, SurfaceConfig } from '../../types/environmentBuilder'

export function SurfaceControls({ config, onChange, disabled }: LayerControlProps<SurfaceConfig>) {
  const handleShaderChange = (shader: string) => {
    onChange({ ...config, shader })
  }

  const handleMaterialChange = (material: SurfaceConfig['material']) => {
    onChange({ ...config, material })
  }

  const handleDisplacementChange = (displacement: SurfaceConfig['displacement']) => {
    onChange({ ...config, displacement })
  }

  const handleAnimationChange = (animation: SurfaceConfig['animation']) => {
    onChange({ ...config, animation })
  }

  return (
    <div className="layer-controls surface-controls">
      <h4>Surface Layer</h4>

      <div className="control-group">
        <label>Shader:</label>
        <select
          value={config.shader}
          onChange={(e) => handleShaderChange(e.target.value)}
          disabled={disabled}
        >
          <option value="veins">Veins</option>
          <option value="infection">Infection</option>
          <option value="grid">Containment Grid</option>
          <option value="bioelectric">Bioelectric</option>
        </select>
      </div>

      <div className="subsection">
        <h5>Material Properties</h5>
        <div className="control-group">
          <label>Metalness: {config.material.metalness.toFixed(1)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.material.metalness}
            onChange={(e) => handleMaterialChange({ ...config.material, metalness: parseFloat(e.target.value) })}
            disabled={disabled}
          />
        </div>
        <div className="control-group">
          <label>Roughness: {config.material.roughness.toFixed(1)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.material.roughness}
            onChange={(e) => handleMaterialChange({ ...config.material, roughness: parseFloat(e.target.value) })}
            disabled={disabled}
          />
        </div>
        <div className="control-group">
          <label>Base Color:</label>
          <input
            type="color"
            value={config.material.color}
            onChange={(e) => handleMaterialChange({ ...config.material, color: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="subsection">
        <h5>Displacement</h5>
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.displacement.enabled}
              onChange={(e) => handleDisplacementChange({ ...config.displacement, enabled: e.target.checked })}
              disabled={disabled}
            />
            Enabled
          </label>
        </div>
        {config.displacement.enabled && (
          <div className="control-group">
            <label>Scale: {config.displacement.scale.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={config.displacement.scale}
              onChange={(e) => handleDisplacementChange({ ...config.displacement, scale: parseFloat(e.target.value) })}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      <div className="subsection">
        <h5>Animation</h5>
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.animation.enabled}
              onChange={(e) => handleAnimationChange({ ...config.animation, enabled: e.target.checked })}
              disabled={disabled}
            />
            Enabled
          </label>
        </div>
        {config.animation.enabled && (
          <div className="control-group">
            <label>Speed: {config.animation.speed.toFixed(1)}</label>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={config.animation.speed}
              onChange={(e) => handleAnimationChange({ ...config.animation, speed: parseFloat(e.target.value) })}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  )
}