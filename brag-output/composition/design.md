# Orangeboard — Design System (video)

Brand source of truth for this composition. Use these exact values. This defines brand, not layout.

## Palette

| Token | Hex | Use |
|---|---|---|
| ink | `#0a0a0a` | dark canvas, primary text on light |
| ink-warm | `#100c08` | dark canvas tinted toward orange (bg only) |
| paper | `#f7f7f5` | light workspace canvas |
| panel | `#ffffff` | cards/panels on light |
| hairline | `#e5e5e5` | borders/dividers on light |
| muted | `#525252` | secondary text on light |
| muted-2 | `#8a8a86` | tertiary labels |
| white | `#ffffff` | text on dark |
| accent | `#f97316` | orange-500 — primary accent, blob, scores, CTA |
| accent-deep | `#ea580c` | orange-600 — pressed/strong accent |
| accent-wash | `#fff7ed` | orange-50 — highlight row bg |
| accent-soft | `#fdba74` | orange-300 — muted accent text on dark |

Map dusk tones (scene 2 only):
| Token | Hex | Use |
|---|---|---|
| land | `#a8a39a` | ground plane |
| roads | `#9e9890` | street strips |
| water | `#3d6e8c` | bay edge |
| building | `#0d0e14` | extruded blocks |
| horizon | `#e8a45c` | warm amber horizon glow |

Blob fill: `rgba(249,115,22,0.82)` with a `#ffffff` 2px border + soft orange ring.

## Typography
- Family: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` (the product's native stack). No web fonts.
- Display headlines: weight 700–800, tight tracking (-0.02em). 96–120px.
- Sub/labels: weight 600, uppercase, letter-spacing 0.14–0.18em, 18–24px.
- Body: weight 400–500, 28–42px.
- Data/scores: weight 700, `font-variant-numeric: tabular-nums`.

## Corners & depth
- Border-radius: cards 12–16px, pills/buttons 8px, badges 6px, blob organic multi-value.
- Depth: light scenes use 2px solid hairlines + soft layered shadows (`0 12px 40px rgba(10,10,10,0.10)`); dark scenes use localized radial glows, never full-screen gradients (H.264 banding).

## Motion
- Premium-kinetic: snappy varied entrances (0.3–0.6s), 3+ eases per scene, vary entry direction. One dramatic slam (logo) with slight overshoot. Ambient: blob breathes, glow pulses — all on the seekable timeline.

## Do / Don't
- DO: real product copy and data; deep frames (glow + grid + ghost type); tabular numerals; full-saturation orange focal hits on the light canvas.
- DON'T: gradient text, neon, pure `#000`/`#fff` flats, identical card grids, generic SaaS language ("streamline/empower"), waveform/equalizer visuals, exit animations before transitions (except final scene).
