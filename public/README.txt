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

--------------------------------------------------------------------------
The sample contractor agreement

Candidates are shown the terms before they accept — on the offer page, above
the accept form, and in the offer email. Both read one switch:

  src/config/site.ts → sampleAgreement { file, version }

Currently published: sample-contractor-agreement-2026-09.pdf, September 2026.

That PDF is generated, not hand-made. Its wording lives in
scripts/sample-agreement.mjs, which prints it through Chromium. Edit the text
there and re-run it rather than editing the PDF, or the two drift apart and
nobody can tell what the published document actually says:

  npm i -D playwright && npx playwright install chromium
  node scripts/sample-agreement.mjs

To publish a new one:
  1. Put the PDF in this folder, with the revision in the filename, e.g.
     sample-contractor-agreement-2026-09.pdf
  2. Set `file` to that filename and `version` to e.g. "September 2026".

Leave `file` empty and nothing is shown anywhere. That is the correct state
until there is a document: a link to a missing file reads worse to a candidate
weighing up whether a remote offer is genuine than no link at all.

Two things the document itself must do:

  - Say SPECIMEN on every page, along the lines of "not an offer and not
    binding; your personalised agreement is issued for signature after you
    accept". Without it, someone can argue the sample formed the contract —
    and if its figures differ from their offer, that is a real problem.
  - Carry the same version date shown in the config, so you can tell which
    revision any given candidate read.

Change the filename as well as the version when you revise it, or a browser
holding the old file in cache will keep serving it.

This document should be drawn up by a lawyer. A contractor agreement written
in-house is what creates employment-misclassification exposure, and these
engagements cross several jurisdictions.
