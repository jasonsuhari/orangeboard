"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GRAIN, S_FINAL } from "./stage";

/* The scroll story: the orange hero is a poster. Scrolling peels it off
   diagonally from the top-right corner; at half-peel the scene zooms out to
   reveal the poster was on a billboard over a cityscape; a compact CTA
   fades in over the sky at the end.

   Pinning is plain CSS position:sticky (.peel-frame inside the 280vh
   .peel-stage); ScrollTrigger only maps section progress onto the timeline.

   Peel geometry (screen coords, y down, frame W×H, top-right corner C):
   the fold is the 45° line y = x + c with c = s − W, where s sweeps from 0
   (through C) to ~1.04·(W+H) (past the bottom-left corner).

   The clip is transform-only so scrubbing never repaints the hero (which
   is full of gradients, blend modes, and an animated SVG city — a per-frame
   clip-path mutation repaints all of it and janks). An oversized square
   [data-peel=clip] with overflow:hidden pivots 45° about C so its TOP edge
   lies along the fold; translating it by (−s/2, +s/2) advances the fold.
   Inside, [data-peel=unclip] applies the exact inverse — rotate(−45°) after
   a local shift of −s/√2 along its y axis (translation expressed in the
   rotated frame, since CSS/GSAP compose translate-then-rotate) — so the
   hero stays pinned to the viewport while the clip edge sweeps across it.
   Both layers move only in transform: pure compositor work. */

const FLAP_H = 160;

type Props = {
  /** Cityscape canvas + billboard structure (revealed by the zoom-out). */
  backdrop: ReactNode;
  /** The creative under the poster — what peeling exposes. */
  underCreative: ReactNode;
  /** Compact waitlist card that fades in over the sky at the end. */
  cta: ReactNode;
  /** The poster: the entire orange hero, laid out as a full viewport. */
  children: ReactNode;
};

export default function PeelScrollStage({ backdrop, underCreative, cta, children }: Props) {
  const rootRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      // The story is scroll-scrubbed (motion only in direct response to
      // input), so reduced-motion users keep it, minus the decorative copy
      // drift. Windows "animation effects off" maps to reduce, so a static
      // fallback would kill the hero for a large share of visitors.
      mm.add(
        {
          full: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (mmCtx) => {
        const reduced = Boolean(mmCtx.conditions?.reduced);
        const q = (name: string) => root.querySelector<HTMLElement>(`[data-peel="${name}"]`);
        const frame = q("frame");
        const scene = q("scene");
        const clip = q("clip");
        const unclip = q("unclip");
        const poster = q("poster");
        const flap = q("flap");
        const grain = q("grain");
        const ctaEl = q("cta");
        const corner = q("corner");
        const scrollCue = q("scroll-cue");
        const heroCopy = q("hero-copy");
        if (!frame || !scene || !clip || !unclip || !poster || !flap || !grain || !ctaEl) return;

        const dims = { w: 0, h: 0 };
        const measure = () => {
          const w = (dims.w = frame.offsetWidth);
          const h = (dims.h = frame.offsetHeight);
          // Clip square: side 2(W+H) comfortably covers the viewport's
          // projection along and across the fold at every peel position.
          // Its pre-rotation top-edge midpoint sits on C = (W, 0), which is
          // also the pivot (transform-origin 50% 0), so rotating 45° lays
          // the top edge along the fold with the interior on the kept side.
          const L = 2 * (w + h);
          clip.style.left = `${w - L / 2}px`;
          clip.style.top = "0px";
          clip.style.width = `${L}px`;
          clip.style.height = `${L}px`;
          unclip.style.width = `${L}px`;
          unclip.style.height = `${L}px`;
          poster.style.left = `${L / 2 - w}px`;
          poster.style.top = "0px";
          poster.style.width = `${w}px`;
          poster.style.height = `${h}px`;
          // Longest fold chord is √2·min(W,H); 1.75 adds margin without
          // rasterizing a viewport-spanning strip.
          flap.style.width = `${Math.ceil(1.75 * Math.min(w, h))}px`;
        };
        measure();

        const peel = { p: 0 };
        const applyPeel = () => {
          const { w, h } = dims;
          // −2px bias keeps the fold fully outside the box at p = 0 so the
          // corner pixel isn't antialiased away; 4% overshoot clears the
          // last sliver at p = 1.
          const s = peel.p * (w + h) * 1.04 - 2;
          gsap.set(clip, { x: -s / 2, y: s / 2, rotation: 45, transformOrigin: "50% 0" });
          gsap.set(unclip, { y: -s / Math.SQRT2, rotation: -45, transformOrigin: "50% 0" });

          // Fold chord endpoints on the frame rect — A enters on the top or
          // left edge, B exits on the right or bottom edge. The flap's
          // bottom-center rides the chord midpoint; rotate(45°) lays its
          // bottom edge along the fold with the body toward the peeled side.
          const ax = s <= w ? w - s : 0;
          const ay = s <= w ? 0 : s - w;
          const bx = s <= h ? w : w + h - s;
          const by = s <= h ? s : h;
          const curl = Math.min(28 + s * 0.12, 150);
          gsap.set(flap, {
            x: (ax + bx) / 2 - flap.offsetWidth / 2,
            y: (ay + by) / 2 - FLAP_H,
            rotation: 45,
            scaleY: curl / FLAP_H,
          });
        };
        applyPeel();

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            // Smoothing irons out discrete wheel notches. Reduced motion
            // needs it MOST: PRM also disables the browser's compositor
            // smooth-scroll, so each notch arrives as an instant 120px
            // jump — without scrub lag that's one huge visual delta per
            // notch (choppy and raster-heavy). Motion still only follows
            // input; it just settles over ~half a second.
            scrub: 0.6,
            invalidateOnRefresh: true,
            onRefresh: () => {
              measure();
              applyPeel();
            },
          },
        });

        gsap.set(ctaEl, { y: 24 });

        tl.to(peel, { p: 1, duration: 0.6, onUpdate: applyPeel }, 0)
          .to(flap, { autoAlpha: 1, duration: 0.04 }, 0);
        if (corner) {
          // The load animation's fill (animate-peel-lift) would override
          // GSAP's inline opacity, so drop it once the scrub takes over.
          tl.to(
            corner,
            {
              autoAlpha: 0,
              duration: 0.06,
              onStart: () => {
                corner.style.animation = "none";
              },
            },
            0,
          );
        }
        if (scrollCue) {
          // Same fill-mode conflict as the corner: clear the load animation
          // so GSAP's inline opacity wins once the scrub takes over.
          tl.to(
            scrollCue,
            {
              autoAlpha: 0,
              duration: 0.05,
              onStart: () => {
                scrollCue.style.animation = "none";
              },
            },
            0,
          );
        }
        if (heroCopy && !reduced) {
          // The copy gets tugged gently toward the peel as it lifts.
          tl.fromTo(heroCopy, { x: 0, y: 0 }, { x: "2vw", y: "-3vh", duration: 0.55 }, 0);
        }
        tl.to(scene, { scale: S_FINAL, duration: 0.55, ease: "power1.inOut" }, 0.3)
          .to(grain, { autoAlpha: 0.06, duration: 0.2 }, 0.3)
          .to(flap, { autoAlpha: 0, duration: 0.06 }, 0.58)
          // Drops the peeled hero (and its form) from the tab order and
          // a11y tree; reversed automatically when scrubbing back up.
          .set(poster, { visibility: "hidden" }, 0.62)
          .to(ctaEl, { autoAlpha: 1, y: 0, duration: 0.12, ease: "power2.out" }, 0.86);
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="peel-stage relative w-full">
      <div data-peel="frame" className="peel-frame w-full bg-[#160a05]">
        <div data-peel="scene" className="absolute inset-0 will-change-transform">
          <div className="absolute inset-0">{backdrop}</div>
          <div aria-hidden className="absolute inset-0">
            {underCreative}
          </div>
          {/* Transform-only diagonal clip (see header comment): clip's top
              edge is the fold, unclip inverts its transform so the poster
              stays viewport-pinned. inset-0 is the pre-hydration layout;
              measure() swaps in the oversized px geometry. isolate keeps
              the hero's internal z-[5..10] layers from escaping into the
              scene's stacking context above the flap. */}
          <div data-peel="clip" className="absolute inset-0 overflow-hidden will-change-transform">
            <div data-peel="unclip" className="absolute inset-0 will-change-transform">
              <div data-peel="poster" className="isolate absolute inset-0 overflow-hidden bg-[#ef4c00]">
                {children}
              </div>
            </div>
          </div>
          <div data-peel="flap" aria-hidden className="peel-flap z-[15]" />
        </div>
        <div
          data-peel="grain"
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 opacity-0 mix-blend-soft-light"
          style={{ backgroundImage: GRAIN, backgroundSize: "140px 140px" }}
        />
        <div
          data-peel="cta"
          className="peel-cta pointer-events-none invisible absolute inset-x-0 top-0 z-20 opacity-0"
        >
          {cta}
        </div>
      </div>
    </section>
  );
}
