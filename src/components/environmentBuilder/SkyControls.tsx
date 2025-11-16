import React from 'react'
import { LayerControlProps, SkyConfig } from '../../types/environmentBuilder'

export function SkyControls({ config, onChange, disabled }: LayerControlProps<SkyConfig>) {
  const handleTypeChange = (type: SkyConfig['type']) => {
    onChange({ ...config, type })
  }

  const handleHdriChange = (hdriPath: string) => {
    onChange({ ...config, hdriPath })
  }

  const handleProceduralChange = (proceduralType: string) => {
    onChange({ ...config, proceduralType })
  }

  const handleSolidColorChange = (solidColor: string) => {
    onChange({ ...config, solidColor })
  }

  const handleExposureChange = (exposure: number) => {
    onChange({ ...config, exposure })
  }

  const handleRotationChange = (rotation: number) => {
    onChange({ ...config, rotation })
  }

  const handleBackgroundToggle = (showBackground: boolean) => {
    onChange({ ...config, showBackground })
  }

  return (
    <div className="layer-controls sky-controls">
      <h4>Sky Layer</h4>

      <div className="control-group">
        <label>Type:</label>
        <select
          value={config.type}
          onChange={(e) => handleTypeChange(e.target.value as SkyConfig['type'])}
          disabled={disabled}
        >
          <option value="hdri">HDRI</option>
          <option value="procedural">Procedural</option>
          <option value="solid">Solid Color</option>
        </select>
      </div>

      {config.type === 'hdri' && (
        <div className="control-group">
          <label>HDRI:</label>
          <select
            value={config.hdriPath || ''}
            onChange={(e) => handleHdriChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">None</option>
            <option value="hospital_room_1k.hdr">Hospital Room</option>
            <option value="surgery_1k.hdr">Surgery</option>
            <option value="citrus_orchard_road_puresky_1k.hdr">Citrus Orchard</option>
          </select>
        </div>
      )}

      {config.type === 'procedural' && (
        <div className="control-group">
          <label>Procedural Type:</label>
          <select
            value={config.proceduralType || ''}
            onChange={(e) => handleProceduralChange(e.target.value)}
            disabled={disabled}
          >
            <option value="gradient">Gradient</option>
            <option value="noise">Noise</option>
            <option value="animated">Animated</option>
          </select>
        </div>
      )}

      {config.type === 'solid' && (
        <div className="control-group">
          <label>Color:</label>
          <input
            type="color"
            value={config.solidColor || '#ffffff'}
            onChange={(e) => handleSolidColorChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}

      <div className="control-group">
        <label>Exposure: {config.exposure.toFixed(1)}</label>
        <input
          type="range"
          min="0.1"
          max="2.0"
          step="0.1"
          value={config.exposure}
          onChange={(e) => handleExposureChange(parseFloat(e.target.value))}
          disabled={disabled}
        />
      </div>

      <div className="control-group">
        <label>Rotation: {config.rotation}°</label>
        <input
          type="range"
          min="0"
          max="360"
          step="15"
          value={config.rotation}
          onChange={(e) => handleRotationChange(parseFloat(e.target.value))}
          disabled={disabled}
        />
      </div>

      <div className="control-group">
        <label>
          <input
            type="checkbox"
            checked={config.showBackground}
            onChange={(e) => handleBackgroundToggle(e.target.checked)}
            disabled={disabled}
          />
          Show Background
        </label>
      </div>
    </div>
  )
}