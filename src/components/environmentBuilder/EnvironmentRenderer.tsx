import React, { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEnvironmentBuilder } from '../../contexts/EnvironmentBuilderContext'
import { useEnvironment } from '../../contexts/EnvironmentContext'
import { logWebGL, logPerformance } from '../../utils/WebGLDebugger'

export function EnvironmentRenderer() {
  const { state } = useEnvironmentBuilder()
  const { scene, gl } = useThree()
  const { env, pulses } = useEnvironment()

  // Log component mount/unmount
  useEffect(() => {
    logWebGL('info', 'EnvironmentRenderer mounted')
    return () => {
      logWebGL('info', 'EnvironmentRenderer unmounted')
    }
  }, [])

  // Refs for dynamic objects
  const skyboxRef = useRef<THREE.Mesh | null>(null)
  const lightsRef = useRef<{
    directional?: THREE.DirectionalLight
    hemisphere?: THREE.HemisphereLight
    ambient?: THREE.AmbientLight
  }>({})

  // Apply sky layer configuration
  useEffect(() => {
    const skyConfig = state.currentConfig.layers.sky
    logWebGL('info', 'Sky config update', { skyConfig })

    // Remove existing skybox
    if (skyboxRef.current) {
      scene.remove(skyboxRef.current)
      skyboxRef.current = null
    }

    if (skyConfig.type === 'hdri' && skyConfig.hdriPath) {
      // Load HDRI texture and create environment map
      try {
        const loader = new THREE.TextureLoader()
        const texture = loader.load(
          `/assets/hdri/${skyConfig.hdriPath}`,
          (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping
            scene.environment = texture
            if (skyConfig.showBackground) {
              scene.background = texture
            }
            logWebGL('info', 'HDRI loaded successfully', { path: skyConfig.hdriPath })
          },
          undefined,
          (error) => {
            logWebGL('error', 'Failed to load HDRI', { path: skyConfig.hdriPath, error: error.message })
            scene.background = new THREE.Color(skyConfig.solidColor || '#87CEEB')
          }
        )
      } catch (error) {
        logWebGL('error', 'HDRI loading error', { error: error.message })
        scene.background = new THREE.Color(skyConfig.solidColor || '#87CEEB')
      }
    } else if (skyConfig.type === 'solid') {
      scene.background = new THREE.Color(skyConfig.solidColor || '#000000')
      scene.environment = null // Clear environment map for solid colors
    } else {
      // Procedural or default
      scene.background = new THREE.Color('#87CEEB')
      scene.environment = null
    }

    // Set environment exposure
    if (gl && gl.toneMappingExposure !== undefined) {
      gl.toneMappingExposure = skyConfig.exposure
      logWebGL('info', 'Exposure set', { exposure: skyConfig.exposure })
    }
  }, [state.currentConfig.layers.sky, scene, gl])

  // Apply lighting layer configuration
  useEffect(() => {
    const lightingConfig = state.currentConfig.layers.lighting
    logWebGL('info', 'Lighting config update', { lightingConfig })

    // Remove existing lights
    Object.values(lightsRef.current).forEach(light => {
      if (light) scene.remove(light)
    })
    lightsRef.current = {}

    // Add directional light
    if (lightingConfig.directional.enabled) {
      const directionalLight = new THREE.DirectionalLight(
        lightingConfig.directional.color,
        lightingConfig.directional.intensity
      )
      directionalLight.position.set(...lightingConfig.directional.position)
      directionalLight.castShadow = true
      scene.add(directionalLight)
      lightsRef.current.directional = directionalLight
      logWebGL('info', 'Directional light added', { color: lightingConfig.directional.color, intensity: lightingConfig.directional.intensity })
    }

    // Add hemisphere light
    if (lightingConfig.hemisphere.enabled) {
      const hemisphereLight = new THREE.HemisphereLight(
        lightingConfig.hemisphere.skyColor,
        lightingConfig.hemisphere.groundColor,
        lightingConfig.hemisphere.intensity
      )
      scene.add(hemisphereLight)
      lightsRef.current.hemisphere = hemisphereLight
      logWebGL('info', 'Hemisphere light added', { skyColor: lightingConfig.hemisphere.skyColor, groundColor: lightingConfig.hemisphere.groundColor })
    }

    // Add ambient light
    if (lightingConfig.ambient.enabled) {
      const ambientLight = new THREE.AmbientLight(
        lightingConfig.ambient.color,
        lightingConfig.ambient.intensity
      )
      scene.add(ambientLight)
      lightsRef.current.ambient = ambientLight
      logWebGL('info', 'Ambient light added', { color: lightingConfig.ambient.color, intensity: lightingConfig.ambient.intensity })
    }

    // Apply fog
    if (lightingConfig.fog.enabled) {
      if (lightingConfig.fog.type === 'linear') {
        scene.fog = new THREE.Fog(
          lightingConfig.fog.color,
          lightingConfig.fog.near || 10,
          lightingConfig.fog.far || 100
        )
        logWebGL('info', 'Linear fog applied', { color: lightingConfig.fog.color, near: lightingConfig.fog.near, far: lightingConfig.fog.far })
      } else {
        scene.fog = new THREE.FogExp2(
          lightingConfig.fog.color,
          lightingConfig.fog.density || 0.01
        )
        logWebGL('info', 'Exponential fog applied', { color: lightingConfig.fog.color, density: lightingConfig.fog.density })
      }
    } else {
      scene.fog = null
      logWebGL('info', 'Fog disabled')
    }
  }, [state.currentConfig.layers.lighting, scene])

  // Apply surface layer configuration
  useEffect(() => {
    // Surface configuration is now handled by the ground components directly
    // This component focuses on scene-level properties only
  }, [state.currentConfig.layers.surface])

  // Atmosphere layer would be handled here (particles, effects)
  // For now, we'll focus on the core layers

  return null // This component only manages side effects
}