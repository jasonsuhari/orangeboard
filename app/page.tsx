import Link from "next/link";
import CreateFlow from "./components/CreateFlow";

/* ──────────────────────────────────────────────────────────────────────────
   VitaminSee landing page — styled after orangeslice.ai
   Clean white canvas · bold sans headlines · orange accent · rounded CTAs ·
   live "data panel" mockups · trust strip · feature grid.
   The hero opens the pipeline: company URL → brand brief → creative on a
   real 3D billboard (CreateFlow).
   ────────────────────────────────────────────────────────────────────────── */

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <Nav />
      <Hero />
      <TrustStrip />
      <LoopSection />
      <Features />
      <AttributionPanel />
      <RoasPanel />
      <Tracks />
      <CTA />
      <Footer />
    </div>
  );
}

/* ───────────────────────────── Nav ───────────────────────────── */

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <div className="hidden items-center gap-8 text-sm font-medium text-neutral-600 md:flex">
          <a href="#how" className="transition hover:text-ink">
            How it works
          </a>
          <a href="#features" className="transition hover:text-ink">
            Features
          </a>
          <a href="#attribution" className="transition hover:text-ink">
            Attribution
          </a>
          <a href="#tracks" className="transition hover:text-ink">
            Tracks
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/map"
            className="hidden text-sm font-medium text-neutral-600 transition hover:text-ink sm:block"
          >
            Open the board
          </Link>
          <Link
            href="/map"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-500 text-white shadow-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="5" width="18" height="11" rx="2" fill="currentColor" />
          <path d="M12 16v4M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-tight">VitaminSee</span>
    </Link>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft orange glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-orange-200/40 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 text-center md:pt-28">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Built at the YC AI Growth Hackathon by Orange Slice
          </span>
        </div>

        <h1 className="animate-fade-up mx-auto mt-6 max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          The performance-marketing stack
          <br className="hidden md:block" /> for the{" "}
          <span className="text-orange-500">physical world</span>.
        </h1>

        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600">
          Billboards are the last major ad channel with no targeting, no testing, and
          no attribution. VitaminSee turns out-of-home into a measurable, testable,
          <span className="font-medium text-ink"> viral</span> performance channel —
          one you can put in the same spreadsheet as Meta and Google.
        </p>

        <div className="animate-fade-up mt-4 text-sm text-neutral-500">
          Start with your website — watch it become a billboard.{" "}
          <a href="#how" className="font-medium text-orange-600 underline-offset-2 hover:underline">
            See how it works
          </a>
        </div>

        <div className="animate-fade-up">
          <CreateFlow />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Trust strip ───────────────────────────── */

function TrustStrip() {
  const items = [
    "Next.js",
    "Mapbox GL",
    "Fiber AI",
    "Orange Slice",
    "Synthetic agents",
    "Weather + time creative",
  ];
  const loop = [...items, ...items];
  return (
    <section className="border-y border-neutral-100 bg-neutral-50/50 py-8">
      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-neutral-400">
        The full out-of-home stack, rebuilt
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="animate-marquee flex w-max gap-12 px-6">
          {loop.map((item, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-lg font-medium text-neutral-400"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Loop / How it works ───────────────────────────── */

function LoopSection() {
  const steps = [
    {
      n: "01",
      title: "Discover & rank",
      body: "Load real billboard inventory on a 3D Mapbox map — lat/long plus foot-traffic scores — and rank every panel by audience fit for a given brand.",
    },
    {
      n: "02",
      title: "Audience profile",
      body: "Pull the pedestrian demographics for each billboard: who actually walks past, and exactly when they do it.",
    },
    {
      n: "03",
      title: "Creative generation",
      body: "Generate ad creative conditioned on time of day and weather. Rainy 8am and sunny 6pm get different creative, live.",
    },
    {
      n: "04",
      title: "Preview & simulate",
      body: "Composite the creative into the real scene and run synthetic agents to predict visibility and recall before a dollar is spent.",
    },
    {
      n: "05",
      title: "Direct outreach",
      body: "Fiber AI + Orange Slice match each billboard's audience to the brands whose ICP fits — then auto-draft the pitch.",
    },
  ];
  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-24">
      <SectionHeader
        eyebrow="The loop"
        title="Supply → creative → proof → demand."
        subtitle="One end-to-end loop, from raw inventory to a closed deal. Every stage is a building block of the performance stack OOH never had."
      />
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <div
            key={s.n}
            className={`group rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 ${
              i === 3 ? "md:col-span-1" : ""
            }`}
          >
            <span className="text-sm font-semibold text-orange-500">{s.n}</span>
            <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{s.body}</p>
          </div>
        ))}
        <div className="flex flex-col justify-center rounded-2xl bg-ink p-6 text-white">
          <p className="text-sm font-medium text-orange-300">The close</p>
          <p className="mt-2 text-lg font-semibold leading-snug">
            The loop closes. Supply meets the exact demand it was built for.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Features (above & beyond) ───────────────────────────── */

function Features() {
  const features = [
    {
      tag: "The moat",
      title: "Closed attribution loop",
      body: "Nobody has solved did it work. VitaminSee ships geofenced conversion-lift, branded-search lift by DMA, QR/short-code tracking, and holdout-DMA experiment design.",
      icon: (
        <path d="M3 12l5 5L21 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ),
    },
    {
      tag: "The bridge",
      title: "ROAS / CPM translation layer",
      body: "A “recall score” means nothing to a growth engineer. We output predicted $ ROAS and effective CPM, benchmarked head-to-head against Meta and Google.",
      icon: (
        <path d="M4 19V5m0 14h16M8 15l3-4 3 3 4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ),
    },
    {
      tag: "The wow",
      title: "Built-for-virality creative",
      body: "A billboard's real audience is the people who see the screenshot online. We optimize for street recall and shareability — and output the predicted viral clip.",
      icon: (
        <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9 2.6.9-5.5-4-3.9 5.5-.8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ),
    },
  ];
  return (
    <section id="features" className="border-t border-neutral-100 bg-neutral-50/60 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeader
          eyebrow="Above & beyond"
          title="Three moves that make it a category."
          subtitle="Targeting + testing + attribution is the whole performance stack — for a channel that had none of it."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:shadow-xl hover:shadow-neutral-900/5"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-600">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  {f.icon}
                </svg>
              </span>
              <span className="mt-5 inline-block text-xs font-semibold uppercase tracking-wide text-orange-500">
                {f.tag}
              </span>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Attribution panel ───────────────────────────── */

function AttributionPanel() {
  const metrics = [
    { label: "Geofenced lift", value: "+18.4%", note: "vs. holdout DMA" },
    { label: "Branded search", value: "+12.1%", note: "San Francisco DMA" },
    { label: "QR scans", value: "4,209", note: "last 7 days" },
    { label: "Effective CPM", value: "$6.40", note: "beats Meta by 22%" },
  ];
  return (
    <section id="attribution" className="mx-auto max-w-6xl px-5 py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeader
            align="left"
            eyebrow="The proof"
            title="Finally — did the billboard work?"
            subtitle="Every step before this is pre-spend. VitaminSee ships the measurement loop that turns OOH into something a CMO can defend in a board meeting."
          />
          <ul className="mt-8 space-y-3 text-sm text-neutral-700">
            {[
              "Geofenced conversion-lift studies",
              "Branded-search lift, measured by DMA",
              "QR & short-code attribution",
              "Holdout-DMA experiment design",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-orange-100 text-orange-600">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl shadow-neutral-900/5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold">Campaign measurement</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Live
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
                <p className="text-xs font-medium text-neutral-500">{m.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{m.value}</p>
                <p className="text-xs text-neutral-400">{m.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── ROAS bridge panel ───────────────────────────── */

function RoasPanel() {
  const channels = [
    { name: "VitaminSee (OOH)", roas: 3.8, cpm: "$6.40", highlight: true },
    { name: "Meta", roas: 3.1, cpm: "$8.20" },
    { name: "Google", roas: 2.9, cpm: "$11.40" },
  ];
  const max = 4;
  return (
    <section className="border-t border-neutral-100 bg-ink py-24 text-white">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 rounded-2xl border border-white/10 bg-white/5 p-7 lg:order-1">
            <p className="mb-6 text-sm font-medium text-neutral-300">
              Predicted ROAS, same spreadsheet
            </p>
            <div className="space-y-5">
              {channels.map((c) => (
                <div key={c.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className={c.highlight ? "font-semibold text-orange-300" : "text-neutral-300"}>
                      {c.name}
                    </span>
                    <span className="tabular-nums text-neutral-400">
                      {c.roas.toFixed(1)}× · {c.cpm}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${c.highlight ? "bg-orange-500" : "bg-white/30"}`}
                      style={{ width: `${(c.roas / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-orange-400">
              The bridge
            </span>
            <h2 className="mt-3 text-balance text-4xl font-semibold tracking-tight">
              Compare a billboard to digital, line for line.
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-neutral-300">
              VitaminSee's translation layer turns recall into the only numbers a growth
              engineer trusts: predicted dollar ROAS and effective CPM, benchmarked
              head-to-head against the channels already in the plan.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Tracks ───────────────────────────── */

function Tracks() {
  const tracks = [
    { title: "AI Ad Factories", body: "Weather- and time-conditioned creative generation." },
    { title: "Reading Minds", body: "Agentic audience simulation & signal-based billboard↔brand matching." },
    { title: "Revenue on Autopilot", body: "Automated, signal-matched outreach to the right advertisers." },
    { title: "Algorithm Hacking", body: "Creative optimized to go viral, not just to be seen." },
  ];
  return (
    <section id="tracks" className="mx-auto max-w-6xl px-5 py-24">
      <SectionHeader
        eyebrow="Hackathon tracks"
        title="Spanning every track, by design."
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tracks.map((t) => (
          <div
            key={t.title}
            className="rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5"
          >
            <h3 className="text-base font-semibold tracking-tight">{t.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{t.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────── CTA ───────────────────────────── */

function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 px-8 py-16 text-center text-white shadow-2xl shadow-orange-500/30">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <h2 className="mx-auto max-w-2xl text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          Put the physical world in your growth spreadsheet.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-orange-50">
          Discover, target, test, and attribute out-of-home — all in one loop.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/map"
            className="rounded-full bg-white px-6 py-3 text-base font-semibold text-orange-600 shadow-lg transition hover:bg-orange-50"
          >
            Open the board
          </Link>
          <a
            href="#how"
            className="rounded-full border border-white/40 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
          >
            Read the thesis
          </a>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Footer ───────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-neutral-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-neutral-500 sm:flex-row">
        <Logo />
        <p>Your daily dose of attention. 🍊</p>
        <p className="text-neutral-400">© {new Date().getFullYear()} Orange Slice</p>
      </div>
    </footer>
  );
}

/* ───────────────────────────── Shared ───────────────────────────── */

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <span className="text-xs font-semibold uppercase tracking-widest text-orange-500">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-balance text-4xl font-semibold tracking-tight">{title}</h2>
      {subtitle && (
        <p className="mt-4 leading-relaxed text-neutral-600">{subtitle}</p>
      )}
    </div>
  );
}
