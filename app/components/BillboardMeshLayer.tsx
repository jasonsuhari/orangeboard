'use client'

// Renders SF billboard inventory as real 3D meshes injected into Mapbox's GL
// pipeline as a custom layer — same approach as sightline's OohBillboardMeshLayer.
// Each billboard = face panel (mock.png texture) + dark back + two steel poles.
// Uses Three.js InstancedMesh with MercatorCoordinate projection.

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import * as THREE from 'three'

const LAYER_ID = 'orangeboard-billboard-mesh'
const METERS_PER_LAT = 110540
const METERS_PER_LNG = 111320
const CYL_AXIS = new THREE.Vector3(0, 1, 0)
const ZERO_MTX = new THREE.Matrix4().makeScale(0, 0, 0)
const MAX_BILLBOARDS = 2000

// Standard SF "bb" billboard: 12 m wide, 5 m tall, 4 m pole clearance
const SPEC = { w: 12, h: 5, cl: 4 }

// Pre-allocated scratch — never reallocated in the render hot path
const rVec = new THREE.Vector3()
const uVec = new THREE.Vector3()
const nVec = new THREE.Vector3()
const cVec = new THREE.Vector3()
const sVec = new THREE.Vector3()
const eVec = new THREE.Vector3()
const dVec = new THREE.Vector3()
const midVec = new THREE.Vector3()
const panelMtx = new THREE.Matrix4()
const backMtx = new THREE.Matrix4()
const poleMtx = new THREE.Matrix4()
const quat = new THREE.Quaternion()

export interface BillboardPoint {
  id: string
  lng: number
  lat: number
}

interface LayerState {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.Camera
  faceMesh: THREE.InstancedMesh
  backMesh: THREE.InstancedMesh
  leftPoleMesh: THREE.InstancedMesh
  rightPoleMesh: THREE.InstancedMesh
}

// Deterministic heading from billboard id so each sign faces a consistent direction.
function idToHeading(id: string): number {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h) ^ id.charCodeAt(i)
  return ((h >>> 0) / 0xffffffff) * 360
}

function coord(lng: number, lat: number, altM: number) {
  return mapboxgl.MercatorCoordinate.fromLngLat([lng, lat], altM)
}

function setPanelMatrix(
  mesh: THREE.InstancedMesh, index: number,
  lb: mapboxgl.MercatorCoordinate, rb: mapboxgl.MercatorCoordinate,
  rt: mapboxgl.MercatorCoordinate, lt: mapboxgl.MercatorCoordinate,
) {
  rVec.set(rb.x - lb.x, rb.y - lb.y, rb.z - lb.z)
  uVec.set(lt.x - lb.x, lt.y - lb.y, lt.z - lb.z)
  nVec.crossVectors(rVec, uVec).normalize()
  cVec.set(
    (lb.x + rb.x + rt.x + lt.x) / 4,
    (lb.y + rb.y + rt.y + lt.y) / 4,
    (lb.z + rb.z + rt.z + lt.z) / 4,
  )
  panelMtx.set(
    rVec.x, uVec.x, nVec.x, cVec.x,
    rVec.y, uVec.y, nVec.y, cVec.y,
    rVec.z, uVec.z, nVec.z, cVec.z,
    0,      0,      0,      1,
  )
  mesh.setMatrixAt(index, panelMtx)
}

function setBackMatrix(mesh: THREE.InstancedMesh, index: number) {
  backMtx.copy(panelMtx)
  const el = backMtx.elements
  el[0] *= 1.1; el[1] *= 1.1; el[2] *= 1.1
  el[4] *= 1.15; el[5] *= 1.15; el[6] *= 1.15
  mesh.setMatrixAt(index, backMtx)
}

function setPoleMatrix(
  mesh: THREE.InstancedMesh, index: number,
  start: mapboxgl.MercatorCoordinate, end: mapboxgl.MercatorCoordinate,
  radius: number,
) {
  sVec.set(start.x, start.y, start.z)
  eVec.set(end.x, end.y, end.z)
  dVec.subVectors(eVec, sVec)
  const len = dVec.length()
  if (len < 1e-12) { mesh.setMatrixAt(index, ZERO_MTX); return }
  dVec.divideScalar(len)
  midVec.addVectors(sVec, eVec).multiplyScalar(0.5)
  if (dVec.dot(CYL_AXIS) < -0.9999) {
    poleMtx.makeRotationX(Math.PI)
  } else {
    quat.setFromUnitVectors(CYL_AXIS, dVec)
    poleMtx.makeRotationFromQuaternion(quat)
  }
  poleMtx.scale(new THREE.Vector3(radius, len, radius))
  poleMtx.setPosition(midVec)
  mesh.setMatrixAt(index, poleMtx)
}

function createState(
  map: mapboxgl.Map,
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  faceMat: THREE.MeshBasicMaterial,
): LayerState {
  const renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true })
  renderer.autoClear = false

  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  camera.matrixAutoUpdate = false

  const faceMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), faceMat, MAX_BILLBOARDS)
  const backMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0x1d252b, side: THREE.DoubleSide, depthTest: false }),
    MAX_BILLBOARDS,
  )
  const leftPoleMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 6),
    new THREE.MeshBasicMaterial({ color: 0x2f3a40, depthTest: false }),
    MAX_BILLBOARDS,
  )
  const rightPoleMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 6),
    new THREE.MeshBasicMaterial({ color: 0x2f3a40, depthTest: false }),
    MAX_BILLBOARDS,
  )

  for (const mesh of [faceMesh, backMesh, leftPoleMesh, rightPoleMesh]) {
    mesh.frustumCulled = false
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    for (let i = 0; i < MAX_BILLBOARDS; i++) mesh.setMatrixAt(i, ZERO_MTX)
    mesh.instanceMatrix.needsUpdate = true
    scene.add(mesh)
  }

  return { renderer, scene, camera, faceMesh, backMesh, leftPoleMesh, rightPoleMesh }
}

function disposeState(state: LayerState) {
  for (const mesh of [state.faceMesh, state.backMesh, state.leftPoleMesh, state.rightPoleMesh]) {
    state.scene.remove(mesh)
    mesh.geometry.dispose()
    ;(mesh.material as THREE.Material).dispose()
  }
  state.renderer.dispose()
}

function updateInstances(map: mapboxgl.Map, state: LayerState, points: BillboardPoint[]) {
  const count = Math.min(points.length, MAX_BILLBOARDS)

  for (let i = 0; i < count; i++) {
    const pt = points[i]
    const lngScale = METERS_PER_LNG * Math.cos(pt.lat * Math.PI / 180)
    const heading = idToHeading(pt.id) * Math.PI / 180
    const sideE = Math.sin(heading + Math.PI / 2)
    const sideN = Math.cos(heading + Math.PI / 2)
    const hw = SPEC.w / 2

    const leftLng  = pt.lng + (-sideE * hw) / lngScale
    const leftLat  = pt.lat + (-sideN * hw) / METERS_PER_LAT
    const rightLng = pt.lng + ( sideE * hw) / lngScale
    const rightLat = pt.lat + ( sideN * hw) / METERS_PER_LAT

    const terrain = map.queryTerrainElevation([pt.lng, pt.lat], { exaggerated: false }) ?? 0
    const baseZ = terrain + SPEC.cl
    const topZ  = baseZ + SPEC.h
    const meterScale = coord(pt.lng, pt.lat, terrain).meterInMercatorCoordinateUnits()
    const poleRadius = Math.max(0.055, SPEC.w * 0.007) * meterScale

    const lb = coord(leftLng,  leftLat,  baseZ)
    const rb = coord(rightLng, rightLat, baseZ)
    const rt = coord(rightLng, rightLat, topZ)
    const lt = coord(leftLng,  leftLat,  topZ)

    setPanelMatrix(state.faceMesh, i, lb, rb, rt, lt)
    setBackMatrix(state.backMesh, i)
    setPoleMatrix(state.leftPoleMesh,  i, coord(leftLng,  leftLat,  terrain), lb, poleRadius)
    setPoleMatrix(state.rightPoleMesh, i, coord(rightLng, rightLat, terrain), rb, poleRadius)
  }

  for (let i = count; i < MAX_BILLBOARDS; i++) {
    for (const mesh of [state.faceMesh, state.backMesh, state.leftPoleMesh, state.rightPoleMesh]) {
      mesh.setMatrixAt(i, ZERO_MTX)
    }
  }

  state.faceMesh.instanceMatrix.needsUpdate      = true
  state.backMesh.instanceMatrix.needsUpdate      = true
  state.leftPoleMesh.instanceMatrix.needsUpdate  = true
  state.rightPoleMesh.instanceMatrix.needsUpdate = true
}

interface Props {
  billboards: BillboardPoint[]
  map: mapboxgl.Map | null
}

export default function BillboardMeshLayer({ billboards, map }: Props) {
  const billboardsRef = useRef(billboards)
  billboardsRef.current = billboards

  useEffect(() => { map?.triggerRepaint() }, [map, billboards])

  useEffect(() => {
    if (!map) return

    let state: LayerState | null = null
    let removed = false

    // Start with solid orange so the billboards are visible before mock.png loads.
    // Once the texture loads, swap it in and trigger a repaint.
    const faceMat = new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide, depthTest: false })
    new THREE.TextureLoader().load('/mock.png', (tex) => {
      if (removed) { tex.dispose(); return }
      faceMat.map = tex
      faceMat.color.set(0xffffff)
      faceMat.needsUpdate = true
      map.triggerRepaint()
    })

    // Cast to `any` then to the interface so we can add `slot` (Standard style
    // requires a slot for custom layers; @types/mapbox-gl omits this property).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customLayer = {
      id: LAYER_ID,
      type: 'custom' as const,
      slot: 'top',
      renderingMode: '3d' as const,
      onAdd: (_map: mapboxgl.Map, gl: WebGLRenderingContext) => {
        state = createState(map, gl, faceMat)
      },
      // mapbox-gl v3 passes the camera matrix as the *second positional arg*
      // (a 16-element column-major array), not an object. Older code read
      // `args.modelViewProjectionMatrix`, which was undefined → fromArray filled
      // the projection with NaN → every vertex collapsed and nothing drew.
      render: (_gl: WebGLRenderingContext, matrix: number[] | { modelViewProjectionMatrix: number[] }) => {
        if (!state) return
        const mvp = Array.isArray(matrix) || ArrayBuffer.isView(matrix)
          ? (matrix as number[])
          : (matrix as { modelViewProjectionMatrix: number[] }).modelViewProjectionMatrix
        if (!mvp) return
        state.camera.projectionMatrix.fromArray(mvp)
        updateInstances(map, state, billboardsRef.current)
        state.renderer.resetState()
        state.renderer.render(state.scene, state.camera)
        map.triggerRepaint()
      },
      onRemove: () => {
        removed = true
        faceMat.map?.dispose()
        faceMat.dispose()
        if (state) { disposeState(state); state = null }
      },
    } as unknown as mapboxgl.CustomLayerInterface

    const addLayer = () => {
      if (removed || map.getLayer(LAYER_ID)) return
      try {
        map.addLayer(customLayer)
        map.triggerRepaint()
      } catch (e) {
        console.error('[BillboardMeshLayer] addLayer failed:', e)
      }
    }

    if (map.isStyleLoaded()) addLayer()
    else map.once('style.load', addLayer)
    map.on('style.load', addLayer)

    return () => {
      removed = true
      map.off('style.load', addLayer)
      try { if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID) } catch { /* map may be destroyed */ }
    }
  }, [map])

  return null
}
