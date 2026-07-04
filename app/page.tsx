import Image from "next/image";
import Link from "next/link";
import IsometricCity from "./components/IsometricCity";
import WaitlistForm from "./components/WaitlistForm";
import PeelScrollStage from "./components/landing/PeelScrollStage";
import CityscapeBackdrop from "./components/landing/CityscapeBackdrop";
import BillboardCreative from "./components/landing/BillboardCreative";
import FinalCta from "./components/landing/FinalCta";
import ScrollCue from "./components/landing/ScrollCue";
import { GRAIN } from "./components/landing/stage";

export default function Home() {
  return (
    <main className="relative w-full bg-[#160a05] font-sans text-white antialiased selection:bg-white selection:text-[#ef4c00]">
      {/* The scroll story: the orange hero is a poster being peeled off a
          billboard (app/components/landing/PeelScrollStage.tsx). Everything
          below renders inside the stage's poster layer, which supplies the
          100dvh size, orange base, and overflow clip the <main> used to own —
          so the hero lays out exactly as the old static page. */}
      <PeelScrollStage
        backdrop={<CityscapeBackdrop />}
        underCreative={<BillboardCreative />}
        cta={<FinalCta />}
      >
      {/* ── Atmosphere: a cinematic golden-hour grade layered over the page.
          The stack gives the background real tonal range — luminous sky, a warm sun,
          a deep ember pool the copy sits in, a cool counter-glow where the blue
          signals live, and a vignette that closes the frame. */}

      {/* Sky: bright near the sun, deepening to ember toward the top and floor. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,182,116,0.32) 0%, rgba(255,140,72,0.04) 26%, transparent 52%, rgba(92,22,0,0.30) 84%, rgba(64,14,0,0.62) 100%)",
        }}
      />
      {/* The sun — a soft warm bloom seated in the top-left corner. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(68% 56% at 8% -6%, rgba(255,214,162,0.66) 0%, rgba(255,164,98,0.16) 34%, transparent 58%)",
        }}
      />
      {/* Deep ember pooling into the bottom-left — the shadow the copy sits in.
          This is what pushes the white type comfortably past AA contrast. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(118% 116% at -6% 100%, rgba(92,20,0,0.9) 0%, rgba(92,20,0,0.34) 40%, transparent 62%)",
        }}
      />
      {/* Left column scrim — anchors the copy on a darker base and focuses
          the eye left-to-right. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] hidden sm:block"
        style={{
          background:
            "linear-gradient(90deg, rgba(74,16,0,0.66) 0%, rgba(74,16,0,0.42) 26%, rgba(74,16,0,0.18) 46%, rgba(74,16,0,0.05) 58%, transparent 66%)",
        }}
      />
      {/* Bottom scrim — grounds the scene and keeps the footer legible. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] hidden h-40 bg-gradient-to-t from-[rgba(56,12,0,0.6)] to-transparent sm:block"
      />
      {/* Cool counter-glow — a whisper of blue haze on the far side. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] hidden mix-blend-screen sm:block"
        style={{
          background:
            "radial-gradient(56% 60% at 98% 26%, rgba(40,84,190,0.22) 0%, rgba(40,84,190,0.05) 42%, transparent 66%)",
        }}
      />
      {/* Edge vignette — closes the frame so the scene feels composed, not clipped. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(132% 106% at 55% 38%, transparent 52%, rgba(48,10,0,0.62) 100%)",
        }}
      />
      {/* A crisp sheen along the very top edge — the polished lip of the label. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[6] h-px bg-gradient-to-r from-transparent via-white/45 to-transparent"
      />
      {/* Mobile: the background solidifies into ember so the headline, copy,
          and form all sit on a legible base. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[6] sm:hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(90,22,0,0.35) 0%, rgba(239,76,0,0.06) 16%, rgba(239,76,0,0.5) 36%, rgba(239,76,0,0.94) 48%, #ef4c00 60%)",
        }}
      />

      {/* The city the boards live in — a cool slate diorama seated stage
          right, above the warm grade so its palette stays true against the
          orange. Only the grain sits over it. On phones it lives in the sky
          area above the headline. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[6] overflow-hidden sm:flex sm:items-center">
        <IsometricCity
          className="animate-fade-up absolute top-[1.5%] right-[-4vw] w-[94vw] max-w-none opacity-95 sm:static sm:ml-auto sm:mr-[3vw] sm:w-[min(72vw,1040px)] sm:opacity-100"
          style={{ animationDelay: "380ms" }}
        />
      </div>

      {/* Film grain — the finishing texture over everything. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[7] opacity-[0.06] mix-blend-soft-light"
        style={{ backgroundImage: GRAIN, backgroundSize: "140px 140px" }}
      />

      {/* Signature: the peel. The page is a label whose corner is lifting. */}
      <PeelCorner />

      {/* Foreground UI. */}
      <div data-peel="hero-copy" className="pointer-events-none relative z-10 flex h-full flex-col">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10 lg:px-16">
          <PeelWordmark />
        </header>

        <div className="flex flex-1 items-center px-6 sm:px-10 lg:px-16">
          <div className="max-w-xl pb-10">
            <div
              className="animate-rise mb-6 flex items-center gap-3"
              style={{ animationDelay: "40ms" }}
            >
              <span
                aria-hidden="true"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] border border-white/65 bg-[#ff5a00] text-[18px] font-bold leading-none text-white shadow-[0_2px_8px_-2px_rgba(60,14,0,0.6)]"
              >
                Y
              </span>
              <Link
                href="https://vibeapps.dev/s/peel"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-white/85 underline decoration-white/35 underline-offset-4 transition hover:text-white hover:decoration-white"
              >
                <span className="font-bold text-white">#1</span> in YC AI Growth Hackathon
              </Link>
            </div>

            <h1
              className="animate-rise text-[clamp(2.7rem,5.6vw,5rem)] font-bold leading-[0.95] tracking-[-0.035em] [text-wrap:balance]"
              style={{ animationDelay: "110ms" }}
            >
              <span
                className="animate-sheen block bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(105deg,#ffffff 0%,#ffffff 34%,#fff6ee 46%,#ffdcc2 50%,#fff6ee 54%,#ffffff 66%,#ffffff 100%)",
                  backgroundSize: "220% 100%",
                }}
              >
                Reach buyers
              </span>
              <span className="mt-1 block font-serif text-[1.05em] font-normal italic leading-[1.04] tracking-[-0.01em] text-[#ffd7ba]">
                where screens can&rsquo;t.
              </span>
            </h1>

            <p
              className="animate-rise mt-6 max-w-md text-lg font-normal leading-relaxed text-white/90"
              style={{ animationDelay: "185ms" }}
            >
              Peel finds where your accounts cluster in the real world, books the boards that
              reach them, and turns physical presence into pipeline.
            </p>

            <div className="animate-rise mt-8" style={{ animationDelay: "260ms" }}>
              <WaitlistForm />
            </div>
          </div>
        </div>

      </div>

      {/* Invitation at the bottom edge: scrolling is what peels the poster. */}
      <ScrollCue />
      </PeelScrollStage>
    </main>
  );
}

function PeelWordmark() {
  return (
    <Link
      href="/"
      className="pointer-events-auto inline-flex select-none items-center"
      aria-label="Peel home"
    >
      <Image
        src="/peel-logo.png"
        alt=""
        width={937}
        height={420}
        priority
        className="h-[clamp(2.4rem,3.8vw,3.2rem)] w-auto"
      />
    </Link>
  );
}

/* Signature element: the top-right corner of the "label" curling up to reveal
   a warm underside. Purely decorative; hidden from assistive tech and on small screens. */
function PeelCorner() {
  return (
    <div
      data-peel="corner"
      aria-hidden
      className="animate-peel-lift pointer-events-none absolute -right-px -top-px z-[8] hidden h-[202px] w-[202px] md:block"
      style={{ transformOrigin: "top right" }}
    >
      <svg viewBox="0 0 168 168" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id="peel-under" x1="168" y1="0" x2="60" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff4ea" />
            <stop offset="0.5" stopColor="#ffd9be" />
            <stop offset="1" stopColor="#ffb27f" />
          </linearGradient>
          <filter id="peel-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="-6" dy="7" stdDeviation="7" floodColor="#4a1200" floodOpacity="0.42" />
          </filter>
        </defs>
        {/* The lifted flap — a triangle folded back from the corner. */}
        <path
          d="M168 0 L168 118 C132 96 96 60 74 20 C68 8 64 2 60 0 Z"
          fill="url(#peel-under)"
          filter="url(#peel-shadow)"
        />
        {/* A crisp highlight along the fold. */}
        <path
          d="M60 0 C64 2 68 8 74 20 C96 60 132 96 168 118"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    </div>
  );
}
