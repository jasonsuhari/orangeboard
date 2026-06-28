"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { ContactShadows, Float, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/* ──────────────────────────────────────────────────────────────────────────
   A real 3D billboard you can orbit. The generated creative is mapped onto the
   panel as a live texture; the panel emits a faint glow to read like a lit OOH
   display. Lighting is local (no network HDR) so it works fully offline.
   ────────────────────────────────────────────────────────────────────────── */

const PANEL_W = 6.6;
const PANEL_H = PANEL_W * (9 / 16);

function Panel({ imageUrl }: { imageUrl: string }) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh position={[0, 0, 0.06]}>
      <planeGeometry args={[PANEL_W, PANEL_H]} />
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive={"#ffffff"}
        emissiveIntensity={0.32}
        roughness={0.5}
        metalness={0}
        toneMapped={false}
      />
    </mesh>
  );
}

function Structure() {
  const frame = "#161616";
  const metal = "#2a2a2a";
  return (
    <group>
      {/* Frame */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[PANEL_W + 0.5, PANEL_H + 0.5, 0.18]} />
        <meshStandardMaterial color={frame} roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Backing */}
      <mesh position={[0, 0, -0.12]}>
        <boxGeometry args={[PANEL_W + 0.2, PANEL_H + 0.2, 0.1]} />
        <meshStandardMaterial color={"#0c0c0c"} roughness={0.9} />
      </mesh>
      {/* Support poles */}
      {[-1.4, 1.4].map((x) => (
        <mesh key={x} position={[x, -PANEL_H / 2 - 1.7, -0.2]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 3.6, 16]} />
          <meshStandardMaterial color={metal} roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
      {/* Cross brace */}
      <mesh position={[0, -PANEL_H / 2 - 0.4, -0.2]}>
        <boxGeometry args={[3.1, 0.16, 0.16]} />
        <meshStandardMaterial color={metal} roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Two little top spotlights */}
      {[-1.6, 1.6].map((x) => (
        <mesh key={`l${x}`} position={[x, PANEL_H / 2 + 0.55, 0.5]} rotation={[Math.PI / 4, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.18, 0.34, 12]} />
          <meshStandardMaterial color={"#1c1c1c"} metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  // Gentle idle sway so it feels alive even without user interaction.
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = Math.sin(t * 0.25) * 0.18;
  });
  return <group ref={ref}>{children}</group>;
}

function Loader() {
  return (
    <Html center>
      <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-600 shadow">
        Rendering…
      </div>
    </Html>
  );
}

export default function Billboard3D({ imageUrl }: { imageUrl: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.6, 9], fov: 38 }}
      gl={{ antialias: true, toneMappingExposure: 1.1 }}
    >
      <color attach="background" args={["#f4f4f5"]} />
      <fog attach="fog" args={["#f4f4f5", 14, 26]} />

      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 6]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 3, -4]} intensity={0.5} color={"#ffd9a8"} />
      <pointLight position={[0, 2, 4]} intensity={18} color={"#fb923c"} distance={12} />

      <Suspense fallback={<Loader />}>
        <Float speed={1.2} rotationIntensity={0.12} floatIntensity={0.35}>
          <Rig>
            <Structure />
            {ready && <Panel imageUrl={imageUrl} />}
          </Rig>
        </Float>
      </Suspense>

      <ContactShadows position={[0, -PANEL_H / 2 - 3.5, 0]} opacity={0.35} scale={18} blur={2.6} far={6} />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.9}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
      />
    </Canvas>
  );
}
