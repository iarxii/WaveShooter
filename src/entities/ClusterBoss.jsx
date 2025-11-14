import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { PathogenFromSpec } from '../characters/factory/PathogenFactory'
import { KNOCKBACK_DECAY, SPEED_SCALE } from '../game/constants.js'

function ClusterBoss({ id, pos, playerPosRef, onDie, health, isPaused, visualScale=1, spec = null, useSpec = false }) {
  const ref = useRef()
  const stunTimer = useRef(0)
  const knockback = useRef(new THREE.Vector3())
  const speed = 8

  useFrame((_, dt) => {
    if (!ref.current || isPaused) return
    if (stunTimer.current > 0) stunTimer.current = Math.max(0, stunTimer.current - dt)
    const stunned = stunTimer.current > 0
    const dir = new THREE.Vector3().subVectors(playerPosRef.current, ref.current.position)
    dir.y = 0
    const d = dir.length()
    if (!stunned && d > 0.5) {
      dir.normalize()
      ref.current.position.addScaledVector(dir, speed * dt)
    }
    if (knockback.current.lengthSq() > 1e-6) {
      ref.current.position.addScaledVector(knockback.current, dt)
      const decay = Math.exp(-KNOCKBACK_DECAY.boss * SPEED_SCALE * dt)
      knockback.current.multiplyScalar(decay)
      if (knockback.current.lengthSq() < 1e-6) knockback.current.set(0, 0, 0)
    }
    if (ref.current.position.distanceTo(playerPosRef.current) < 1.5) onDie(id, true)
  })

  useEffect(() => {
    if (!window.gameEnemies) window.gameEnemies = []
    const enemyData = { id, ref, isBoss: true, isCluster: true, impulse: (ix=0,iz=0,s=1)=>{knockback.current.x+=ix*s;knockback.current.z+=iz*s}, stun:(ms=1000)=>{stunTimer.current=Math.max(stunTimer.current,(ms|0)/1000)} }
    window.gameEnemies.push(enemyData)
    return () => { window.gameEnemies = window.gameEnemies.filter(e => e.id !== id) }
  }, [id])

  const offsets = useMemo(() => {
    const arr = []
    const r = 0.7
    for (let i=0;i<7;i++) {
      const a = Math.random()*Math.PI*2
      const rr = 0.2 + Math.random()*r
      arr.push([Math.cos(a)*rr, 0, Math.sin(a)*rr])
    }
    return arr
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x220000, roughness: 0.5 }), [])
  const geom = useMemo(() => new THREE.SphereGeometry(0.5, 12, 12), [])
  return (
    <group>
      {spec && useSpec ? (
        <group ref={ref} position={pos} scale={[visualScale, visualScale, visualScale]}>
          <PathogenFromSpec spec={spec} />
        </group>
      ) : (
        <group ref={ref} position={pos} scale={[visualScale, visualScale, visualScale]}>
          {offsets.map((o,i)=>(
            <mesh key={i} position={o} geometry={geom} material={mat} />
          ))}
          <Text position={[0, 1.6, 0]} fontSize={0.35} color="#fff" anchorX="center" anchorY="bottom">{`± ${health}/3`}</Text>
        </group>
      )}
    </group>
  )
}

export default React.memo(ClusterBoss)
