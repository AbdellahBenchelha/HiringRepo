/**
 * SERVER-ONLY. Making received email safe to show.
 *
 * An email's HTML is written by a stranger. It is cleaned once on arrival —
 * no scripts, no forms, no frames, no event handlers; links open in a new
 * tab — and then shown in its own sandboxed page whose security policy allows
 * no scripts at all and, until the reader asks, no pictures from the internet
 * (which are how senders learn that, when and where an email was opened).
 */
import sanitizeHtml from "sanitize-html";

const TAGS = [
  "a", "abbr", "address", "b", "big", "blockquote", "br", "caption", "center", "cite", "code", "col", "colgroup",
  "dd", "div", "dl", "dt", "em", "font", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "li", "ol", "p",
  "pre", "q", "s", "small", "span", "strike", "strong", "style", "sub", "sup", "table", "tbody", "td", "tfoot",
  "th", "thead", "tr", "u", "ul",
];

const COMMON_ATTRS = [
  "style", "align", "valign", "width", "height", "bgcolor", "border", "cellpadding", "cellspacing", "colspan",
  "rowspan", "dir", "class", "color", "face", "size", "title", "lang",
];

export function cleanInboundHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: TAGS,
    // <style> blocks are part of how most emails look. They cannot run
    // anything, and the viewing page's policy stops them loading pictures
    // the reader has not asked for.
    allowVulnerableTags: true,
    allowedAttributes: {
      "*": COMMON_ATTRS,
      // target/rel are set below, by the transform, never taken from the email.
      a: [...COMMON_ATTRS, "href", "name", "target", "rel"],
      img: [...COMMON_ATTRS, "src", "alt"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data", "cid"] },
    allowProtocolRelative: false,
    parseStyleAttributes: false,
    nonTextTags: ["script", "textarea", "option", "noscript", "title", "head", "iframe", "object"],
    transformTags: {
      a: (tag, attribs) => ({ tagName: tag, attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" } }),
    },
  });
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain text, with web addresses made clickable. */
function textToHtml(text: string): string {
  const linked = esc(text).replace(
    /\bhttps?:\/\/[^\s<>"]+/g,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
  );
  return `<div style="white-space:pre-wrap">${linked}</div>`;
}

/**
 * The page an email is shown in, and the security policy to send with it.
 * `inline` maps a picture's Content-ID to a data: URI, so pictures sent
 * inside the email show without loading anything.
 */
export function mailViewDocument(
  body: { text: string; html?: string },
  inline: Map<string, string>,
  showImages: boolean,
): { html: string; csp: string } {
  let content = body.html ? body.html : textToHtml(body.text);
  content = content.replace(/src=(["'])cid:([^"']+)\1/gi, (m, q: string, cid: string) => {
    const data = inline.get(cid.trim().replace(/^<|>$/g, ""));
    return data ? `src=${q}${data}${q}` : m;
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
body{margin:16px;font:15px/1.55 Arial,Helvetica,sans-serif;color:#0f1035;word-wrap:break-word;overflow-wrap:anywhere}
img{max-width:100%;height:auto}a{color:#985f0a}${showImages ? "" : 'img[src^="http:"],img[src^="https:"]{visibility:hidden}'}blockquote{margin:0 0 0 8px;padding-left:12px;border-left:3px solid #eae7db;color:#4f4f80}
</style></head><body>${content}</body></html>`;
  const images = showImages ? "data: https: http:" : "data:";
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    `img-src ${images}`,
    `font-src ${showImages ? "data: https:" : "data:"}`,
    "frame-ancestors 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    // No scripts, no same-origin: a page in its own opaque box. Links may
    // still open in a new tab.
    "sandbox allow-popups allow-popups-to-escape-sandbox",
  ].join("; ");
  return { html, csp };
}

/** Does the email ask for pictures from the internet? (For the "Show images" bar.) */
export function hasRemoteImages(html: string | undefined): boolean {
  return !!html && /(<img[^>]+src=["']https?:|url\(\s*["']?https?:)/i.test(html);
}
