import * as THREE from "three";
import mapboxgl from "mapbox-gl";

// A Mapbox custom layer that renders the billboard inventory as real 3D models
// inside the map's WebGL world. The billboard design mirrors sightline's: a flat
// PlaneGeometry panel with an *unlit* MeshBasicMaterial (so the ad creative reads
// at full brightness regardless of the dusk map lighting) carried on two thin
// steel poles inset from the panel edges. All signs share three InstancedMeshes
// (panel + left pole + right pole batched), so 559 boards stay a few draw calls.
//
// The whole Three scene is anchored at the inventory centroid and each instance is
// placed in meters relative to that origin, then mapped into the map's mercator
// world with the standard Mapbox + Three.js transform.

export type BillboardPoint = { lng: number; lat: number };

export interface Billboard3DLayer extends mapboxgl.CustomLayerInterface {
  setCreative(url: string): void;
}

// Real-bulletin-ish proportions (a 48ft × 14ft board ≈ 14.6m × 4.3m), poles to
// match sightline (thin cylinders inset ~28% of the width from center).
const PANEL_W = 14; // sign width, meters
const PANEL_H = 4.6; // sign height
const CLEARANCE = 11; // pole height to the bottom of the panel
const POLE_R = 0.13; // pole radius
const POLE_INSET = PANEL_W * 0.28; // each pole offset from center
const POLE_COLOR = 0x8a9ab0; // light steel blue (sightline)
const PANEL_FALLBACK = 0xdfe3e8; // blank panel until the creative loads

// The mercator transform is a reflection (negative Y), which mirrors the panel
// texture left-to-right. Flip the texture's X to read correctly.
const MIRROR_TEXTURE_X = true;

const M_PER_LAT = 110540;
const M_PER_LNG = 111320;

// Stable per-sign heading so the city doesn't look like every board faces the
// same way. Derived from coordinates → deterministic, no heading data needed.
function pseudoYaw(p: BillboardPoint): number {
  const h = Math.sin(p.lng * 7919.7) * 43758.5453 + Math.cos(p.lat * 5147.3) * 12543.1;
  return (h - Math.floor(h)) * Math.PI * 2;
}

export function createBillboard3DLayer(opts: {
  id: string;
  points: BillboardPoint[];
  creativeUrl: string;
}): Billboard3DLayer {
  const { id, points } = opts;

  // Anchor the scene at the inventory centroid so one mercator transform covers all.
  const originLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const originLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const origin = mapboxgl.MercatorCoordinate.fromLngLat([originLng, originLat], 0);
  // Mercator units per meter at this latitude — converts the meter-defined
  // geometry into the map's mercator world space.
  const scale = origin.meterInMercatorCoordinateUnits();
  const cosLat = Math.cos((originLat * Math.PI) / 180);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  let renderer: THREE.WebGLRenderer | null = null;
  let mapRef: mapboxgl.Map | null = null;
  let panelMaterial: THREE.MeshBasicMaterial | null = null;

  // Scene → mercator: y-up Three space becomes mercator (rotateX 90°, y negated).
  const sceneTransform = new THREE.Matrix4()
    .makeTranslation(origin.x, origin.y, origin.z)
    .scale(new THREE.Vector3(scale, -scale, scale))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));

  function loadCreative(url: string) {
    if (!panelMaterial) return;
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        if (!panelMaterial) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        if (MIRROR_TEXTURE_X) {
          tex.wrapS = THREE.RepeatWrapping;
          tex.repeat.x = -1;
          tex.offset.x = 1;
        }
        panelMaterial.map = tex;
        panelMaterial.color.set(0xffffff);
        panelMaterial.needsUpdate = true;
        mapRef?.triggerRepaint();
      },
      undefined,
      () => {
        /* keep the blank panel if the creative can't be loaded (e.g. CORS) */
      }
    );
  }

  function build() {
    const n = points.length;

    // Panel — a flat plane standing on top of the poles, normal facing +Z (yawed
    // per board). Unlit so the creative is always legible.
    const panelGeo = new THREE.PlaneGeometry(PANEL_W, PANEL_H).translate(
      0,
      CLEARANCE + PANEL_H / 2,
      0
    );
    panelMaterial = new THREE.MeshBasicMaterial({
      color: PANEL_FALLBACK,
      side: THREE.DoubleSide,
    });
    const panels = new THREE.InstancedMesh(panelGeo, panelMaterial, n);

    // Poles — two thin cylinders per board, ground (y=0) up to the panel base.
    const poleGeo = new THREE.CylinderGeometry(POLE_R, POLE_R, CLEARANCE, 8).translate(
      0,
      CLEARANCE / 2,
      0
    );
    const poleMat = new THREE.MeshBasicMaterial({
      color: POLE_COLOR,
      side: THREE.DoubleSide,
    });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, n * 2);

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const up = new THREE.Vector3(0, 1, 0);

    points.forEach((p, i) => {
      const eastM = (p.lng - originLng) * M_PER_LNG * cosLat;
      const northM = (p.lat - originLat) * M_PER_LAT;
      const yaw = pseudoYaw(p);
      // -north: mercator y grows southward.
      const bx = eastM;
      const bz = -northM;

      q.setFromAxisAngle(up, yaw);
      pos.set(bx, 0, bz);
      m.compose(pos, q, one);
      panels.setMatrixAt(i, m);

      // Pole offsets along the panel's width axis (local X), rotated by yaw:
      //   Ry(yaw) · (±inset, 0, 0) = (±inset·cos, 0, ∓inset·sin)
      const ox = Math.cos(yaw) * POLE_INSET;
      const oz = -Math.sin(yaw) * POLE_INSET;
      pos.set(bx - ox, 0, bz - oz);
      m.compose(pos, q, one); // rotation irrelevant for a round pole, kept for clarity
      poles.setMatrixAt(i * 2, m);
      pos.set(bx + ox, 0, bz + oz);
      m.compose(pos, q, one);
      poles.setMatrixAt(i * 2 + 1, m);
    });
    panels.instanceMatrix.needsUpdate = true;
    poles.instanceMatrix.needsUpdate = true;
    scene.add(poles, panels);

    loadCreative(opts.creativeUrl);
  }

  return {
    id,
    type: "custom",
    renderingMode: "3d",

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
      if (!renderer) return;
      // Mercator projection passes the matrix as a flat array; tolerate the
      // globe-projection object shape too.
      const arr = Array.isArray(matrix)
        ? (matrix as number[])
        : ((matrix as { defaultProjectionData?: { mainMatrix?: number[] } })
            ?.defaultProjectionData?.mainMatrix ?? (matrix as unknown as number[]));
      camera.projectionMatrix = new THREE.Matrix4().fromArray(arr).multiply(sceneTransform);
      renderer.resetState();
      renderer.render(scene, camera);
    },

    onRemove() {
      renderer?.dispose();
      renderer = null;
      scene.clear();
    },

    setCreative(url: string) {
      loadCreative(url);
    },
  };
}
