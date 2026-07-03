/* Tiny inline SVG icons shared across forms and flows. Each accepts className
   so call sites keep their exact sizing/animation classes. */

export function Spinner({
  className = "h-3.5 w-3.5 animate-spin",
  trackOpacity = 0.25,
}: {
  className?: string;
  /** Opacity of the faint full-circle track behind the spinning arc. */
  trackOpacity?: number;
}) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity={trackOpacity} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Check({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
