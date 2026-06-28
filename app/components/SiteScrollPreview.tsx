"use client";

import { useMemo, useState } from "react";

/* A little "we're reading your site" animation: a browser frame holding a real
   full-page screenshot of the company's website that slowly pans top→bottom,
   like someone scrolling through it. Shown while the brief is being inferred.

   The screenshot comes from thum.io (no key needed). If it can't load we fall
   back to a tasteful shimmer so the panel never looks broken. */

function withScheme(url: string): string {
  const t = url.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function prettyHost(url: string): string {
  try {
    return new URL(withScheme(url)).hostname.replace(/^www\./, "");
  } catch {
    return url.trim();
  }
}

export default function SiteScrollPreview({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const host = useMemo(() => prettyHost(url), [url]);
  const shot = useMemo(
    () => `/api/screenshot?url=${encodeURIComponent(withScheme(url))}`,
    [url]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg shadow-neutral-900/5">
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
        <div className="ml-2 flex flex-1 items-center gap-1.5 truncate rounded-md bg-neutral-100 px-2.5 py-1 text-[11px] text-neutral-500">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
          <span className="truncate">{host}</span>
        </div>
      </div>

      {/* scrolling viewport */}
      <div className="relative h-[26rem] flex-1 overflow-hidden bg-neutral-50">
        {!failed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shot}
            alt={`${host} website`}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={
              "absolute left-0 top-0 w-full select-none " +
              (loaded ? "animate-site-scroll" : "opacity-0")
            }
            draggable={false}
          />
        )}

        {/* shimmer while the screenshot loads / fallback if it can't */}
        {(!loaded || failed) && (
          <div className="absolute inset-0 flex flex-col gap-3 p-5">
            <div className="h-8 w-1/2 animate-pulse rounded-lg bg-neutral-200/80" />
            <div className="h-28 w-full animate-pulse rounded-xl bg-neutral-200/70" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-200/60" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200/60" />
            <div className="mt-2 grid grid-cols-3 gap-3">
              <div className="h-20 animate-pulse rounded-lg bg-neutral-200/60" />
              <div className="h-20 animate-pulse rounded-lg bg-neutral-200/60" />
              <div className="h-20 animate-pulse rounded-lg bg-neutral-200/60" />
            </div>
          </div>
        )}

        {/* soft top/bottom fades so the pan feels seamless */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/80 to-transparent" />
      </div>

      <div className="flex items-center gap-2 border-t border-neutral-100 px-4 py-3 text-xs font-medium text-neutral-500">
        <span className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        Reading {host} — colors, tone, message…
      </div>
    </div>
  );
}
