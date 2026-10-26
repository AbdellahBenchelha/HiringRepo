/**
 * SERVER-ONLY. Turns what was written in the Send email tab's editor into an
 * email: cleaned HTML, a plain-text copy, and the full message in the chosen
 * design.
 *
 * The editor hands over raw HTML, and anything can arrive in it — a paste from
 * Word or a web page brings scripts, classes, tracking pixels and fonts no
 * mail app has. Only formatting the toolbar can make survives: text styles,
 * colours, sizes, the email-safe fonts, alignment, lists, headings and links
 * (web and mailto only). Everything else is dropped, not escaped, so what is
 * sent looks like what the preview showed.
 */
import sanitizeHtml from "sanitize-html";
import { DEFAULT_FONT_SIZE } from "@/lib/composeOptions";

const COLOR = [
  /^#[0-9a-f]{3,8}$/i,
  /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i,
  /^[a-z]{3,20}$/i,
];

const SIZE = [/^(?:[8-9]|[1-6]\d|7[0-2])(?:\.\d+)?px$/, /^(?:x-small|small|medium|large|x-large|xx-large)$/];

const STYLES: sanitizeHtml.IOptions["allowedStyles"] = {
  "*": {
    color: COLOR,
    "background-color": COLOR,
    "font-family": [/^[a-z0-9 ,'"-]{1,100}$/i],
    "font-size": SIZE,
    "font-weight": [/^(?:bold|bolder|normal|[1-9]00)$/],
    "font-style": [/^(?:italic|normal)$/],
    "text-decoration": [/^(?:none|underline|line-through|underline line-through|line-through underline)$/],
    "text-decoration-line": [/^(?:none|underline|line-through|underline line-through|line-through underline)$/],
    "text-align": [/^(?:left|center|right|justify)$/],
  },
};

/** <font size="1..7">, from older editors and pastes, as pixel sizes. */
const FONT_TAG_SIZES: Record<string, number> = { "1": 10, "2": 13, "3": 16, "4": 18, "5": 24, "6": 32, "7": 48 };

/** Adds email-safe defaults to a tag's style, keeping whatever it already says. */
function withDefault(attribs: Record<string, string>, defaults: string): Record<string, string> {
  const own = attribs.style ? `;${attribs.style}` : "";
  return { ...attribs, style: `${defaults}${own}` };
}

const TAGS = [
  "p", "div", "br", "span", "b", "strong", "i", "em", "u", "s", "strike", "sub", "sup",
  "ul", "ol", "li", "h1", "h2", "h3", "blockquote", "hr", "a",
];

export function cleanEmailHtml(raw: string): string {
  // Pass 1: keep only the allowed tags, attributes, styles and link schemes.
  const cleaned = sanitizeHtml(raw, {
    allowedTags: TAGS,
    allowedAttributes: { "*": ["style"], a: ["href", "style"] },
    allowedStyles: STYLES,
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    // Tags that carry content nobody should see (scripts, styles) go with it.
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "title", "head"],
    transformTags: {
      font: (_tag, attribs) => {
        const style = [
          attribs.face ? `font-family:${attribs.face}` : "",
          attribs.color ? `color:${attribs.color}` : "",
          attribs.size && FONT_TAG_SIZES[attribs.size] ? `font-size:${FONT_TAG_SIZES[attribs.size]}px` : "",
          attribs.style ?? "",
        ]
          .filter(Boolean)
          .join(";");
        const out: Record<string, string> = {};
        if (style) out.style = style;
        return { tagName: "span", attribs: out };
      },
    },
  });

  // Pass 2, on what is now clean: mail apps ignore stylesheets, so spacing and
  // link colour are written on the tags themselves. Done after the cleaning,
  // which would otherwise strip these (margin and padding are not styles a
  // writer can set). The writer's own styles come last, so they win.
  const styled = sanitizeHtml(cleaned, {
    allowedTags: TAGS,
    allowedAttributes: { "*": ["style"], a: ["href", "style"] },
    allowedSchemes: ["http", "https", "mailto"],
    parseStyleAttributes: false,
    transformTags: {
      p: (tag, attribs) => ({ tagName: tag, attribs: withDefault(attribs, "margin:0 0 14px 0") }),
      h1: (_tag, attribs) => ({ tagName: "h2", attribs: withDefault(attribs, "margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#0f1035") }),
      h2: (tag, attribs) => ({ tagName: tag, attribs: withDefault(attribs, "margin:0 0 12px 0;font-size:22px;line-height:1.3;color:#0f1035") }),
      h3: (tag, attribs) => ({ tagName: tag, attribs: withDefault(attribs, "margin:0 0 10px 0;font-size:18px;line-height:1.35;color:#0f1035") }),
      ul: (tag, attribs) => ({ tagName: tag, attribs: withDefault(attribs, "margin:0 0 14px 0;padding-left:24px") }),
      ol: (tag, attribs) => ({ tagName: tag, attribs: withDefault(attribs, "margin:0 0 14px 0;padding-left:24px") }),
      li: (tag, attribs) => ({ tagName: tag, attribs: withDefault(attribs, "margin:0 0 6px 0") }),
      blockquote: (tag, attribs) => ({
        tagName: tag,
        attribs: withDefault(attribs, "margin:0 0 14px 0;padding:4px 0 4px 14px;border-left:3px solid #eae7db"),
      }),
      hr: (tag, attribs) => ({ tagName: tag, attribs: withDefault(attribs, "border:0;border-top:1px solid #eae7db;margin:18px 0") }),
      a: (tag, attribs) => ({ tagName: tag, attribs: withDefault(attribs, "color:#b06e0c;text-decoration:underline") }),
    },
  });
  // The newer spelling is not understood by every mail app; the older one is.
  return styled.replace(/text-decoration-line:/g, "text-decoration:");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

/** The plain-text copy every email also carries, from the cleaned HTML. */
export function emailHtmlToText(cleaned: string): string {
  const text = cleaned
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
      const label = inner.replace(/<[^>]+>/g, "").trim();
      const url = decodeEntities(href).replace(/^mailto:/, "");
      return label && decodeEntities(label) !== url ? `${label} (${url})` : url;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<hr[^>]*>/gi, "\n----------\n")
    .replace(/<\/(p|div|h1|h2|h3|li|blockquote|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(text)
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** True when there is nothing to read — the editor leaves tags behind when emptied. */
export function isEmptyEmail(cleaned: string): boolean {
  return emailHtmlToText(cleaned).replace(/\s|•|-/g, "") === "" && !/<hr/i.test(cleaned);
}

export const BODY_FONT = `font-family:Arial,Helvetica,sans-serif;font-size:${DEFAULT_FONT_SIZE}px;line-height:1.6;color:#383864`;
