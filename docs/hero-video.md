# Hero video

The active hero uses `src/components/AvatarVideo.jsx`, configured by
`profile.heroVideo` in `src/data/profile.json`. Configure `src`, `fallbackImage`,
`accessibleLabel`, `alt`, `width`, and `height` there. The public assets are
byte-for-byte copies of `references/developer-salute.mp4` and
`references/developer-avatar.png`; the reference files are preserved.

The MP4 is 960 × 960, 30 fps, and 5.1 seconds long. Full-resolution first and
last frames were extracted through Chromium's video decoder and inspected.
The final frame is a natural seated idle pose, so it stays visible after `ended`.
The PNG and first frame have closely matching composition. A short opacity
transition reveals the decoded video over the PNG. Reduced motion disables
autoplay and the transition, while still permitting explicit playback.

The MP4 has an opaque background. Its sampled top-left pixel is approximately
RGB(7, 19, 33), versus the hero's RGB(9, 20, 33). A narrow edge mask blends only
the empty outer margins. A subtle dark background difference and baked-in
floor shadow remain; no color filters, cropping, or theme changes are applied.
The PNG is also slightly different in background tone. The keyboard-only cyan
outline is a focus indicator, not a decorative media frame.

The left-side heading, greeting writing, name glitch, summary, and social-link
animation code are unchanged. Below 1024px the avatar appears above the greeting
with 32px of spacing; on desktop it remains to the right. The old 3D components
are no longer imported by the hero. Their source, Blender/model assets, and
existing dependencies are preserved (the inactive sources still import those
dependencies). The production bundle contains no Three.js render path.

## Verification

- `npm test`: all 5 existing tests pass.
- `npm run build`: passes, including portfolio JSON and local asset validation.
- `node scripts/verify-avatar.mjs`: Chromium integration checks for autoplay,
  completion, replay, repeated activation, Enter/Space, focus visibility, reduced
  motion, blocked autoplay, failed media, delayed loading, visibility gating,
  and layouts/tap playback at 320/390/768/1024/1440 pixels.
- Screenshots and decoded endpoint frames are written to ignored
  `test-results/avatar/` for inspection.

To rerun browser checks, install Playwright temporarily with
`npm install --no-save --package-lock=false playwright`, ensure its Chromium
browser is installed, start `npm run dev`, then run the verification script.
Playwright was not added to the package manifest or lockfile. Browser checks
use headless Chromium with mobile viewport/touch emulation, not physical iOS
or Android devices; native Safari/Firefox behavior has not been verified.

Nothing has been committed or pushed.
