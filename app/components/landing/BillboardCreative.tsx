/* What peeling the orange poster exposes: the board's other creative.
   Mirrors the isometric rooftop billboard's crossfade Easter egg
   (app/components/city/structures.tsx — orange "peel" ↔ white "OOH, hi."). */

export default function BillboardCreative() {
  return (
    <div className="relative grid h-full w-full place-items-center bg-white">
      <p className="text-[clamp(3rem,11vw,10rem)] font-bold tracking-[-0.045em] text-[#ef4c00]">
        OOH, hi.
      </p>
      <p className="absolute bottom-[3%] right-[3%] text-[clamp(0.9rem,1.6vw,1.4rem)] font-bold tracking-[-0.02em] text-[#ef4c00]/60">
        peel
      </p>
    </div>
  );
}
