import React from 'react'
import { LayerControlProps, ProceduralConfig } from '../../types/environmentBuilder'

export function ProceduralControls({ config, onChange, disabled }: LayerControlProps<ProceduralConfig>) {
  const handleHazardsChange = (hazards: ProceduralConfig['hazards']) => {
    onChange({ ...config, hazards })
  }

  const handleFactorsChange = (factors: ProceduralConfig['factors']) => {
    onChange({ ...config, factors })
  }

  const handleInteractiveChange = (interactive: ProceduralConfig['interactive']) => {
    onChange({ ...config, interactive })
  }

  const handleTimeBasedChange = (timeBased: ProceduralConfig['timeBased']) => {
    onChange({ ...config, timeBased })
  }

  return (
    <div className="layer-controls procedural-controls">
      <h4>Procedural Layer</h4>

      <div className="subsection">
        <h5>Hazards</h5>
        <div className="control-group">
          <label>Type:</label>
          <select
            value={config.hazards.type}
            onChange={(e) => handleHazardsChange({ ...config.hazards, type: e.target.value })}
            disabled={disabled}
          >
            <option value="pillars">Pillars</option>
            <option value="holes">Holes</option>
            <option value="pulses">Pulses</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div className="control-group">
          <label>Frequency: {config.hazards.frequency.toFixed(1)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.hazards.frequency}
            onChange={(e) => handleHazardsChange({ ...config.hazards, frequency: parseFloat(e.target.value) })}
            disabled={disabled}
          />
        </div>
        <div className="control-group">
          <label>Intensity: {config.hazards.intensity.toFixed(1)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.hazards.intensity}
            onChange={(e) => handleHazardsChange({ ...config.hazards, intensity: parseFloat(e.target.value) })}
            disabled={disabled}
          />
        </div>
        <div className="control-group">
          <label>Patterns:</label>
          <select
            multiple
            value={config.hazards.patterns}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value)
              handleHazardsChange({ ...config.hazards, patterns: values })
            }}
            disabled={disabled}
            size={3}
          >
            <option value="random">Random</option>
            <option value="circular">Circular</option>
            <option value="linear">Linear</option>
            <option value="spiral">Spiral</option>
          </select>
        </div>
      </div>

      <div className="subsection">
        <h5>Environmental Factors</h5>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.factors.wind.enabled}
              onChange={(e) => handleFactorsChange({
                ...config.factors,
                wind: { ...config.factors.wind, enabled: e.target.checked }
              })}
              disabled={disabled}
            />
            Wind
          </label>
        </div>
        {config.factors.wind.enabled && (
          <>
            <div className="control-group">
              <label>Strength: {config.factors.wind.strength.toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.factors.wind.strength}
                onChange={(e) => handleFactorsChange({
                  ...config.factors,
                  wind: { ...config.factors.wind, strength: parseFloat(e.target.value) }
                })}
                disabled={disabled}
              />
            </div>
            <div className="control-group">
              <label>Direction: {config.factors.wind.direction}°</label>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={config.factors.wind.direction}
                onChange={(e) => handleFactorsChange({
                  ...config.factors,
                  wind: { ...config.factors.wind, direction: parseFloat(e.target.value) }
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
              checked={config.factors.temperature.enabled}
              onChange={(e) => handleFactorsChange({
                ...config.factors,
                temperature: { ...config.factors.temperature, enabled: e.target.checked }
              })}
              disabled={disabled}
            />
            Temperature Effects
          </label>
        </div>
        {config.factors.temperature.enabled && (
          <div className="control-group">
            <label>Value: {config.factors.temperature.value}°C</label>
            <input
              type="range"
              min="-10"
              max="40"
              step="1"
              value={config.factors.temperature.value}
              onChange={(e) => handleFactorsChange({
                ...config.factors,
                temperature: { ...config.factors.temperature, value: parseFloat(e.target.value) }
              })}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      <div className="subsection">
        <h5>Interactive Elements</h5>
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.interactive.breakables}
              onChange={(e) => handleInteractiveChange({ ...config.interactive, breakables: e.target.checked })}
              disabled={disabled}
            />
            Breakable Objects
          </label>
        </div>
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.interactive.collectibles}
              onChange={(e) => handleInteractiveChange({ ...config.interactive, collectibles: e.target.checked })}
              disabled={disabled}
            />
            Collectibles
          </label>
        </div>
      </div>

      <div className="subsection">
        <h5>Time-Based Changes</h5>
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={config.timeBased.dayNightCycle}
              onChange={(e) => handleTimeBasedChange({ ...config.timeBased, dayNightCycle: e.target.checked })}
              disabled={disabled}
            />
            Day/Night Cycle
          </label>
        </div>
        {config.timeBased.dayNightCycle && (
          <div className="control-group">
            <label>Cycle Speed: {config.timeBased.cycleSpeed.toFixed(1)}</label>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={config.timeBased.cycleSpeed}
              onChange={(e) => handleTimeBasedChange({ ...config.timeBased, cycleSpeed: parseFloat(e.target.value) })}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  )
}