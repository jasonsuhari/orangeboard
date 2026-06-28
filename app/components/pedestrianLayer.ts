import * as THREE from "three";
import mapboxgl from "mapbox-gl";

const SF = { minLng: -122.52, maxLng: -122.35, minLat: 37.70, maxLat: 37.82 };
const M_PER_LAT = 110540;
const M_PER_LNG = 111320;

export const PEDESTRIAN_COUNT = 150;

const ORIGIN_LNG = -122.4194;
const ORIGIN_LAT = 37.7749;

const SPD = 0.0000009; // deg/ms — ~80× real speed for visibility, matches existing sim
const WALK_FREQ = 1.8; // walk cycles per second

// Scale factor: ~5× real size for map visibility at zoom 14-16
const S = 5;
const HEAD_R = 0.14 * S;
const TORSO_R = 0.08 * S;
const LIMB_R = 0.06 * S;
const HIP_Y = 0.88 * S;
const CHEST_Y = 1.42 * S;
const HEAD_Y = 1.68 * S;
const HIP_X = 0.12 * S;
const SHOULDER_X = 0.20 * S;
const FOOT_Y = 0.04 * S;
const HAND_Y = HIP_Y + 0.05 * S;
const LEG_SWING = 0.55 * S;
const ARM_SWING = 0.30 * S;

const HEAD_COLOR = 0xffecd2;
const SHIRT_COLOR = 0x3b82f6;
const PANTS_COLOR = 0x1e293b;

// Pre-allocated temp objects — never recreated inside the render loop
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _c = new THREE.Vector3();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _UP = new THREE.Vector3(0, 1, 0);
const _shadowQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

interface Ped {
  lng: number;
  lat: number;
  bearing: number;
  phase: number;
  nextTurn: number;
  turnEvery: number;
}

function rnd(lo: number, hi: number) { return lo + Math.random() * (hi - lo); }

function initPeds(): Ped[] {
  return Array.from({ length: PEDESTRIAN_COUNT }, () => ({
    lng: rnd(SF.minLng, SF.maxLng),
    lat: rnd(SF.minLat, SF.maxLat),
    bearing: rnd(0, Math.PI * 2),
    phase: rnd(0, Math.PI * 2),
    nextTurn: rnd(0, 6000),
    turnEvery: rnd(3000, 9000),
  }));
}

function setLimb(
  mesh: THREE.InstancedMesh,
  idx: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  r: number,
) {
  _a.set(ax, ay, az);
  _b.set(bx, by, bz);
  _dir.subVectors(_b, _a);
  const len = _dir.length();
  if (len < 0.001) { mesh.setMatrixAt(idx, _m.identity()); return; }
  _dir.divideScalar(len);
  _q.setFromUnitVectors(_UP, _dir);
  _c.addVectors(_a, _b).multiplyScalar(0.5);
  _s.set(r, len, r);
  _m.compose(_c, _q, _s);
  mesh.setMatrixAt(idx, _m);
}

export interface PedestrianLayer extends mapboxgl.CustomLayerInterface {
  setVisible(v: boolean): void;
}

export function createPedestrianLayer(id: string): PedestrianLayer {
  const origin = mapboxgl.MercatorCoordinate.fromLngLat([ORIGIN_LNG, ORIGIN_LAT], 0);
  const mScale = origin.meterInMercatorCoordinateUnits();
  const cosLat = Math.cos((ORIGIN_LAT * Math.PI) / 180);

  // Same scene→mercator transform pattern as billboard3dLayer
  const sceneTransform = new THREE.Matrix4()
    .makeTranslation(origin.x, origin.y, origin.z)
    .scale(new THREE.Vector3(mScale, -mScale, mScale))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  let renderer: THREE.WebGLRenderer | null = null;
  let mapRef: mapboxgl.Map | null = null;
  let visible = true;
  let lastT = performance.now();

  const peds = initPeds();

  // Unit geometries — scaled per-instance via matrix
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
  const sphGeo = new THREE.SphereGeometry(1, 8, 6);
  const cirGeo = new THREE.CircleGeometry(1, 10);

  let torsos: THREE.InstancedMesh;
  let leftArms: THREE.InstancedMesh;
  let rightArms: THREE.InstancedMesh;
  let leftLegs: THREE.InstancedMesh;
  let rightLegs: THREE.InstancedMesh;
  let heads: THREE.InstancedMesh;
  let shadows: THREE.InstancedMesh;

  function build() {
    const n = PEDESTRIAN_COUNT;
    const shirtMat = new THREE.MeshBasicMaterial({ color: SHIRT_COLOR });
    const pantsMat = new THREE.MeshBasicMaterial({ color: PANTS_COLOR });
    const headMat = new THREE.MeshBasicMaterial({ color: HEAD_COLOR });
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      opacity: 0.22,
      transparent: true,
      depthWrite: false,
    });
    torsos    = new THREE.InstancedMesh(cylGeo, shirtMat, n);
    leftArms  = new THREE.InstancedMesh(cylGeo, shirtMat, n);
    rightArms = new THREE.InstancedMesh(cylGeo, shirtMat, n);
    leftLegs  = new THREE.InstancedMesh(cylGeo, pantsMat, n);
    rightLegs = new THREE.InstancedMesh(cylGeo, pantsMat, n);
    heads     = new THREE.InstancedMesh(sphGeo, headMat, n);
    shadows   = new THREE.InstancedMesh(cirGeo, shadowMat, n);
    scene.add(shadows, torsos, leftArms, rightArms, leftLegs, rightLegs, heads);
  }

  function tick(now: number) {
    const dt = Math.min(now - lastT, 60);
    lastT = now;
    const elapsed = now * 0.001;

    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];

      // Advance position
      if (now >= p.nextTurn) {
        p.bearing = rnd(0, Math.PI * 2);
        p.nextTurn = now + p.turnEvery;
      }
      p.lng += Math.sin(p.bearing) * SPD * dt;
      p.lat += Math.cos(p.bearing) * SPD * dt;
      if (p.lng < SF.minLng || p.lng > SF.maxLng) {
        p.bearing = Math.PI - p.bearing;
        p.lng = Math.max(SF.minLng, Math.min(SF.maxLng, p.lng));
      }
      if (p.lat < SF.minLat || p.lat > SF.maxLat) {
        p.bearing = -p.bearing;
        p.lat = Math.max(SF.minLat, Math.min(SF.maxLat, p.lat));
      }

      // World position in scene meters (X = east, Z = south)
      const wx = (p.lng - ORIGIN_LNG) * M_PER_LNG * cosLat;
      const wz = -(p.lat - ORIGIN_LAT) * M_PER_LAT;

      // Walk phase
      const sw = Math.sin(p.phase + elapsed * WALK_FREQ * Math.PI * 2);

      // Rotate local body points into world space.
      // bearing=0 → north (-Z), bearing=π/2 → east (+X).
      // Derivation: theta = π - bearing for Three.js Ry convention.
      // Simplified: wx' = wx + (-lx*cb + lz*sb), wz' = wz + (-lx*sb - lz*cb)
      const cb = Math.cos(p.bearing), sb = Math.sin(p.bearing);
      const rot = (lx: number, ly: number, lz: number): [number, number, number] => [
        wx + (-lx * cb + lz * sb),
        ly,
        wz + (-lx * sb - lz * cb),
      ];

      const [hLx, hLy, hLz] = rot(-HIP_X,     HIP_Y,   0);
      const [hRx, hRy, hRz] = rot(+HIP_X,     HIP_Y,   0);
      const [sLx, sLy, sLz] = rot(-SHOULDER_X, CHEST_Y, 0);
      const [sRx, sRy, sRz] = rot(+SHOULDER_X, CHEST_Y, 0);
      const [px,  py,  pz]  = rot(0,            HIP_Y,   0);
      const [cx,  cy,  cz]  = rot(0,            CHEST_Y, 0);
      const [fLx, fLy, fLz] = rot(-HIP_X,     FOOT_Y,   sw * LEG_SWING);
      const [fRx, fRy, fRz] = rot(+HIP_X,     FOOT_Y,  -sw * LEG_SWING);
      const [aLx, aLy, aLz] = rot(-SHOULDER_X, HAND_Y,  -sw * ARM_SWING);
      const [aRx, aRy, aRz] = rot(+SHOULDER_X, HAND_Y,   sw * ARM_SWING);
      const [hdx, hdy, hdz] = rot(0,            HEAD_Y,   0);

      setLimb(torsos,    i, px,  py,  pz,  cx,  cy,  cz,  TORSO_R);
      setLimb(leftLegs,  i, hLx, hLy, hLz, fLx, fLy, fLz, LIMB_R);
      setLimb(rightLegs, i, hRx, hRy, hRz, fRx, fRy, fRz, LIMB_R);
      setLimb(leftArms,  i, sLx, sLy, sLz, aLx, aLy, aLz, LIMB_R);
      setLimb(rightArms, i, sRx, sRy, sRz, aRx, aRy, aRz, LIMB_R);

      _m.compose(_c.set(hdx, hdy, hdz), _q.identity(), _s.set(HEAD_R, HEAD_R, HEAD_R));
      heads.setMatrixAt(i, _m);

      _m.compose(
        _c.set(wx, 0.05, wz),
        _shadowQ,
        _s.set(HIP_X * 2.2, 1, HIP_X * 2.2),
      );
      shadows.setMatrixAt(i, _m);
    }

    torsos.instanceMatrix.needsUpdate    = true;
    leftArms.instanceMatrix.needsUpdate  = true;
    rightArms.instanceMatrix.needsUpdate = true;
    leftLegs.instanceMatrix.needsUpdate  = true;
    rightLegs.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate     = true;
    shadows.instanceMatrix.needsUpdate   = true;
  }

  return {
    id,
    type: "custom" as const,
    renderingMode: "3d" as const,

    onAdd(map, gl) {
      mapRef = map;
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl as WebGLRenderingContext,
        antialias: true,
      });
      renderer.autoClear = false;
      build();
    },

    render(_gl, matrix) {
      if (!renderer || !mapRef || !visible) return;
      const arr = Array.isArray(matrix)
        ? (matrix as number[])
        : ((matrix as { defaultProjectionData?: { mainMatrix?: number[] } })
            ?.defaultProjectionData?.mainMatrix ?? (matrix as unknown as number[]));
      camera.projectionMatrix = new THREE.Matrix4().fromArray(arr).multiply(sceneTransform);
      tick(performance.now());
      renderer.resetState();
      renderer.render(scene, camera);
      mapRef.triggerRepaint();
    },

    onRemove() {
      renderer?.dispose();
      renderer = null;
      scene.clear();
      mapRef = null;
    },

    setVisible(v: boolean) {
      visible = v;
      if (v) mapRef?.triggerRepaint();
    },
  };
}
