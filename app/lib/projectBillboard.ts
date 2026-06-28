// Perspective-projects a billboard's 4 corners into Street View Static image coords.
// Used by StreetViewComposite to auto-place the creative without ML detection.

type Corner = { x: number; y: number };
export type BillboardQuad = [Corner, Corner, Corner, Corner]; // TL, TR, BR, BL  (0–1 norm)

const SPEC = { w: 12, h: 5, cl: 4 }; // matches BillboardMeshLayer.tsx
const M_PER_LAT = 110_540;
const M_PER_LNG = 111_320;
const EYE_ALT = 1.5; // Street View camera eye height, metres

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }

/** Bearing in degrees clockwise from north: from (lat1,lng1) → (lat2,lng2). */
function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const phi1 = toRad(lat1), phi2 = toRad(lat2);
  const dl = toRad(lng2 - lng1);
  const y = Math.sin(dl) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/**
 * Projects the 4 corners of a standard SF billboard into normalised 0–1 image
 * coordinates for a Google Street View Static still with the given framing.
 *
 * The billboard is assumed to face the road (toward the pano) — which is true
 * for virtually every SF inventory sign. No random hash needed.
 *
 * Returns null if any corner is behind the camera or the board is out of frame.
 * Callers should fall back to DEFAULT_QUAD in that case.
 *
 * Corner order: TL, TR, BR, BL — matches StreetViewComposite's Quad type.
 */
export function projectBillboardCorners(
  billboard: { lng: number; lat: number },
  panoLocation: { lat: number; lng: number },
  cameraHeadingDeg: number,
  cameraPitchDeg = 8,
  fovDeg = 70,
): BillboardQuad | null {
  const fovH = toRad(fovDeg);
  const halfTanH = Math.tan(fovH / 2);
  // Street View image is 640×640 (square), so fovV = fovH
  const halfTanV = halfTanH;

  const camH = toRad(cameraHeadingDeg);
  const camP = toRad(cameraPitchDeg);
  const cosH = Math.cos(camH);
  const sinH = Math.sin(camH);
  const cosP = Math.cos(camP);
  const sinP = Math.sin(camP);

  // Billboard faces the pano — its side axis is perpendicular to that bearing.
  // This is correct for all road-facing signs: the face normal points toward the road.
  const facingDeg = bearingDeg(billboard.lat, billboard.lng, panoLocation.lat, panoLocation.lng);
  const faceH = toRad(facingDeg);
  const sideE = Math.sin(faceH + Math.PI / 2);
  const sideN = Math.cos(faceH + Math.PI / 2);
  const hw = SPEC.w / 2;

  const cosLat = Math.cos(toRad((billboard.lat + panoLocation.lat) / 2));
  const lngScale = M_PER_LNG * cosLat;

  const leftLng  = billboard.lng + (-sideE * hw) / lngScale;
  const leftLat  = billboard.lat + (-sideN * hw) / M_PER_LAT;
  const rightLng = billboard.lng + ( sideE * hw) / lngScale;
  const rightLat = billboard.lat + ( sideN * hw) / M_PER_LAT;

  const worldCorners: [number, number, number][] = [
    [leftLng,  leftLat,  SPEC.cl + SPEC.h], // TL
    [rightLng, rightLat, SPEC.cl + SPEC.h], // TR
    [rightLng, rightLat, SPEC.cl],          // BR
    [leftLng,  leftLat,  SPEC.cl],          // BL
  ];

  const projected: Corner[] = [];

  for (const [lng, lat, alt] of worldCorners) {
    const eastM  = (lng - panoLocation.lng) * lngScale;
    const northM = (lat - panoLocation.lat) * M_PER_LAT;
    const altM   = alt - EYE_ALT;

    // Rotate world offset into camera frame (yaw only)
    const right     = eastM * cosH - northM * sinH;
    const fwdGround = northM * cosH + eastM * sinH;

    // Apply camera pitch
    const fwdCam = fwdGround * cosP + altM * sinP;
    const upCam  = -fwdGround * sinP + altM * cosP;

    if (fwdCam <= 0) return null; // corner behind camera

    const u = 0.5 + right / (fwdCam * 2 * halfTanH);
    const v = 0.5 - upCam / (fwdCam * 2 * halfTanV);

    // Board is off-screen — caller falls back to DEFAULT_QUAD
    if (u < -0.2 || u > 1.2 || v < -0.2 || v > 1.2) return null;

    projected.push({ x: clamp(u, -0.1, 1.1), y: clamp(v, -0.1, 1.1) });
  }

  // Sort into image-space TL, TR, BR, BL order regardless of camera direction.
  // The world-space "left" corner doesn't always map to image-left.
  const byY = projected.slice().sort((a, b) => a.y - b.y);
  const top = byY.slice(0, 2).sort((a, b) => a.x - b.x);
  const bot = byY.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bot[1], bot[0]] as BillboardQuad; // TL, TR, BR, BL
}
