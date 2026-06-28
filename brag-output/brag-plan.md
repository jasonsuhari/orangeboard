# Brag Plan: Orangeboard

## What is this app?
Orangeboard is a physical-ABM workspace: it infers your ICP, finds the city blocks where those accounts physically concentrate in San Francisco, ranks the real billboards that reach them, writes the street-specific creative, and drafts the matching outbound queue — end to end, in one screen.

## The angle
This is a real, genuinely cool product, so we sell it like one. A premium, kinetic Series-A launch film. The insight is sharp and contrarian: B2B outbound lives in a dead inbox, while your highest-fit accounts walk past the same SoMa corner every morning. Orangeboard turns that physical reality into a campaign. We do NOT play it as a parody. We make it look inevitable and expensive. The product UI is good-looking — let it be the hero.

## Hook (first 2-3 seconds)
Dark, premium, confident. A small orange category tag ("PHYSICAL ABM // 2026"), then one big anti-cold-email line slams in:
"Your ICP doesn't live in an inbox."
No winking. Sets up the physical play. Hold long enough to read.

## Key moments (the middle)
- **The signal map (money shot).** A dusk San Francisco cityscape, 3D-ish perspective in the product's real dusk palette. An irregular orange opportunity blob ignites over SoMa and breathes with the music. Label: "SoMa SaaS Finance Cluster · 31 accounts · Score 96." Three orange board pins fire in one by one.
- **Ranked boards.** The clean light workspace. Three real permitted boards rank in from the right — 539 Bryant St (96), 425 04th St (88), 560 Brannan St (80). The top board highlights as "best board for this blob," with live metrics (31 accounts / High visibility / 18s dwell) and an orange Export Package button.
- **Creative + outbound (the payoff).** A dark billboard-creative card renders the verbatim street copy — "Finance teams should close month before the ride home." Beside it the Outbound Queue deals out three accounts with status chips: Northstar Ledger / VP Finance / Drafted, Atlas Workflow / Controller / Ready, Mergebase / Head of Ops / Needs contact. The billboard goes up; the email follows.

## Outro / punchline
Dark. The orange board glyph + "Orangeboard." slams in on the strongest musical hit, a bell rings, then the real hero tagline fades up: "Find where your ICP gathers, then launch the physical play." Small footer: "YC AI Growth Hackathon."

## User flow worth showing
**Entry:** ICP is set; the signal map surfaces the SoMa SaaS Finance Cluster blob (31 accounts, score 96).
**Key action:** Orangeboard ranks the real permitted billboards by fit; 539 Bryant St wins at 96 (High visibility, 18s dwell).
**Result:** Street-specific creative generates ("Finance teams should close month before the ride home.") and the outbound queue is drafted with a personalized hook for Northstar Ledger's VP Finance.

## Tone
- Preset: `app-store` (clean premium product showcase) pushed toward cinematic energy.
- Creative direction: premium, kinetic Series-A launch film — confident, fast, makes Orangeboard look funded and inevitable.
- Interpretation: high energy but tasteful. Real product UI is the star. Strong hits on the strong beats, snappy entrances, deep frames (glow + grid + ghost type), zero cheesy SaaS language. Hard, fast cuts; one dramatic slam for the logo.

## Format: landscape — 1920x1080
## Duration: 21 seconds

## Visual identity (from the project)
- Light canvas (workspace scenes): `#f7f7f5` warm off-white, panels on `#ffffff`, hairlines `#e5e5e5`.
- Dark canvas (hook / billboard / outro): `#0a0a0a` ink, warmed slightly toward orange.
- Accent: `#f97316` (orange-500). Deep accent `#ea580c`, light wash `#fff7ed` / orange-50.
- Text: `#0a0a0a` ink on light; `#ffffff` on dark; muted `#525252` / neutral-500.
- Map fidelity (from app/components/Map.tsx dusk config): land `#a8a39a`, roads `#9e9890`, water `#3d6e8c`, blob fill `rgba(249,115,22,0.82)` white-bordered, buildings near-`#0d0e14`, lightPreset dusk, warm amber horizon glow.
- Display font: system UI sans (ui-sans-serif, system-ui, -apple-system, Segoe UI) — the product's native stack. Heavy weights for display, mono-ish tabular numerals for data.
- Strongest visual element: the dusk SF signal map with the pulsing orange SoMa blob and orange board pins.

## Share copy (draft)
Your best accounts don't open cold email — they walk past the same SoMa corner every morning. Orangeboard finds the blocks where your ICP concentrates, ranks the billboards that reach them, writes the street copy, and drafts the outbound. The board goes up. The email follows.

## Audio direction
- Role: confident upbeat bed driving the pace; SFX are crisp and moment-matched (premium app-store layer, not sparse).
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` — most energetic of the set, ~120 BPM. Volume 0.32. Fade in over first 0.6s, fade out over the last 1.2s under the logo bell.
- Music cue guidance: bundled preset at `assets/music/cues/...vol-1...music-cues.json`. Beat grid ~0.5s at 120 BPM. Strong cues cluster 16–23s (all 1.00). Target locks: blob ignition near 4.02s; **logo slam on the strong cue at 20.02s**. Beat-grid windows: board pins 5.03/5.53/6.03; ranked rows ~9.0/9.5/10.0 (slide fast, hold the full set); outbound rows ~13.5/14.0/14.5.
- Audio-reactive treatment: subtle. Extract per-frame bands (extract-audio-data.py); drive the SoMa blob glow/scale with bass+RMS (±8–12%) and the billboard-card presence with overall amplitude. No waveforms, no equalizer, no strobing. UI must stay readable.
- SFX posture: app-store consistent light layer — ~7-9 cues. Soft impacts on reveals, card-slides on rows, clicks on the export button, one bell on the logo.
- Audio-coupled moments: blob ignite → soft impact; each board pin → light tick; each ranked row → card-slide; export button → click; each outbound row → drop/click; logo slam → impactBell, ring over the fade.
- Restraint rule: never stack two cues within ~0.12s; keep music under 0.4; the bell is the only "big" sound.

## Storyboard

### Scene 1 — Hook — 3.4s
Dark `#0a0a0a` warmed toward orange. Background: a low radial orange glow bottom-center, a faint 42px grid, an oversized ghost word ("ABM") bleeding off the right edge at ~10% opacity, slow drift. Top-left orange mono tag: "PHYSICAL ABM // SAN FRANCISCO". Hero headline, heavy, left-anchored, ~110px: "Your ICP doesn't live in an inbox." A thin orange rule sweeps in under the tag (scaleX 0→1).
Sequential/interaction: none — single decisive headline reveal; tag + rule + headline stagger in.
Audio intent: music enters confident and quiet; one soft impact as the headline lands.
Audio-coupled idea: impactSoft on headline land.
Music: vol-1 bed entering, vol 0.32.
Transition mood: hard/fast (zoom-through) → Scene 2.

### Scene 2 — The Signal Map — 5.2s
The dusk SF cityscape, perspective-tilted: rows of extruded building blocks in `#a8a39a`→`#0d0e14` dusk tones, a `#3d6e8c` water edge, a warm amber horizon glow, faint street grid. Floating product chrome: top-left pill "San Francisco signal map", top-right legend (● Boards / ● Accounts), bottom nav dots "1 / 4". Small ink account dots scattered.
- The orange irregular blob ignites over SoMa at ~0.6s (**beat-locked ~4.02s**), then breathes (audio-reactive glow/scale).
- Label card snaps in 0.3s later: "SoMa SaaS Finance Cluster" / "31 accounts · 4 placements · Score 96".
- Three orange board pins (539 / 425 / 560) pop in one by one (**beat-grid 5.03 / 5.53 / 6.03**).
Sequential/interaction: yes — blob, then label, then 3 pins one by one.
Audio intent: the reveal payoff. One confident soft-impact on blob ignite; light ticks per pin.
Audio-coupled idea: impactSoft_medium_001 at blob; click/tick per pin.
Music: bed continuing.
Transition mood: fast zoom-through → Scene 3.

### Scene 3 — Ranked Boards — 3.8s
Light workspace `#f7f7f5`, white panels, 2px hairlines. Split frame. Left: "BEST BOARD FOR THIS BLOB" detail card — 539 Bryant St, orange score badge 96, three metric tiles (Accounts 31 / Visibility High / Dwell 18s), orange "Export Package" button. Right: "Ranked Boards" list; three rows slide in from the right fast and hold (**beat-grid ~9.0 / 9.5 / 10.0**):
- 539 Bryant St · High · 31 nearby · **96**
- 425 04th St · Medium · 28 nearby · **88**
- 560 Brannan St · Medium · 25 nearby · **80**
Top row carries the orange-50 highlight + orange left border. Export button gets a click pulse near the end.
Sequential/interaction: yes — detail card first, rows deal in one by one, export click.
Audio intent: crisp, rhythmic — boards dealt like cards; one click on export.
Audio-coupled idea: card-slide per row; interface/click on export.
Music: bed.
Transition mood: push/zoom → Scene 4.

### Scene 4 — Creative + Outbound — 5.2s
Light workspace. Split frame. Left: dark billboard-creative card (`#0a0a0a`), perspective-tilted with a soft drop shadow so it reads like outdoor media. Orange mono label "RAMP NEAR 4TH ST". Big white copy: "Finance teams should close month before the ride home." Small muted: "Built for account concentration in SoMa." Card presence breathes (audio-reactive).
Right: "Outbound Queue" panel. Three rows deal in (**beat-grid ~13.5 / 14.0 / 14.5**, hold after):
- Northstar Ledger · VP Finance · chip **Drafted** (orange) — with hook line "We are running a local finance-ops campaign around your SoMa team."
- Atlas Workflow · Controller · chip Ready
- Mergebase · Head of Ops · chip Needs contact
Sequential/interaction: yes — creative card snaps, outbound rows deal one by one.
Audio intent: the payoff machine lining up shots. Soft impact on the creative card; drop/click per row.
Audio-coupled idea: drop_001 on card; click/drop per outbound row.
Music: bed.
Transition mood: fast dip → Scene 5.

### Scene 5 — Outro — 3.4s
Dark `#0a0a0a`, warm radial glow, faint grid, centered. Orange board glyph + "Orangeboard." (heavy, ~96px) **slams in beat-locked to the strong cue at 20.02s** with a slight overshoot; the bell rings. Tagline fades up 0.4s later: "Find where your ICP gathers, then launch the physical play." Small footer pill: "YC AI Growth Hackathon". Gentle fade to end.
Sequential/interaction: yes — glyph+name slam, then tagline, then footer.
Audio intent: the closing slam of a boardroom deck. impactBell_heavy_000 rings over the music fade.
Audio-coupled idea: impactBell at 20.02s; let it ring ~1s as music fades.
Music: fade out 19.8 → 21.0s.
Transition mood: hold to end (final fade allowed).

**Music mood for this video:** upbeat, premium, confident business-corporate — energy that says "this is a real product."
**Audio summary:** A confident bed enters under the hook, drives steadily through the three product scenes with crisp, moment-matched SFX (impacts on reveals, card-slides on rows, a click on export), and resolves on a single bell as the logo slams on the strongest beat and the music fades.
