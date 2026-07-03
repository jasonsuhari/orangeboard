"use client";

import { useState } from "react";
import { Check, Spinner } from "./icons";

type Status = "idle" | "loading" | "success" | "error";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus("error");
      setError("Please enter a valid email.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, source: "landing" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div
        className="animate-rise pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/25 bg-white/12 px-5 py-4 shadow-[0_24px_70px_-24px_rgba(80,18,0,0.6)] backdrop-blur-md"
        role="status"
        aria-live="polite"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#ef4c00] shadow-[0_4px_14px_-4px_rgba(0,0,0,0.4)]">
          <Check className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-tight">You&rsquo;re on the list.</p>
          <p className="truncate text-[13px] font-medium text-white/80">
            We&rsquo;ll email {email.trim()} the moment access opens.
          </p>
        </div>
      </div>
    );
  }

  const invalid = status === "error";

  return (
    <div className="pointer-events-auto w-full max-w-md">
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-[0_30px_80px_-24px_rgba(80,18,0,0.62)] ring-1 ring-black/[0.06] transition duration-300 focus-within:shadow-[0_36px_90px_-24px_rgba(80,18,0,0.7)] focus-within:ring-2 focus-within:ring-[#0a5bff]/45"
      >
        <label htmlFor="waitlist-email" className="sr-only">
          Work email
        </label>
        <input
          id="waitlist-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          enterKeyHint="go"
          placeholder="you@company.com"
          value={email}
          aria-invalid={invalid}
          aria-describedby="waitlist-hint"
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] font-medium text-[#0a0a0a] outline-none placeholder:text-neutral-400"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-5 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_-6px_rgba(0,0,0,0.55)] transition duration-300 hover:bg-[#1c1c1c] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading" ? (
            <>
              <Spinner className="h-4 w-4 animate-spin" trackOpacity={0.3} />
              Joining
            </>
          ) : (
            <>
              Join the waitlist
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                &rarr;
              </span>
            </>
          )}
        </button>
      </form>
      <p id="waitlist-hint" className="mt-3 h-4 pl-1 text-[13px] font-medium" aria-live="polite">
        {invalid ? (
          <span className="text-white">{error}</span>
        ) : (
          <span className="text-white/70">Be first in line when we open in your city. No spam, ever.</span>
        )}
      </p>
    </div>
  );
}
