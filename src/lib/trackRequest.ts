/**
 * Reading a page view: is it a person, on what, and where did they come from.
 *
 * Pure, so the rules are testable without a server. Every one of them exists
 * to stop the dashboard reporting fiction — an uncounted bot is a missing
 * visitor, but a counted one is an invented visitor, and the second is worse
 * because it looks like growth.
 */

/**
 * Anything that is not a person looking at the site.
 *
 * The link-preview fetchers matter as much as the search crawlers here: every
 * time an assessment link is pasted into WhatsApp, Telegram or Slack, their
 * servers fetch the page. Left in, sending fifty invitations would look like
 * fifty visitors.
 */
const BOT = new RegExp(
  [
    "bot", "crawl", "spider", "slurp", "search", "scrape", "archiver", "monitor",
    "headless", "phantom", "lighthouse", "pagespeed", "pingdom", "uptime", "gtmetrix",
    "curl", "wget", "python-requests", "httpx", "axios", "go-http", "java/", "okhttp",
    "facebookexternalhit", "whatsapp", "telegram", "slackbot", "discord", "twitterbot",
    "linkedinbot", "embedly", "quora link", "skypeuripreview", "vkshare", "preview",
  ].join("|"),
  "i",
);

export function isBot(userAgent: string): boolean {
  if (!userAgent.trim()) return true; // a real browser always says who it is
  return BOT.test(userAgent);
}

/** Coarse on purpose: the split that changes a design decision is this one. */
export function deviceOf(userAgent: string): "mobile" | "desktop" {
  return /android|iphone|ipad|ipod|mobile|tablet|silk|kindle|opera mini|windows phone/i.test(
    userAgent,
  )
    ? "mobile"
    : "desktop";
}

/** Search engines and networks worth naming, keyed by a fragment of the host. */
const SOURCES: [RegExp, string][] = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\./, "Bing"],
  [/(^|\.)(duckduckgo|ecosia|brave|yandex|baidu)\./, "Search"],
  [/(^|\.)yahoo\./, "Yahoo"],
  [/(^|\.)(facebook|fb)\.|(^|\.)m\.facebook\./, "Facebook"],
  [/(^|\.)instagram\./, "Instagram"],
  [/(^|\.)linkedin\.|lnkd\.in/, "LinkedIn"],
  [/(^|\.)(twitter|x)\.com|t\.co$/, "X"],
  [/(^|\.)tiktok\./, "TikTok"],
  [/(^|\.)(whatsapp|wa\.me)/, "WhatsApp"],
  [/(^|\.)t\.me|telegram/, "Telegram"],
  [/(^|\.)youtube\.|youtu\.be/, "YouTube"],
  [/(^|\.)reddit\./, "Reddit"],
  [/(^|\.)indeed\.|glassdoor|jobstreet|bayt\.|rekrute|emploi/, "Job boards"],
];

/**
 * Where a visit came from, as something readable.
 *
 * A visitor moving between pages of the site is not a referral — counting it
 * as one would make the site its own biggest traffic source, which is true and
 * useless. Those become "Direct", the same as someone typing the address in.
 */
export function sourceOf(referrer: string, ownHost: string): string {
  const raw = referrer.trim();
  if (!raw) return "Direct";

  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "Direct";
  }

  const own = ownHost.toLowerCase().replace(/^www\./, "");
  if (!host || host === own) return "Direct";

  for (const [pattern, label] of SOURCES) {
    if (pattern.test(host)) return label;
  }
  return host;
}

/**
 * The path, reduced to something a list can hold.
 *
 * Query strings go: every campaign tag on a job link would otherwise split
 * that one page across a dozen rows. So does a trailing slash, and anything
 * absurdly long, which is a probe rather than a page.
 */
export function normalisePath(raw: string): string | null {
  const value = (raw || "").trim();
  if (!value.startsWith("/") || value.length > 300) return null;
  const path = value.split(/[?#]/)[0].replace(/\/{2,}/g, "/");
  const trimmed = path.length > 1 ? path.replace(/\/$/, "") : path;
  // The admin panel is not the website. Counting it would mean every morning
  // spent reviewing candidates showed up as traffic.
  if (trimmed === "/admin" || trimmed.startsWith("/admin/")) return null;
  return trimmed;
}
