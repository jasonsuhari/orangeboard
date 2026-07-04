/* Shared constants for the landing peel stage. Constants only — safe to
   import from both server components and the client stage. */

/** Scene scale at full zoom-out: the billboard face settles into the central
    52% of the viewport. The backdrop canvas in CityscapeBackdrop is sized
    100% / S_FINAL so its edges land exactly on the viewport at this scale. */
export const S_FINAL = 0.52;

/* Fine film grain — kept subtle and blended so it reads as texture, not noise. */
export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
