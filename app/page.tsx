import Link from "next/link";

const proofItems = [
  "Buyer clusters",
  "Board availability",
  "Street previews",
];

const campaignSignals = [
  ["ICP", "Series B finance teams"],
  ["Area", "SoMa commute corridor"],
  ["Flight", "4 week local push"],
];

export default function Home() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      <video
        className="absolute inset-0 h-full w-full object-cover object-center"
        poster="/peel-placeholder-poster.png"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/peel-placeholder-bg.mp4" type="video/mp4" />
      </video>

      <header className="relative z-20 flex h-[72px] items-center justify-between px-5 [text-shadow:0_2px_14px_rgba(0,0,0,0.38)] sm:px-8 lg:px-12">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Peel home">
          <PeelMark />
          <span className="text-3xl font-black tracking-[-0.08em] sm:text-[2.5rem]">
            Peel
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-black text-white/78 md:flex">
          <Link href="/map" className="transition hover:text-white">
            Map
          </Link>
          <Link href="/sightline" className="transition hover:text-white">
            Sightline
          </Link>
          <Link href="/vision" className="transition hover:text-white">
            Studio
          </Link>
        </nav>

        <Link
          href="/map"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-white px-4 text-sm font-black text-[#ef4c00] shadow-[0_18px_48px_rgba(0,0,0,0.2)] [text-shadow:none] transition hover:-translate-y-0.5 hover:bg-orange-50 active:translate-y-0"
        >
          Open map
        </Link>
      </header>

      <section className="relative z-10 grid h-[calc(100dvh-72px)] min-h-0 grid-cols-1 lg:grid-cols-[44%_56%]">
        <div className="flex min-h-0 flex-col justify-center px-5 pb-8 pt-3 [text-shadow:0_3px_20px_rgba(0,0,0,0.42)] sm:px-8 lg:px-12 lg:pb-12">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-white/72 sm:text-xs">
            Physical ABM for B2B teams
          </p>

          <h1 className="max-w-[720px] text-[clamp(3rem,8vw,7rem)] font-black leading-[0.88] tracking-[-0.08em] lg:text-[clamp(4.6rem,5.45vw,7.2rem)]">
            Campaigns buyers can&apos;t miss.
          </h1>

          <p className="mt-6 max-w-[540px] text-base font-bold leading-7 text-white/86 sm:text-lg">
            Plan local boards, preview the street, and turn physical presence into sales motion.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/map"
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-[#ef4c00] shadow-[0_18px_50px_rgba(0,0,0,0.24)] [text-shadow:none] transition hover:-translate-y-0.5 hover:bg-orange-50 active:translate-y-0"
            >
              Plan a campaign
            </Link>
            <Link
              href="/sightline"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/65 bg-black/12 px-6 text-sm font-black text-white [text-shadow:none] transition hover:-translate-y-0.5 hover:bg-black/20 active:translate-y-0"
            >
              Preview placement
            </Link>
          </div>

          <div className="mt-8 grid max-w-[560px] grid-cols-3 gap-2">
            {proofItems.map((item) => (
              <div key={item} className="rounded-2xl border border-white/24 bg-black/16 px-3 py-3 backdrop-blur-md">
                <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-white/62">
                  {item.split(" ")[0]}
                </span>
                <span className="mt-1 block text-sm font-black leading-tight">
                  {item.split(" ").slice(1).join(" ") || item}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative hidden min-h-0 items-center justify-center lg:flex">
          <CampaignPreview />
        </div>
      </section>
    </main>
  );
}

function PeelMark() {
  return (
    <span className="relative block h-12 w-12 shrink-0 sm:h-16 sm:w-16" aria-hidden="true">
      <span className="absolute left-[14%] top-[42%] h-[44%] w-[28%] rounded-b-lg rounded-tl-lg bg-white shadow-[0_12px_30px_rgba(126,38,0,0.12)]" />
      <span className="absolute left-[20%] top-[10%] h-[58%] w-[64%] rounded-full bg-white shadow-[0_18px_38px_rgba(126,38,0,0.16)]" />
      <span className="absolute left-[16%] top-[12%] h-[42%] w-[42%] rounded-br-[70%] rounded-tl-full bg-white/88" />
      <span className="absolute left-[15%] top-[48%] h-[21%] w-[28%] rounded-tl-lg bg-orange-100" />
    </span>
  );
}

function CampaignPreview() {
  return (
    <div className="relative h-[min(62vh,560px)] w-[min(48vw,760px)] rounded-[2rem] border border-white/22 bg-white/14 p-4 shadow-[0_40px_120px_rgba(100,28,0,0.3)] backdrop-blur-md">
      <div className="flex h-full flex-col overflow-hidden rounded-[1.45rem] border border-white/20 bg-white/86 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
        <div className="flex h-14 items-center justify-between border-b border-orange-100 px-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ef4c00]">
              Campaign cockpit
            </p>
            <p className="mt-0.5 text-sm font-black tracking-[-0.03em]">
              SoMa finance launch
            </p>
          </div>
          <span className="rounded-full bg-[#ef4c00] px-3 py-1 text-xs font-black text-white">
            Ready
          </span>
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-[1fr_230px]">
          <div className="relative overflow-hidden bg-[#ffefe3]">
            <span className="absolute left-[6%] top-[50%] h-3 w-[92%] -rotate-6 rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.52)]" />
            <span className="absolute left-[42%] top-[-10%] h-[120%] w-5 rotate-12 rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.52)]" />
            <span className="absolute left-[60%] top-[-8%] h-[118%] w-5 rotate-[-18deg] rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.52)]" />
            <span className="absolute left-[14%] top-[30%] h-16 w-28 rounded-md bg-white shadow-[0_24px_0_#ffd6b8]" />
            <span className="absolute left-[28%] top-[64%] h-20 w-32 rounded-md bg-white shadow-[0_28px_0_#ffd6b8]" />
            <span className="absolute left-[58%] top-[34%] h-20 w-36 rounded-md bg-white shadow-[0_28px_0_#ffd6b8]" />
            <span className="absolute left-[70%] top-[66%] h-16 w-28 rounded-md bg-white shadow-[0_24px_0_#ffd6b8]" />
            <Billboard left="23%" top="58%" label="1" />
            <Billboard left="55%" top="46%" label="80" />
            <Billboard left="78%" top="62%" label="1C" />
            <span className="absolute left-[48%] top-[48%] h-32 w-44 rounded-[48%] border-2 border-[#ef4c00]/60 bg-[#ef4c00]/14" />
          </div>

          <aside className="flex flex-col gap-3 border-l border-orange-100 bg-white px-4 py-4">
            {campaignSignals.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#ef4c00]">
                  {label}
                </p>
                <p className="mt-1 text-sm font-black leading-tight text-ink">
                  {value}
                </p>
              </div>
            ))}
            <div className="mt-auto rounded-2xl bg-ink px-4 py-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/52">
                Next action
              </p>
              <p className="mt-2 text-lg font-black leading-tight tracking-[-0.04em]">
                Generate board creative and sales hooks.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Billboard({ left, top, label }: { left: string; top: string; label: string }) {
  return (
    <span className="absolute -translate-x-1/2 -translate-y-full" style={{ left, top }}>
      <span className="grid h-8 w-20 place-items-center rounded border-[3px] border-white bg-[#0968ff] text-[10px] font-black text-white shadow-[0_12px_22px_rgba(13,63,165,0.22)]">
        {label}
      </span>
      <span className="mx-auto block h-7 w-1 bg-white" />
    </span>
  );
}
