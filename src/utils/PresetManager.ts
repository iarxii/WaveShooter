import { EnvironmentPreset } from '../types/environmentBuilder'

const PRESETS_STORAGE_KEY = 'environment_presets'

export class PresetManager {
  static loadPresets(): EnvironmentPreset[] {
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Validate and clean up any malformed presets
        return parsed.filter((preset: any) =>
          preset &&
          typeof preset.id === 'string' &&
          typeof preset.name === 'string' &&
          preset.config &&
          preset.config.layers
        )
      }
    } catch (error) {
      console.warn('Failed to load environment presets:', error)
    }
    return []
  }

  static savePresets(presets: EnvironmentPreset[]): void {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets))
    } catch (error) {
      console.warn('Failed to save environment presets:', error)
    }
  }

  static addPreset(preset: EnvironmentPreset): EnvironmentPreset[] {
    const presets = this.loadPresets()
    const existingIndex = presets.findIndex(p => p.id === preset.id)

    if (existingIndex >= 0) {
      // Update existing preset
      presets[existingIndex] = preset
    } else {
      // Add new preset
      presets.push(preset)
    }

    this.savePresets(presets)
    return presets
  }

  static deletePreset(presetId: string): EnvironmentPreset[] {
    const presets = this.loadPresets()
    const filtered = presets.filter(p => p.id !== presetId)
    this.savePresets(filtered)
    return filtered
  }

  static getPreset(presetId: string): EnvironmentPreset | undefined {
    const presets = this.loadPresets()
    return presets.find(p => p.id === presetId)
  }

  static exportPreset(presetId: string): string | null {
    const preset = this.getPreset(presetId)
    if (preset) {
      return JSON.stringify(preset, null, 2)
    }
    return null
  }

  static importPreset(presetJson: string): EnvironmentPreset | null {
    try {
      const preset = JSON.parse(presetJson)
      // Validate the preset structure
      if (
        preset &&
        typeof preset.id === 'string' &&
        typeof preset.name === 'string' &&
        preset.config &&
        preset.config.layers
      ) {
        // Generate new ID to avoid conflicts
        preset.id = `imported_${Date.now()}`
        return preset
      }
    } catch (error) {
      console.warn('Failed to import preset:', error)
    }
    return null
  }

  static getPresetNames(): string[] {
    const presets = this.loadPresets()
    return presets.map(p => p.name).sort()
  }

  static searchPresets(query: string): EnvironmentPreset[] {
    const presets = this.loadPresets()
    const lowerQuery = query.toLowerCase()
    return presets.filter(preset =>
      preset.name.toLowerCase().includes(lowerQuery) ||
      (preset.description && preset.description.toLowerCase().includes(lowerQuery)) ||
      preset.config.name.toLowerCase().includes(lowerQuery)
    )
  }
}