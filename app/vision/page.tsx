import Link from "next/link";
import VisionStudio from "../components/VisionStudio";

export const metadata = {
  title: "Vision Studio — Peel",
  description: "Upload a street photo and predict whether the billboard gets seen.",
};

export default function VisionPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-500 text-white shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="5" width="18" height="11" rx="2" fill="currentColor" />
                <path d="M12 16v4M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-[17px] font-semibold tracking-tight">Peel</span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-neutral-600">
            <Link href="/map" className="transition hover:text-ink">
              Open the board
            </Link>
            <Link href="/" className="transition hover:text-ink">
              Home
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Agent vision · street scene
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Would anyone <span className="text-orange-500">notice</span> this billboard?
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-neutral-600">
            Upload a street photo with a billboard in it. A bottom-up saliency model predicts where
            the eye goes, a VLM locates the board and reacts to the scene, and synthetic viewers tell
            you how many seconds it takes to get noticed — if it ever does.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Chip label="Bottom-up saliency" sub="Itti–Koch · in-browser" />
            <Chip label="Top-down VLM" sub="gpt-4o · scene + box" />
            <Chip label="Synthetic viewers" sub="dwell-budgeted" />
          </div>
        </div>

        <div className="mt-10">
          <VisionStudio />
        </div>
      </main>
    </div>
  );
}

function Chip({ label, sub }: { label: string; sub: string }) {
  return (
    <span className="inline-flex flex-col rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1">
      <span className="text-[11px] font-semibold text-ink">{label}</span>
      <span className="text-[10px] text-neutral-500">{sub}</span>
    </span>
  );
}
