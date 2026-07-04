"use client";

import type { MouseEvent } from "react";

/* Scroll invitation pinned to the bottom of the hero poster: names the
   gesture that drives the story. Clicking it rides the scroll to the end
   of the peel stage. PeelScrollStage fades it out via
   [data-peel="scroll-cue"] the moment peeling begins. */
export default function ScrollCue() {
  const scrollThroughPeel = (event: MouseEvent<HTMLButtonElement>) => {
    const stage = event.currentTarget.closest<HTMLElement>(".peel-stage");
    if (!stage) return;
    const top =
      stage.getBoundingClientRect().top +
      window.scrollY +
      stage.offsetHeight -
      window.innerHeight;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div
      data-peel="scroll-cue"
      className="animate-rise pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center sm:bottom-6"
      style={{ animationDelay: "520ms" }}
    >
      <button
        type="button"
        onClick={scrollThroughPeel}
        className="group pointer-events-auto flex flex-col items-center gap-1 px-4 py-1 text-white/75 transition hover:text-white"
      >
        <span className="text-[13px] font-medium tracking-[0.01em]">
          Scroll to <span className="font-serif italic text-[#ffd7ba] transition group-hover:text-white">peel</span>
        </span>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          className="animate-cue-nudge h-4 w-4"
        >
          <path
            d="M3 6 L8 11 L13 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
