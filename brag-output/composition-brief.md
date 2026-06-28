# Hyperframes Composition Brief: Orangeboard

## Objective
A premium, kinetic launch film for Orangeboard — a physical-ABM workspace that finds where your ICP physically clusters in San Francisco, ranks the real billboards that reach them, writes street-specific creative, and drafts the matching outbound queue. Sell it like a funded Series-A product. Not a parody.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 21 seconds

## Source Material
- Project root: `C:/Users/Jason/Documents/GitHub/orangeboard`
- Primary files read: `app/page.tsx`, `app/globals.css`, `app/components/Map.tsx`, `app/map/page.tsx`
- Product name: **Orangeboard**
- Tagline / strongest claim: "Find where your ICP gathers, then launch the physical play."
- Category label (verbatim): "Passive outbound for physical ABM"
- Copy that must appear verbatim:
  - "Your ICP doesn't live in an inbox." (hook — our line, on-brand)
  - "SoMa SaaS Finance Cluster"
  - "31 accounts · 4 placements · Score 96"
  - "539 Bryant St", "425 04th St", "560 Brannan St"
  - "Finance teams should close month before the ride home."
  - "We are running a local finance-ops campaign around your SoMa team."
  - "Find where your ICP gathers, then launch the physical play."
  - "Orangeboard."

## Creative Direction
- Tone preset: `app-store` pushed toward cinematic energy.
- Creative direction: premium, kinetic Series-A launch film — confident, fast, makes Orangeboard look inevitable.
- Interpretation: high energy, tasteful. Real product UI is the hero. Deep frames (glow + grid + ghost type), snappy varied entrances, strong hits on strong beats, one dramatic logo slam. No cheesy SaaS language, no winking.
- Hook: dark, orange mono tag + slammed headline "Your ICP doesn't live in an inbox." Hold to read.
- Outro: orange board glyph + "Orangeboard." slams on the strongest beat (20.02s), bell rings, hero tagline fades up.
- Avoid: generic SaaS language; abstract filler; redesigning the brand (match the orange/ink/off-white exactly); gradient text, neon, pure #000/#fff, identical card grids.

## Visual Identity
See `composition/design.md` (authoritative). Summary:
- Light canvas: `#f7f7f5` bg, `#ffffff` panels, `#e5e5e5` hairlines.
- Dark canvas: `#0a0a0a` warmed toward orange.
- Accent: `#f97316`; deep `#ea580c`; wash `#fff7ed`.
- Text: `#0a0a0a` / `#ffffff` / muted `#525252`.
- Map dusk palette: land `#a8a39a`, roads `#9e9890`, water `#3d6e8c`, buildings `#0d0e14`, blob `rgba(249,115,22,0.82)` white-bordered, warm amber horizon.
- Font: system UI sans (the product's native stack); heavy display weights; tabular numerals for data.

## Storyboard
Use `brag-output/brag-plan.md` as the creative contract. Scene summary:
1. Hook — 3.4s — dark; orange tag + slammed headline "Your ICP doesn't live in an inbox."
2. The Signal Map — 5.2s — dusk SF cityscape; orange SoMa blob ignites (beat-lock ~4.02s) + breathes; label "SoMa SaaS Finance Cluster / 31 accounts · 4 placements · Score 96"; 3 board pins pop in (beat-grid 5.03/5.53/6.03).
3. Ranked Boards — 3.8s — light workspace; best-board detail card (539 Bryant St, 96, metrics, Export Package) + ranked list rows deal in (beat-grid ~9.0/9.5/10.0, hold).
4. Creative + Outbound — 5.2s — dark billboard creative card ("Finance teams should close month before the ride home.") + Outbound Queue rows with status chips (beat-grid ~13.5/14.0/14.5).
5. Outro — 3.4s — dark; "Orangeboard." slams (beat-lock strong cue 20.02s) + bell; tagline fades up; YC footer; final fade.

## Audio
- Audio role: confident upbeat bed driving pace; crisp moment-matched SFX (premium app-store layer).
- Audio arc: enters quiet under the hook, steady through the three product scenes, resolves on one bell as the logo slams and music fades.
- Music: `assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`, volume 0.32, fade in 0.6s, fade out last 1.2s.
- Music cue guidance: bundled preset `assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json`. Beats ~0.5s @120BPM. Strong cues cluster 16–23s (all 1.00). Locks: blob ignite ~4.02s; logo slam strong cue 20.02s. Beat-grid: pins 5.03/5.53/6.03; ranked rows ~9.0/9.5/10.0; outbound rows ~13.5/14.0/14.5. Mark with `// beat-locked` / `// beat-grid`.
- Audio-reactive treatment: subtle. Run `~/.agents/skills/hyperframes/scripts/extract-audio-data.py` on the track to produce per-frame bands; drive the SoMa blob glow+scale with bass/RMS (±8–12%) and the billboard-card presence with overall amplitude via per-frame `tl.call()` sampling. No waveform/equalizer/strobe. If extraction fails, fall back to a deterministic timeline-driven breathing tween and note it.
- Audio-coupled moments:
  - Scene 1: headline land → `impact/impactSoft_medium_001`.
  - Scene 2: blob ignite → `impact/impactSoft_medium_001`; each pin → `interface/click_00x`.
  - Scene 3: each ranked row → `casino/card-slide-1/3/5`; export button → `interface/click_001`.
  - Scene 4: creative card → `interface/drop_001`; each outbound row → `interface/click_002`/`drop_001`.
  - Scene 5: logo slam (20.02s) → `impact/impactBell_heavy_000`, ring ~1s over the fade.
- SFX selection guidance: prefer the low-HF-risk warm picks from `~/.claude/skills/brag/assets/sfx/sfx-analysis.md` (impactSoft_medium family, drop_001, click_00x, card-slide). The bell is the only big sound. Volumes 0.55–0.8; bell ~0.8.
- Exact SFX choice: choose final filenames/timestamps/volume after the animation exists.
- Audio files: music + SFX already copied into `brag-output/composition/assets/` (impactSoft_medium_001, impactBell_heavy_000, drop_001, click_001/002/003, card-slide-1/3/5).

## Hyperframes Instructions
Use the current `hyperframes` skill + CLI. Single standalone `index.html` (no `<template>`), one paused GSAP timeline registered as `window.__timelines["orangeboard"]`. Build end-state layout first, then `fromTo` entrances; transitions handle exits; only the final scene may fade out. Deterministic (seeded PRNG if needed). Beat-lock the two majors, beat-grid the sequential rows. Keep all text ≥24px and readable; tabular numerals on scores. Run lint, validate, inspect, animation-map before render. Total duration exactly 21s.
