# NexaCare Support Solutions — Recruitment Website

A complete, professional, responsive recruitment website for a customer-support /
call-center company, built with **Next.js (App Router)**, **TypeScript**, and
**Tailwind CSS**.

> **Build Your Career. Connect With People. Make a Difference.**

## Quick start

```bash
npm install
npm run dev      # start the dev server at http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

## What's included

- **Landing page** with hero, stats, about, benefits, open positions, candidate
  requirements, recruitment process, testimonials, FAQ, CTA, and contact.
- **Apply Now** flow — an accessible full-screen modal _and_ a dedicated `/apply`
  page. Clicking **Apply for This Position** pre-selects the role in the form.
- **Detailed application form** with personal info, position, multiple languages,
  multiple work-experience records, education, application questions, optional
  CV/document uploads, and consent declarations — plus full client-side
  validation, spam honeypot, and a success confirmation.
- **Separate contact form**.
- **Cookie-consent system** (accept all / reject non-essential / customize) that
  does not activate non-essential tracking before consent.
- **Legal pages**: Privacy Policy, Applicant Privacy Notice, Cookie Policy,
  Terms & Conditions, Legal Notice, Equal Opportunity, Accessibility, and Data
  Retention.
- **SEO**: per-page titles & meta descriptions, Open Graph/Twitter tags,
  Organization + JobPosting structured data, `sitemap.xml`, and `robots.txt`,
  with human-readable URLs (`/jobs/customer-support-representative`, etc.).
- **Accessibility**: keyboard navigation, visible focus, labelled forms,
  screen-reader error messages, accessible modal & accordion, reduced-motion
  support.

## Editing company content

Almost everything is editable from a few config files in `src/config/`:

| File | What it controls |
| --- | --- |
| `site.ts` | Company name, tagline, descriptions, **contact emails** (incl. recruitment email), phone, address, social links, legal/registration details, statistics, languages, work arrangements, upload limits, and **demo mode**. |
| `jobs.ts` | Open positions (title, slug, description, responsibilities, requirements). |
| `content.ts` | Benefits, candidate requirements, recruitment steps, testimonials, FAQs. |
| `navigation.ts` | Header and footer navigation links. |
| `contracts.ts` + `contract-document.json` | The specimen employment contract sent with job offers: version, download path, and the plain-language summary shown on the page. |

### Recruitment email

Change `siteConfig.contact.recruitmentEmail` in `src/config/site.ts`. When a
backend is connected, also set the server-side `RECRUITMENT_EMAIL` environment
variable (see below).

## Sample contract sent with job offers

Every job offer links to an unlisted page, **`/sample-contract`**, where the
candidate can read and download a specimen of the employment contract *before*
deciding whether to accept. The wording for the offer email itself is in
[`docs/offer-email-template.md`](docs/offer-email-template.md).

| Path | Role |
| --- | --- |
| `docs/contracts/sample-employment-contract.md` | The contract text. **Edit this file.** |
| `src/config/contract-document.json` | Version, issue date, download path (page counts and file size are filled in by the build). |
| `scripts/build-contract-pdf.mjs` | Renders the markdown into the PDF. No dependencies. |
| `public/documents/*.pdf` | The generated download. **Never edit by hand.** |
| `src/app/sample-contract/page.tsx` | The unlisted page candidates are linked to. |

To change the contract:

```bash
# 1. edit docs/contracts/sample-employment-contract.md
# 2. bump "version" and "issued" in src/config/contract-document.json
npm run build:contract          # rebuilds the PDF
# 3. commit both the markdown and the regenerated PDF
```

The builder supports a small markdown subset: `#`/`##`/`###` headings, `- `
bullets, `> ` note boxes (used for the specimen warnings), `**bold**`, and blank
lines as paragraph breaks. Unsupported characters are reported instead of being
silently dropped.

**The page is unlisted on purpose.** It is absent from the sitemap and from the
header and footer navigation, sends `noindex`, is disallowed in `robots.txt`, and
the PDF is served with an `X-Robots-Tag: noindex` header (`next.config.mjs`).
Candidates reach it through the link in their offer. Publishing the link puts
the company's employment terms in front of everyone, competitors included.

> ⚠️ **The specimen text is a jurisdiction-neutral placeholder, not legal
> advice.** Have it reviewed by a qualified legal professional for your country
> of employment before any candidate receives it. It currently covers permanent,
> full-time roles only — fixed-term and part-time offers need their own
> specimen.

## ⚠️ Before you publish

Search the codebase for `PLACEHOLDER` and replace every marked value:

- **Legal/company details** in `site.ts` (`legal` block) and the Legal Notice.
- **Contact details**, **statistics**, and **social links** in `site.ts`.
- **Testimonials** in `content.ts` — currently fictional placeholders.
- **`og-image.png`** social-sharing image in `/public` (1200×630).
- **`siteConfig.url`** — set your real domain.
- **The specimen contract** in `docs/contracts/sample-employment-contract.md` —
  jurisdiction-neutral placeholder text; replace and have it reviewed, then run
  `npm run build:contract`.
- Have all **legal pages reviewed by a qualified legal professional** for your
  jurisdiction.

## Demonstration vs. production (backend)

The site ships in **demo mode** (`siteConfig.demoMode = true`). In demo mode the
application and contact forms **do not transmit any data** — submissions are
clearly labelled as TEST submissions and nothing leaves the browser.

To go live, set `demoMode = false` and implement the backend integration points
documented in **`src/lib/submit.ts`**, including:

1. Application submission endpoint (`/api/apply`)
2. Secure CV storage (private, encrypted object storage)
3. Email notifications (to the recruitment team + applicant confirmation)
4. Database storage with the configured retention period
5. Server-side spam protection (CAPTCHA + honeypot + rate limiting)
6. Applicant-data deletion process

> **Security:** never place private API keys in the frontend. All secrets belong
> in server-side environment variables.

## Project structure

```
src/
  app/            # routes (App Router): home, about, careers, jobs, apply,
                  # contact, legal pages, sitemap.ts, robots.ts
  components/     # reusable UI: header, footer, cards, forms, cookies, sections
  config/         # editable content: site, jobs, content, navigation
  lib/            # validation, submission integration points, SEO helpers
```
