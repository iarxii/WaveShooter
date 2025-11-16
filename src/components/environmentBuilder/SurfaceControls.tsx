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

  const handleTerrainChange = (terrain: SurfaceConfig['terrain']) => {
    onChange({ ...config, terrain })
  }

  const handleArenaChange = (arena: SurfaceConfig['arena']) => {
    onChange({ ...config, arena })
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

      <div className="subsection">
        <h5>Terrain Geometry</h5>
        <div className="control-group">
          <label>Type:</label>
          <select
            value={config.terrain.type}
            onChange={(e) => handleTerrainChange({ ...config.terrain, type: e.target.value as SurfaceConfig['terrain']['type'] })}
            disabled={disabled}
          >
            <option value="flat">Flat</option>
            <option value="mountains">Mountains</option>
            <option value="buildings">Buildings</option>
            <option value="pillars">Pillars</option>
            <option value="craters">Craters</option>
            <option value="waves">Waves</option>
          </select>
        </div>

        {config.terrain.type !== 'flat' && (
          <>
            <div className="control-group">
              <label>Height: {config.terrain.height.toFixed(1)}</label>
              <input
                type="range"
                min="0.1"
                max="10.0"
                step="0.1"
                value={config.terrain.height}
                onChange={(e) => handleTerrainChange({ ...config.terrain, height: parseFloat(e.target.value) })}
                disabled={disabled}
              />
            </div>

            <div className="control-group">
              <label>Frequency: {config.terrain.frequency.toFixed(2)}</label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={config.terrain.frequency}
                onChange={(e) => handleTerrainChange({ ...config.terrain, frequency: parseFloat(e.target.value) })}
                disabled={disabled}
              />
            </div>

            <div className="control-group">
              <label>Octaves: {config.terrain.octaves}</label>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={config.terrain.octaves}
                onChange={(e) => handleTerrainChange({ ...config.terrain, octaves: parseInt(e.target.value) })}
                disabled={disabled}
              />
            </div>

            <div className="control-group">
              <label>Boundary Distance: {config.terrain.boundaryDistance}</label>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={config.terrain.boundaryDistance}
                onChange={(e) => handleTerrainChange({ ...config.terrain, boundaryDistance: parseInt(e.target.value) })}
                disabled={disabled}
              />
            </div>
          </>
        )}
      </div>

      <div className="subsection">
        <h5>Arena Boundary</h5>
        <div className="control-group">
          <label>Shader:</label>
          <select
            value={config.arena.shader}
            onChange={(e) => handleArenaChange({ ...config.arena, shader: e.target.value })}
            disabled={disabled}
          >
            <option value="grid">Containment Grid</option>
            <option value="veins">Veins</option>
            <option value="infection">Infection</option>
            <option value="bioelectric">Bioelectric</option>
          </select>
        </div>

        <div className="control-group">
          <label>Height: {config.arena.height.toFixed(1)}</label>
          <input
            type="range"
            min="0.5"
            max="5.0"
            step="0.1"
            value={config.arena.height}
            onChange={(e) => handleArenaChange({ ...config.arena, height: parseFloat(e.target.value) })}
            disabled={disabled}
          />
        </div>

        <div className="control-group">
          <label>Thickness: {config.arena.thickness.toFixed(1)}</label>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={config.arena.thickness}
            onChange={(e) => handleArenaChange({ ...config.arena, thickness: parseFloat(e.target.value) })}
            disabled={disabled}
          />
        </div>

        <div className="control-group">
          <label>Color:</label>
          <input
            type="color"
            value={config.arena.material.color}
            onChange={(e) => handleArenaChange({
              ...config.arena,
              material: { ...config.arena.material, color: e.target.value }
            })}
            disabled={disabled}
          />
        </div>

        <div className="control-group">
          <label>Metalness: {config.arena.material.metalness.toFixed(1)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.arena.material.metalness}
            onChange={(e) => handleArenaChange({
              ...config.arena,
              material: { ...config.arena.material, metalness: parseFloat(e.target.value) }
            })}
            disabled={disabled}
          />
        </div>

        <div className="control-group">
          <label>Roughness: {config.arena.material.roughness.toFixed(1)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.arena.material.roughness}
            onChange={(e) => handleArenaChange({
              ...config.arena,
              material: { ...config.arena.material, roughness: parseFloat(e.target.value) }
            })}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}