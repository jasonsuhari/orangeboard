/* The world the billboard lives in — revealed as the scene zooms out.
   Coordinates: this root is the billboard face (the full 100dvh frame at
   scale 1). The oversized canvas is a 1:1 blueprint of the final viewport:
   sized 100% / S_FINAL (see stage.ts) and centered, so anything placed at
   X% of the canvas sits at X% of the viewport once the zoom settles. */

const POST_STYLE = { background: "linear-gradient(90deg, #3a1505, #1f0a02 70%)" };

export default function CityscapeBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0">
      {/* ── Scene canvas: 192.31% = 100% / S_FINAL — keep in sync with stage.ts. */}
      <div className="absolute left-1/2 top-1/2 h-[192.31%] w-[192.31%] -translate-x-1/2 -translate-y-1/2">
        {/* Dusk sky, deepening toward the ground. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #ffb474 0%, #ff8a3e 30%, #ef4c00 62%, #b93a00 100%)",
          }}
        />
        {/* The same sun that lights the poster, now seen over the city. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(40% 30% at 12% 8%, rgba(255,214,162,0.75) 0%, rgba(255,164,98,0.2) 40%, transparent 60%)",
          }}
        />
        {/* Flat clouds drifting in the upper third. */}
        <div className="absolute left-[16%] top-[10%] h-[3.5%] w-[14%] rounded-full bg-[#fff4ea]/15" />
        <div className="absolute left-[58%] top-[6%] h-[3%] w-[10%] rounded-full bg-[#fff4ea]/10" />
        <div className="absolute left-[74%] top-[14%] h-[2.6%] w-[12%] rounded-full bg-[#fff4ea]/10" />

        {/* Skyline: three depth bands, far → near. */}
        <svg
          className="absolute bottom-[6%] left-0 h-[34%] w-full"
          viewBox="0 0 1440 340"
          preserveAspectRatio="none"
        >
          <path
            d="M0 340 V210 H60 V150 H120 V230 H200 V120 H260 V200 H340 V90 H420 V190 H500 V140 H580 V240 H660 V110 H740 V210 H820 V160 H900 V70 H980 V200 H1060 V130 H1140 V220 H1220 V100 H1300 V180 H1380 V150 H1440 V340 Z"
            fill="#d4570e"
            opacity="0.55"
          />
        </svg>
        <svg
          className="absolute bottom-[6%] left-0 h-[28%] w-full"
          viewBox="0 0 1440 340"
          preserveAspectRatio="none"
        >
          <path
            d="M0 340 V160 H70 V100 H150 V200 H230 V80 H330 V180 H430 V130 H520 V230 H620 V100 H720 V190 H820 V60 H920 V170 H1030 V120 H1130 V210 H1230 V90 H1330 V160 H1440 V340 Z"
            fill="#a03806"
          />
        </svg>
        <svg
          className="absolute bottom-[6%] left-0 h-[20%] w-full"
          viewBox="0 0 1440 340"
          preserveAspectRatio="none"
        >
          <path
            d="M0 340 V180 H90 V120 H180 V220 H300 V60 H380 V200 H520 V140 H640 V260 H760 V90 H860 V210 H1000 V150 H1120 V240 H1240 V110 H1340 V190 H1440 V340 Z"
            fill="#4a1500"
          />
          {/* A few windows still lit at dusk. */}
          <g fill="#ffd88a" opacity="0.5">
            <rect x="316" y="92" width="12" height="16" />
            <rect x="344" y="122" width="12" height="16" />
            <rect x="316" y="152" width="12" height="16" />
            <rect x="106" y="140" width="11" height="14" />
            <rect x="134" y="170" width="11" height="14" />
            <rect x="548" y="164" width="12" height="16" />
            <rect x="586" y="196" width="12" height="16" />
            <rect x="782" y="116" width="12" height="16" />
            <rect x="812" y="150" width="12" height="16" />
            <rect x="1032" y="176" width="12" height="16" />
            <rect x="1258" y="134" width="12" height="16" />
            <rect x="1286" y="166" width="12" height="16" />
          </g>
        </svg>

        {/* Street level. */}
        <div className="absolute bottom-0 left-0 h-[6%] w-full bg-[#2b0d00]">
          <div className="h-px w-full bg-white/10" />
        </div>
      </div>

      {/* ── Billboard structure, in face coordinates. The frame is a solid
          slab — the creative layers above cover its center. */}
      <div
        className="absolute -inset-[2.6vmin] rounded-[6px] bg-[#241209]"
        style={{
          boxShadow:
            "inset 0 0 0 0.5vmin rgba(255,255,255,0.06), 0 40px 80px -30px rgba(20,5,0,0.55)",
        }}
      />
      {/* Support posts run from the frame down to the street (34.6dvh in
          scene units = 18dvh once the 0.52 zoom settles). */}
      <div className="absolute left-[28%] top-[calc(100%+2.6vmin)] h-[34.6dvh] w-[2.4vmin]" style={POST_STYLE} />
      <div className="absolute left-[68%] top-[calc(100%+2.6vmin)] h-[34.6dvh] w-[2.4vmin]" style={POST_STYLE} />
      {/* Maintenance catwalk along the bottom edge. */}
      <div className="absolute left-[8%] right-[8%] top-[calc(100%+2.6vmin)] h-[1.6vmin] bg-[#1f0a02]" />
    </div>
  );
}
