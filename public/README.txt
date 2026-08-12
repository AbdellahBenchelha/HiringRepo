Place static assets here.

Brand assets currently in place:
- og-image.png    → 1200 x 630 social-sharing card (referenced by SEO metadata).
- logo.svg        → full lockup, mark + wordmark.
- logo-mark.svg   → bare mark on its own.

The browser tab icon is NOT in this folder. It is handled by the Next.js App
Router file convention instead:
- src/app/icon.svg       → favicon (SVG, scales to every tab size).
- src/app/apple-icon.png → 180 x 180 iOS home-screen icon.
  Note: apple-icon must be PNG or JPG — Next.js ignores an SVG here.

If you change the mark, update all five files so they stay in sync.
