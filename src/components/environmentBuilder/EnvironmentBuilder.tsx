import React, { useState } from 'react'
import { useEnvironmentBuilder } from '../../contexts/EnvironmentBuilderContext'
import { SkyControls } from './SkyControls'
import { LightingControls } from './LightingControls'
import { SurfaceControls } from './SurfaceControls'
import { AtmosphereControls } from './AtmosphereControls'
import { ProceduralControls } from './ProceduralControls'
import './EnvironmentBuilder.css'

export function EnvironmentBuilder() {
  const {
    state,
    updateSky,
    updateLighting,
    updateSurface,
    updateAtmosphere,
    updateProcedural,
    loadPreset,
    savePreset,
    deletePreset,
    resetToDefault
  } = useEnvironmentBuilder()

  const [expandedSections, setExpandedSections] = useState({
    sky: true,
    lighting: false,
    surface: false,
    atmosphere: false,
    procedural: false
  })

  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetDescription, setNewPresetDescription] = useState('')

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      savePreset(newPresetName.trim(), newPresetDescription.trim())
      setNewPresetName('')
      setNewPresetDescription('')
    }
  }

  return (
    <div className="environment-builder">
      <div className="builder-header">
        <h3>Environment Builder</h3>
        {state.isDirty && <span className="dirty-indicator">•</span>}
      </div>

      {/* Preset Management */}
      <div className="preset-section">
        <h4>Presets</h4>
        <div className="preset-controls">
          <select
            value={state.selectedPreset || ''}
            onChange={(e) => loadPreset(e.target.value)}
          >
            <option value="">Current (Unsaved)</option>
            {state.presets.map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <button onClick={resetToDefault}>Reset to Default</button>
        </div>

        <div className="save-preset">
          <input
            type="text"
            placeholder="Preset name"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newPresetDescription}
            onChange={(e) => setNewPresetDescription(e.target.value)}
          />
          <button onClick={handleSavePreset} disabled={!newPresetName.trim()}>
            Save Preset
          </button>
        </div>

        {state.selectedPreset && (
          <button
            className="delete-preset"
            onClick={() => deletePreset(state.selectedPreset!)}
          >
            Delete Current Preset
          </button>
        )}
      </div>

      {/* Layer Controls */}
      <div className="layers-container">
        {/* Sky Layer */}
        <div className="layer-section">
          <button
            className="layer-toggle"
            onClick={() => toggleSection('sky')}
          >
            <span className={`arrow ${expandedSections.sky ? 'expanded' : ''}`}>▶</span>
            Sky Layer
          </button>
          {expandedSections.sky && (
            <SkyControls
              config={state.currentConfig.layers.sky}
              onChange={updateSky}
            />
          )}
        </div>

        {/* Lighting Layer */}
        <div className="layer-section">
          <button
            className="layer-toggle"
            onClick={() => toggleSection('lighting')}
          >
            <span className={`arrow ${expandedSections.lighting ? 'expanded' : ''}`}>▶</span>
            Lighting Layer
          </button>
          {expandedSections.lighting && (
            <LightingControls
              config={state.currentConfig.layers.lighting}
              onChange={updateLighting}
            />
          )}
        </div>

        {/* Surface Layer */}
        <div className="layer-section">
          <button
            className="layer-toggle"
            onClick={() => toggleSection('surface')}
          >
            <span className={`arrow ${expandedSections.surface ? 'expanded' : ''}`}>▶</span>
            Surface Layer
          </button>
          {expandedSections.surface && (
            <SurfaceControls
              config={state.currentConfig.layers.surface}
              onChange={updateSurface}
            />
          )}
        </div>

        {/* Atmosphere Layer */}
        <div className="layer-section">
          <button
            className="layer-toggle"
            onClick={() => toggleSection('atmosphere')}
          >
            <span className={`arrow ${expandedSections.atmosphere ? 'expanded' : ''}`}>▶</span>
            Atmosphere Layer
          </button>
          {expandedSections.atmosphere && (
            <AtmosphereControls
              config={state.currentConfig.layers.atmosphere}
              onChange={updateAtmosphere}
            />
          )}
        </div>

        {/* Procedural Layer */}
        <div className="layer-section">
          <button
            className="layer-toggle"
            onClick={() => toggleSection('procedural')}
          >
            <span className={`arrow ${expandedSections.procedural ? 'expanded' : ''}`}>▶</span>
            Procedural Layer
          </button>
          {expandedSections.procedural && (
            <ProceduralControls
              config={state.currentConfig.layers.procedural}
              onChange={updateProcedural}
            />
          )}
        </div>
      </div>

      {/* Status */}
      <div className="builder-status">
        <div className="status-item">
          <span>Environment:</span>
          <span>{state.currentConfig.name}</span>
        </div>
        <div className="status-item">
          <span>Status:</span>
          <span className={state.isDirty ? 'dirty' : 'clean'}>
            {state.isDirty ? 'Unsaved Changes' : 'Saved'}
          </span>
        </div>
      </div>
    </div>
  )
}