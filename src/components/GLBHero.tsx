import React, { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'

// Using TS module declaration from src/types/assets.d.ts
import modelUrl from '../assets/models/sesta_pose_textured_mesh.glb'

export default function GLBHero(props: any) {
  const gltf = useGLTF(modelUrl) as any
  const scene = gltf.scene || gltf
  // Optionally adjust scale/orientation once
  const prepared = useMemo(() => {
    const root = scene.clone(true)
    // Ensure sensible defaults
    root.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    return root
  }, [scene])

  return <group {...props} dispose={null}>{prepared && <primitive object={prepared} />}</group>
}

useGLTF.preload(modelUrl)
