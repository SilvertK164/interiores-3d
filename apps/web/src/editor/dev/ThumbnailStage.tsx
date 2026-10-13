'use client'

import { Environment, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { Box3, Sphere } from 'three'
import { THUMBNAIL_FOV, framePlacement, type Vec3 } from './thumbnail-camera'

/** Luz fija de estudio: la misma para todos los muebles, para que la hoja de contactos sea comparable. */
const AMBIENT = 0.35
const KEY_LIGHT = { position: [2.5, 4, 3] as Vec3, intensity: 1.6 }
const ENVIRONMENT_INTENSITY = 0.9
/** Cuadros que se dibujan con el mueble ya puesto antes de darlo por listo. */
const SETTLE_FRAMES = 3

function Model({ id, onReady }: { id: string; onReady: () => void }) {
  const { scene } = useGLTF(`/items/${id}/model.glb`)
  const camera = useThree((state) => state.camera)
  const frames = useRef(0)
  const fit = useMemo(() => {
    const sphere = new Box3().setFromObject(scene).getBoundingSphere(new Sphere())
    const center: Vec3 = [sphere.center.x, sphere.center.y, sphere.center.z]
    return { center, ...framePlacement(center, sphere.radius, THUMBNAIL_FOV) }
  }, [scene])
  useLayoutEffect(() => {
    camera.position.set(...fit.position)
    camera.near = fit.near
    camera.far = fit.far
    camera.lookAt(...fit.center)
    camera.updateProjectionMatrix()
    frames.current = 0
  }, [camera, fit])
  useFrame(() => {
    frames.current += 1
    if (frames.current === SETTLE_FRAMES) onReady()
  })
  return <primitive object={scene} />
}

/** Un mueble sobre fondo transparente, encuadrado y con luz fijas: lo que se fotografía para su miniatura. */
export default function ThumbnailStage({ id, onReady }: { id: string; onReady: () => void }) {
  return (
    <Canvas dpr={1} camera={{ fov: THUMBNAIL_FOV }} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}>
      <ambientLight intensity={AMBIENT} />
      <directionalLight position={KEY_LIGHT.position} intensity={KEY_LIGHT.intensity} />
      <Suspense fallback={null}>
        <Environment files="/hdri/venice_sunset_1k.hdr" environmentIntensity={ENVIRONMENT_INTENSITY} />
        <Model id={id} onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}
