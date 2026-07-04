"""One-off: extract the white 'peel' wordmark from peel.png onto transparency.

Treats every pixel as white blended over the flat orange background and solves
for the blend alpha, so the soft gradient in the curled 'p' is preserved as
semi-transparent white. Output: public/peel-logo.png (tightly cropped).
"""

from PIL import Image
import numpy as np

src = Image.open("peel.png").convert("RGB")
px = np.asarray(src).astype(np.float32)

# Background color: median of the four 8x8 corner patches.
h, w, _ = px.shape
corners = np.concatenate(
    [
        px[:8, :8].reshape(-1, 3),
        px[:8, -8:].reshape(-1, 3),
        px[-8:, :8].reshape(-1, 3),
        px[-8:, -8:].reshape(-1, 3),
    ]
)
bg = np.median(corners, axis=0)
print("background:", bg)

# Solve P = a*255 + (1-a)*bg per channel; use the channel with the largest
# headroom (255 - bg) for stability, which for orange is blue.
denom = 255.0 - bg
c = int(np.argmax(denom))
alpha = (px[:, :, c] - bg[c]) / denom[c]
alpha = np.clip(alpha, 0.0, 1.0)

# Snap near-extremes so the flat background is fully transparent.
alpha[alpha < 0.05] = 0.0
alpha[alpha > 0.985] = 1.0

# Crop around the solid strokes only, so faint background grain far from the
# wordmark can't inflate the box; then discard everything outside it.
ys, xs = np.nonzero(alpha > 0.5)
pad = 14
y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, h)
x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, w)
mask = np.zeros_like(alpha)
mask[y0:y1, x0:x1] = 1.0
alpha *= mask

out = np.zeros((h, w, 4), dtype=np.uint8)
out[:, :, :3] = 255
out[:, :, 3] = (alpha * 255).round().astype(np.uint8)
img = Image.fromarray(out[y0:y1, x0:x1])
img.save("public/peel-logo.png")
print("saved public/peel-logo.png", img.size)
