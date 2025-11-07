import React, { useEffect, useRef } from 'react'
import { useFBX, useAnimations } from '@react-three/drei'

// Import FBX as URL (declared in src/types/assets.d.ts)
import clipUrl from '../assets/models/dr_dokta_anim_poses/Standing Run Back.fbx'

export default function FBXAnimViewer(props: any) {
  const group = useRef<any>(null)
  const fbx = useFBX(clipUrl) as any
  const { actions, names } = useAnimations(fbx.animations || [], group)

  useEffect(() => {
    // Attach the loaded FBX as a child so the animations target the same hierarchy
    if (group.current && fbx) {
      // Ensure the object is only added once
      if (!group.current.children.includes(fbx)) {
        group.current.add(fbx)
      }
    }
  }, [fbx])

  useEffect(() => {
    // Play the first available action
    const first = names && names.length > 0 ? actions?.[names[0]] : undefined
    first?.reset().fadeIn(0.2).play()
    return () => {
      first?.fadeOut(0.2)
    }
  }, [actions, names])

  // Apply scale if provided (default small for FBX units)
  const s = typeof props?.scale === 'number' ? props.scale : 0.01
  return <group ref={group} scale={[s, s, s]} {...props} />
}
