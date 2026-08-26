/**
 * Content Security Policy.
 *
 * 'unsafe-inline' on script-src is required: Next.js injects inline bootstrap
 * and hydration scripts, and removing it needs a per-request nonce, which in
 * turn needs middleware on every route. The policy still blocks the things
 * that matter most here — third-party script hosts, framing, and exfiltration
 * to arbitrary origins.
 *
 * connect-src must allow two external origins:
 *   https://ipwho.is                     the IP lookup that pre-fills the
 *                                        applicant's country and dialling code;
 *   <account>.r2.cloudflarestorage.com   object storage, which the browser
 *                                        uploads documents to directly.
 *
 * The origin has to be whatever the SDK will actually sign against, or the
 * browser refuses the upload and the failure looks like a storage outage. That
 * is R2_ENDPOINT when it is set — src/lib/r2.ts prefers it over the account id,
 * so a custom endpoint would otherwise be signed for and then blocked here.
 *
 * Falling back to a wildcard means still only R2, but any R2 account. Set
 * R2_ACCOUNT_ID (or R2_ENDPOINT) at build time so the origin stays pinned.
 */
function storageOrigin() {
  const endpoint = process.env.R2_ENDPOINT?.trim();
  if (endpoint) {
    try {
      return new URL(endpoint).origin;
    } catch {
      // Malformed value — fall through rather than emitting a broken policy.
    }
  }
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  return accountId
    ? `https://${accountId}.r2.cloudflarestorage.com`
    : "https://*.r2.cloudflarestorage.com";
}

const r2Origin = storageOrigin();

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // Identity photographs are reviewed inline in the Admin Panel, served
  // from storage. Without the origin here the review panel is blank.
  `img-src 'self' data: blob: ${r2Origin}`,
  "font-src 'self' data:",
  `connect-src 'self' https://ipwho.is ${r2Origin}`,
  // The Admin Panel previews candidate PDFs in an iframe pointed at storage.
  // Without this, default-src refuses the frame and the preview is blank.
  `frame-src 'self' ${r2Origin}`,
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Belt and braces with frame-ancestors, for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // The admin panel and the assessment must never be cached by a proxy
        // or left in the back/forward cache on a shared machine.
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      {
        source: "/interview",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
