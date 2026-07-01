import Image from "next/image";
import Link from "next/link";

const cityBlocks = [
  { left: "6%", top: "48%", width: "18%", height: "22%", depth: 34 },
  { left: "17%", top: "24%", width: "10%", height: "15%", depth: 18 },
  { left: "25%", top: "54%", width: "14%", height: "20%", depth: 42 },
  { left: "36%", top: "31%", width: "16%", height: "13%", depth: 24 },
  { left: "46%", top: "50%", width: "12%", height: "18%", depth: 30 },
  { left: "54%", top: "18%", width: "12%", height: "14%", depth: 22 },
  { left: "62%", top: "39%", width: "17%", height: "16%", depth: 36 },
  { left: "72%", top: "58%", width: "18%", height: "18%", depth: 38 },
  { left: "79%", top: "21%", width: "11%", height: "12%", depth: 20 },
  { left: "87%", top: "42%", width: "13%", height: "16%", depth: 28 },
  { left: "11%", top: "72%", width: "12%", height: "14%", depth: 26 },
  { left: "31%", top: "76%", width: "18%", height: "18%", depth: 44 },
  { left: "59%", top: "72%", width: "13%", height: "13%", depth: 22 },
  { left: "82%", top: "73%", width: "15%", height: "17%", depth: 32 },
];

const billboardPins = [
  { left: "19%", top: "62%", label: "1", size: "medium" },
  { left: "51%", top: "45%", label: "80", size: "small" },
  { left: "69%", top: "28%", label: "1C", size: "small" },
  { left: "86%", top: "18%", label: "", size: "large" },
  { left: "88%", top: "64%", label: "", size: "large" },
];

const metrics = [
  { value: "48", label: "matched accounts" },
  { value: "12", label: "available boards" },
  { value: "3.8x", label: "local lift signal" },
  { value: "1", label: "campaign workspace" },
];

const steps = [
  {
    title: "Find account clusters",
    text: "Peel reads company, event, commute, and street-level signals to find where your ICP repeats.",
  },
  {
    title: "Pick physical inventory",
    text: "See nearby boards, visibility context, dwell assumptions, and buying details before you brief creative.",
  },
  {
    title: "Launch the outbound loop",
    text: "Generate location-native creative, project it into the street, then coordinate sales follow-up around the flight.",
  },
];

const signals = [
  "Office density",
  "Event weeks",
  "Transit corridors",
  "Competitor proximity",
  "Hiring momentum",
  "Foot traffic",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <Hero />
      <MetricStrip />
      <SignalSection />
      <WorkflowSection />
      <CreativeSection />
      <FinalCta />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#ff5a00] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.2),transparent_25%),radial-gradient(circle_at_74%_18%,rgba(255,216,176,0.32),transparent_30%),linear-gradient(135deg,#ff7200_0%,#ff4d00_42%,#f05a00_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f25500] to-transparent" />

      <nav className="relative z-20 mx-auto flex h-20 max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-3" aria-label="Peel home">
          <PeelMark />
          <span className="text-[2rem] font-black tracking-[-0.08em] sm:text-[2.75rem]">
            Peel
          </span>
        </Link>
        <div className="hidden items-center gap-8 text-sm font-bold text-white/80 md:flex">
          <a href="#signals" className="transition hover:text-white">
            Signals
          </a>
          <a href="#workflow" className="transition hover:text-white">
            Workflow
          </a>
          <a href="#creative" className="transition hover:text-white">
            Creative
          </a>
        </div>
        <Link
          href="/map"
          className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#ef4c00] shadow-[0_14px_40px_rgba(126,38,0,0.22)] transition hover:-translate-y-0.5 hover:bg-orange-50 active:translate-y-0"
        >
          Open map
        </Link>
      </nav>

      <div className="relative z-10 mx-auto grid min-h-[76dvh] max-w-[1500px] items-center gap-8 px-5 pb-14 pt-4 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:pb-14">
        <div className="max-w-[790px]">
          <p className="mb-5 text-xs font-black uppercase tracking-[0.28em] text-white/70">
            Physical ABM for B2B teams
          </p>
          <h1 className="text-[clamp(3rem,5.2vw,4.8rem)] font-black leading-[0.94] tracking-[-0.075em]">
            <span className="block">Launch your</span>
            <span className="block">physical ad campaigns</span>
            <span className="block">where your buyers</span>
            <span className="block">won&apos;t miss them</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg font-semibold leading-7 text-white/82">
            Target account clusters, book nearby boards, and ship localized creative from one workflow.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/map"
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-[#ef4c00] shadow-[0_18px_50px_rgba(126,38,0,0.26)] transition hover:-translate-y-0.5 hover:bg-orange-50 active:translate-y-0"
            >
              Plan a campaign
            </Link>
            <Link
              href="/sightline"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/55 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0"
            >
              Preview sightlines
            </Link>
          </div>
        </div>

        <CityScene />
      </div>
    </section>
  );
}

function PeelMark() {
  return (
    <span className="relative block h-14 w-14 shrink-0 sm:h-20 sm:w-20" aria-hidden="true">
      <span className="absolute left-[14%] top-[42%] h-[44%] w-[28%] rounded-b-lg rounded-tl-lg bg-white shadow-[0_12px_30px_rgba(126,38,0,0.12)]" />
      <span className="absolute left-[20%] top-[10%] h-[58%] w-[64%] rounded-full bg-white shadow-[0_18px_38px_rgba(126,38,0,0.16)]" />
      <span className="absolute left-[16%] top-[12%] h-[42%] w-[42%] rounded-br-[70%] rounded-tl-full bg-gradient-to-br from-white via-orange-50 to-[#ff8c42] opacity-95" />
      <span className="absolute left-[15%] top-[48%] h-[21%] w-[28%] rounded-tl-lg bg-gradient-to-br from-white to-[#ffb36f]" />
    </span>
  );
}

function CityScene() {
  return (
    <div className="relative hidden min-h-[560px] overflow-visible lg:block" aria-hidden="true">
      <div className="absolute -bottom-12 left-[-10%] h-[86%] w-[118%] [transform:perspective(980px)_rotateX(58deg)_rotateZ(-15deg)] [transform-origin:50%_80%]">
        <div className="absolute inset-0 rounded-[2rem] bg-white/10 shadow-[0_60px_130px_rgba(132,42,0,0.22)]" />

        <span className="absolute left-[-6%] top-[53%] h-[4.5%] w-[114%] rotate-[-2deg] rounded-full bg-white shadow-[0_0_0_9px_rgba(255,255,255,0.18)]" />
        <span className="absolute left-[44%] top-[-8%] h-[122%] w-[5%] rotate-[8deg] rounded-full bg-white shadow-[0_0_0_8px_rgba(255,255,255,0.18)]" />
        <span className="absolute left-[61%] top-[-11%] h-[128%] w-[5.5%] rotate-[18deg] rounded-full bg-white shadow-[0_0_0_8px_rgba(255,255,255,0.18)]" />
        <span className="absolute left-[2%] top-[34%] h-[3%] w-[96%] rotate-[15deg] rounded-full bg-white/95" />
        <span className="absolute left-[4%] top-[75%] h-[3.4%] w-[94%] rotate-[-11deg] rounded-full bg-white/95" />
        <span className="absolute left-[5%] top-[16%] h-[3%] w-[92%] rotate-[-4deg] rounded-full bg-white/90" />
        <span className="absolute left-[74%] top-[12%] h-[88%] w-[4.8%] rotate-[-30deg] rounded-full bg-white/95" />

        {cityBlocks.map((block) => (
          <span
            key={`${block.left}-${block.top}`}
            className="absolute rounded-[0.28rem] bg-white"
            style={{
              left: block.left,
              top: block.top,
              width: block.width,
              height: block.height,
              boxShadow: `0 ${block.depth}px 0 rgba(255,222,197,0.92), 0 ${block.depth + 14}px 24px rgba(139,45,0,0.16)`,
            }}
          />
        ))}

        <span className="absolute left-[49%] top-[55%] h-[23%] w-[22%] rounded-full border-[12px] border-white/95" />

        {billboardPins.map((pin) => (
          <BillboardPin key={`${pin.left}-${pin.top}`} {...pin} />
        ))}

        <span className="absolute left-[7%] top-[68%] h-4 w-2 rounded-full bg-[#0968ff]" />
        <span className="absolute left-[28%] top-[63%] h-4 w-2 rounded-full bg-[#0968ff]" />
        <span className="absolute left-[57%] top-[62%] h-4 w-2 rounded-full bg-[#0968ff]" />
        <span className="absolute left-[76%] top-[52%] h-4 w-2 rounded-full bg-[#0968ff]" />
        <span className="absolute left-[91%] top-[74%] h-4 w-2 rounded-full bg-[#0968ff]" />
      </div>
    </div>
  );
}

function BillboardPin({
  left,
  top,
  label,
  size,
}: {
  left: string;
  top: string;
  label: string;
  size: string;
}) {
  const boardClass =
    size === "large"
      ? "h-10 w-24"
      : size === "medium"
        ? "h-8 w-20"
        : "h-7 w-10";

  return (
    <span className="absolute -translate-x-1/2 -translate-y-full" style={{ left, top }}>
      <span className={`block ${boardClass} rounded-[0.18rem] border-[3px] border-white bg-[#0968ff] shadow-[0_12px_20px_rgba(13,63,165,0.28)]`}>
        {label ? (
          <span className="grid h-full place-items-center text-[10px] font-black text-white">
            {label}
          </span>
        ) : null}
      </span>
      <span className="mx-auto block h-6 w-1 bg-white" />
    </span>
  );
}

function MetricStrip() {
  return (
    <section className="border-b border-orange-100 bg-white">
      <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-px px-5 py-5 sm:px-8 lg:grid-cols-4 lg:px-12">
        {metrics.map((metric) => (
          <div key={metric.label} className="px-3 py-5">
            <p className="text-4xl font-black tracking-[-0.06em] text-[#ef4c00]">
              {metric.value}
            </p>
            <p className="mt-1 text-sm font-bold uppercase tracking-[0.14em] text-neutral-500">
              {metric.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SignalSection() {
  return (
    <section id="signals" className="overflow-hidden bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto grid max-w-[1500px] gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ef4c00]">
            Signal planning
          </p>
          <h2 className="mt-4 max-w-2xl text-4xl font-black leading-[0.98] tracking-[-0.06em] text-ink sm:text-6xl">
            Build media from the places your market already occupies.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {signals.map((signal, index) => (
            <div
              key={signal}
              className={`rounded-2xl border border-orange-100 bg-orange-50/55 p-5 shadow-[0_22px_60px_rgba(239,76,0,0.08)] ${index === 0 || index === 5 ? "sm:col-span-2" : ""}`}
            >
              <p className="text-2xl font-black tracking-[-0.05em] text-ink">
                {signal}
              </p>
              <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-neutral-600">
                Score boards against nearby buyers, timing, and visibility instead of treating out-of-home as a blank map.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="bg-[#fff7ed] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ef4c00]">
              Workflow
            </p>
            <h2 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.06em] text-ink sm:text-6xl">
              From buyer signal to booked board.
            </h2>
          </div>
          <p className="max-w-2xl text-lg font-semibold leading-8 text-neutral-600 lg:justify-self-end">
            Peel keeps planning, creative, and outbound in the same campaign surface so every local buy has a reason to exist.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-2xl bg-white p-6 shadow-[0_28px_80px_rgba(126,38,0,0.08)]">
              <p className="text-sm font-black text-[#ef4c00]">0{index + 1}</p>
              <h3 className="mt-8 text-2xl font-black tracking-[-0.045em] text-ink">
                {step.title}
              </h3>
              <p className="mt-4 text-sm font-semibold leading-6 text-neutral-600">
                {step.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CreativeSection() {
  return (
    <section id="creative" className="overflow-hidden bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto grid max-w-[1500px] gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="relative rounded-[2rem] bg-[#ff5a00] p-4 shadow-[0_40px_120px_rgba(239,76,0,0.22)]">
          <div className="overflow-hidden rounded-[1.45rem] bg-black">
            <Image
              src="/mock.png"
              alt="Example localized campaign creative displayed inside the Peel workflow"
              width={1365}
              height={768}
              className="h-auto w-full"
              priority={false}
            />
          </div>
          <div className="absolute -bottom-7 left-10 hidden rounded-2xl bg-white px-5 py-4 shadow-[0_24px_80px_rgba(10,10,10,0.16)] sm:block">
            <p className="text-sm font-black text-ink">Creative ready for projection</p>
            <p className="mt-1 text-xs font-semibold text-neutral-500">
              Board fit, sightline, and outbound context stay attached.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ef4c00]">
            Campaign creative
          </p>
          <h2 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.06em] text-ink sm:text-6xl">
            Make the physical ad feel native to the street.
          </h2>
          <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-neutral-600">
            Generate concise board copy, test it in context, and turn the same local angle into sales outreach.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/vision"
              className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 active:translate-y-0"
            >
              Open creative studio
            </Link>
            <Link
              href="/sightline"
              className="inline-flex h-12 items-center justify-center rounded-full border border-orange-200 px-6 text-sm font-black text-[#ef4c00] transition hover:-translate-y-0.5 hover:bg-orange-50 active:translate-y-0"
            >
              Check placement
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-ink px-5 py-16 text-white sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">
            Start with the map
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.06em] sm:text-6xl">
            Put your next campaign where the buyer already is.
          </h2>
        </div>
        <Link
          href="/map"
          className="inline-flex h-14 shrink-0 items-center justify-center rounded-full bg-white px-7 text-sm font-black text-ink transition hover:-translate-y-0.5 hover:bg-orange-50 active:translate-y-0"
        >
          Launch Peel
        </Link>
      </div>
    </section>
  );
}
