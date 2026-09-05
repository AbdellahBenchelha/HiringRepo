#!/usr/bin/env node
/**
 * SPECIMEN CONTRACT — PDF BUILDER
 * ==============================
 *
 * Renders docs/contracts/sample-employment-contract.md into the downloadable
 * PDF that candidates receive with their job offer.
 *
 *   npm run build:contract
 *
 * HR and legal edit the MARKDOWN file, never the PDF. Re-run the command and
 * commit both files. Document metadata (version, issue date, output path)
 * lives in src/config/contract-document.json and is shared with the website,
 * so the page and the PDF can never disagree about which version is current.
 *
 * The script has NO dependencies: it writes the PDF byte-for-byte using the
 * PDF base-14 fonts (Helvetica). That keeps a legal document reproducible
 * years from now without a toolchain to restore.
 *
 * Supported markdown subset (deliberately small — a contract needs no more):
 *   # Heading        document title (first page only)
 *   ## Heading       numbered clause heading
 *   ### Heading      sub-heading
 *   - item           bullet list item
 *   > text           highlighted note box (used for the specimen warnings)
 *   **bold**         inline bold
 *   blank line       paragraph break
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const META_PATH = join(ROOT, "src/config/contract-document.json");

/* -------------------------------------------------------------------------- */
/* Page geometry and styling (points; 1 pt = 1/72 inch, A4)                    */
/* -------------------------------------------------------------------------- */

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = { top: 78, bottom: 74, left: 62, right: 62 };
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;
const CONTENT_TOP = PAGE.height - MARGIN.top;
const CONTENT_BOTTOM = MARGIN.bottom;

/** Colours mirror the website palette (tailwind.config.ts). */
const COLOR = {
  navy900: [0.059, 0.11, 0.212],
  navy700: [0.122, 0.212, 0.38],
  navy600: [0.157, 0.267, 0.475],
  brand700: [0.114, 0.306, 0.847],
  noteBg: [0.937, 0.965, 1.0],
  noteBar: [0.145, 0.388, 0.922],
  rule: [0.839, 0.878, 0.941],
  watermark: [0.906, 0.925, 0.957],
  footer: [0.42, 0.475, 0.575],
};

const STYLE = {
  h1: { size: 21, font: "F2", leading: 26, before: 0, after: 16, color: COLOR.navy900 },
  h2: { size: 12.5, font: "F2", leading: 16, before: 20, after: 7, color: COLOR.navy900 },
  h3: { size: 11, font: "F2", leading: 15, before: 14, after: 5, color: COLOR.navy900 },
  p: { size: 10.5, font: "F1", leading: 15.2, before: 0, after: 9, color: COLOR.navy700 },
  li: { size: 10.5, font: "F1", leading: 15.2, before: 0, after: 5, color: COLOR.navy700 },
  note: { size: 10, font: "F3", leading: 14.4, before: 8, after: 14, color: COLOR.navy700 },
};

const BULLET_INDENT = 15;
const NOTE_PAD = { x: 12, y: 10 };
const NOTE_BAR_WIDTH = 3;

/* -------------------------------------------------------------------------- */
/* Base-14 font metrics (units of 1/1000 em, WinAnsiEncoding)                  */
/* -------------------------------------------------------------------------- */

// prettier-ignore
const HELVETICA = [
  278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,
  278,278,584,584,584,556,1015,
  667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
  278,278,278,469,556,333,
  556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,
  334,260,334,584,
];
// prettier-ignore
const HELVETICA_BOLD = [
  278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,
  333,333,584,584,584,611,975,
  722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
  333,278,333,584,556,333,
  556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,
  389,280,389,584,
];

/**
 * Non-ASCII characters we allow, mapped to their WinAnsi byte and width.
 * Anything else is replaced with "?" and reported, so a stray character can
 * never silently corrupt a legal document.
 */
const EXTRA_CHARS = {
  "–": { byte: 0x96, w: 556, wb: 556 }, // en dash
  "—": { byte: 0x97, w: 1000, wb: 1000 }, // em dash
  "‘": { byte: 0x91, w: 222, wb: 238 }, // left single quote
  "’": { byte: 0x92, w: 222, wb: 238 }, // right single quote / apostrophe
  "“": { byte: 0x93, w: 333, wb: 500 }, // left double quote
  "”": { byte: 0x94, w: 333, wb: 500 }, // right double quote
  "•": { byte: 0x95, w: 350, wb: 350 }, // bullet
  "…": { byte: 0x85, w: 1000, wb: 1000 }, // ellipsis
  "·": { byte: 0xb7, w: 278, wb: 278 }, // middle dot
  " ": { byte: 0x20, w: 278, wb: 278 }, // non-breaking space
  "€": { byte: 0x80, w: 556, wb: 556 }, // euro
  "é": { byte: 0xe9, w: 556, wb: 556 }, // e acute
};

const unknownChars = new Set();

/** Width of one character in 1/1000 em for the given font id. */
function charWidth(ch, fontId) {
  const bold = fontId === "F2";
  const code = ch.charCodeAt(0);
  if (code >= 32 && code <= 126) {
    return (bold ? HELVETICA_BOLD : HELVETICA)[code - 32];
  }
  const extra = EXTRA_CHARS[ch];
  if (extra) return bold ? extra.wb : extra.w;
  unknownChars.add(ch);
  return bold ? HELVETICA_BOLD[31] : HELVETICA[31]; // width of "?"
}

/** Rendered width of a string at a given size. */
function textWidth(str, fontId, size) {
  let total = 0;
  for (const ch of str) total += charWidth(ch, fontId);
  return (total * size) / 1000;
}

/** Escape a string into a PDF literal string using WinAnsi bytes. */
function pdfString(str) {
  let out = "";
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (ch === "\\" || ch === "(" || ch === ")") {
      out += "\\" + ch;
    } else if (code >= 32 && code <= 126) {
      out += ch;
    } else if (EXTRA_CHARS[ch]) {
      out += "\\" + EXTRA_CHARS[ch].byte.toString(8).padStart(3, "0");
    } else {
      unknownChars.add(ch);
      out += "?";
    }
  }
  return `(${out})`;
}

/* -------------------------------------------------------------------------- */
/* Markdown parsing                                                            */
/* -------------------------------------------------------------------------- */

/** Split text containing **bold** spans into runs. */
function parseRuns(text, baseFont) {
  const runs = [];
  const boldFont = "F2";
  let rest = text;
  while (rest.length > 0) {
    const start = rest.indexOf("**");
    if (start === -1) {
      runs.push({ text: rest, font: baseFont });
      break;
    }
    const end = rest.indexOf("**", start + 2);
    if (end === -1) {
      runs.push({ text: rest, font: baseFont });
      break;
    }
    if (start > 0) runs.push({ text: rest.slice(0, start), font: baseFont });
    runs.push({ text: rest.slice(start + 2, end), font: boldFont });
    rest = rest.slice(end + 2);
  }
  return runs.filter((run) => run.text.length > 0);
}

/** Parse the supported markdown subset into a flat list of blocks. */
function parseMarkdown(source) {
  const blocks = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let buffer = [];
  let bufferType = null;

  const flush = () => {
    if (!bufferType || buffer.length === 0) {
      buffer = [];
      bufferType = null;
      return;
    }
    blocks.push({ type: bufferType, text: buffer.join(" ").replace(/\s+/g, " ").trim() });
    buffer = [];
    bufferType = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === "") {
      flush();
      continue;
    }
    if (line.startsWith("### ")) {
      flush();
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("# ")) {
      flush();
      blocks.push({ type: "h1", text: line.slice(2).trim() });
      continue;
    }
    if (line.startsWith("> ")) {
      if (bufferType !== "note") flush();
      bufferType = "note";
      buffer.push(line.slice(2).trim());
      continue;
    }
    if (line.startsWith("- ")) {
      flush();
      blocks.push({ type: "li", text: line.slice(2).trim() });
      continue;
    }
    // Continuation of a list item: indented text directly under a bullet.
    if (/^\s{2,}\S/.test(raw) && blocks.length > 0 && blocks[blocks.length - 1].type === "li" && !bufferType) {
      const previous = blocks[blocks.length - 1];
      previous.text = `${previous.text} ${line.trim()}`.replace(/\s+/g, " ");
      continue;
    }
    if (bufferType !== "p") flush();
    bufferType = "p";
    buffer.push(line.trim());
  }
  flush();
  return blocks;
}

/* -------------------------------------------------------------------------- */
/* Line breaking and pagination                                                */
/* -------------------------------------------------------------------------- */

/** Break runs into lines that fit `maxWidth`, keeping bold spans intact. */
function wrapRuns(runs, size, maxWidth) {
  const words = [];
  for (const run of runs) {
    const parts = run.text.split(/(\s+)/);
    for (const part of parts) {
      if (part === "") continue;
      words.push({ text: part, font: run.font, space: /^\s+$/.test(part) });
    }
  }

  const lines = [];
  let current = [];
  let width = 0;

  for (const word of words) {
    const w = textWidth(word.text, word.font, size);
    if (word.space) {
      if (current.length === 0) continue; // no leading spaces
      current.push({ ...word, width: w });
      width += w;
      continue;
    }
    if (current.length > 0 && width + w > maxWidth) {
      while (current.length > 0 && current[current.length - 1].space) {
        width -= current.pop().width;
      }
      lines.push(current);
      current = [];
      width = 0;
    }
    current.push({ ...word, width: w });
    width += w;
  }
  while (current.length > 0 && current[current.length - 1].space) current.pop();
  if (current.length > 0) lines.push(current);
  return lines.length > 0 ? lines : [[]];
}

/**
 * Turn blocks into measured items ready for pagination.
 * Headings and note boxes are atomic: they never split across a page.
 */
function measureBlocks(blocks) {
  const items = [];
  for (const block of blocks) {
    const style = STYLE[block.type] ?? STYLE.p;
    const indent = block.type === "li" ? BULLET_INDENT : 0;
    const inset = block.type === "note" ? NOTE_PAD.x + NOTE_BAR_WIDTH : 0;
    const width = CONTENT_WIDTH - indent - inset * 2;
    const runs = parseRuns(block.text, style.font);
    const lines = wrapRuns(runs, style.size, width);

    items.push({
      type: block.type,
      style,
      indent,
      inset,
      lines,
      atomic: block.type !== "p" && block.type !== "li",
      height: lines.length * style.leading + (block.type === "note" ? NOTE_PAD.y * 2 : 0),
    });
  }
  return items;
}

/** Distribute measured items over pages, returning an array of page item lists. */
function paginate(items) {
  const pages = [];
  let page = [];
  let y = CONTENT_TOP;

  const pushPage = () => {
    pages.push(page);
    page = [];
    y = CONTENT_TOP;
  };

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    let top = y - (page.length === 0 ? 0 : item.style.before);

    // Never leave a heading stranded at the foot of a page.
    const isHeading = item.type === "h2" || item.type === "h3";
    const lookahead = isHeading ? item.height + STYLE.p.leading * 2 : item.height;

    if (item.atomic && top - lookahead < CONTENT_BOTTOM && page.length > 0) {
      pushPage();
      top = CONTENT_TOP;
    }

    if (item.atomic) {
      page.push({ ...item, top });
      y = top - item.height - item.style.after;
      continue;
    }

    // Flowing text: split line by line across page boundaries.
    let remaining = item.lines;
    let first = true;
    while (remaining.length > 0) {
      const available = Math.max(0, Math.floor((top - CONTENT_BOTTOM) / item.style.leading));
      if (available < 1) {
        pushPage();
        top = CONTENT_TOP;
        continue;
      }
      const take = remaining.slice(0, available);
      page.push({ ...item, lines: take, top, continued: !first });
      remaining = remaining.slice(available);
      top -= take.length * item.style.leading;
      first = false;
      if (remaining.length > 0) {
        pushPage();
        top = CONTENT_TOP;
      }
    }
    y = top - item.style.after;
  }
  if (page.length > 0) pages.push(page);
  return pages;
}

/* -------------------------------------------------------------------------- */
/* PDF content-stream drawing                                                  */
/* -------------------------------------------------------------------------- */

const fmt = (n) => (Math.round(n * 1000) / 1000).toString();
const rgb = (c) => `${fmt(c[0])} ${fmt(c[1])} ${fmt(c[2])}`;

/** Draw one laid-out line, emitting a single text run per font span. */
function drawLine(ops, line, x, y, size, color) {
  if (line.length === 0) return;
  ops.push(`${rgb(color)} rg`);

  const show = (font, startX, text) => {
    if (text.trim() === "") return;
    ops.push(
      `BT /${font} ${fmt(size)} Tf 1 0 0 1 ${fmt(startX)} ${fmt(y)} Tm ${pdfString(text)} Tj ET`
    );
  };

  let cursor = x;
  let runFont = line[0].font;
  let runStart = x;
  let runText = "";

  for (const word of line) {
    if (word.font !== runFont) {
      show(runFont, runStart, runText);
      runFont = word.font;
      runStart = cursor;
      runText = "";
    }
    runText += word.text;
    cursor += word.width;
  }
  show(runFont, runStart, runText);
}

function drawRect(ops, x, y, w, h, color) {
  ops.push(`${rgb(color)} rg ${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)} re f`);
}

function drawWatermark(ops) {
  const text = "SPECIMEN";
  const size = 76;
  const width = textWidth(text, "F2", size);
  const cx = PAGE.width / 2;
  const cy = PAGE.height / 2;
  const cos = Math.SQRT1_2;
  const x = cx - (width / 2) * cos - (size * 0.36) * -cos;
  const y = cy - (width / 2) * cos - (size * 0.36) * cos;
  ops.push("q");
  ops.push(`${rgb(COLOR.watermark)} rg`);
  ops.push(
    `BT /F2 ${size} Tf ${fmt(cos)} ${fmt(cos)} ${fmt(-cos)} ${fmt(cos)} ${fmt(x)} ${fmt(y)} Tm ${pdfString(text)} Tj ET`
  );
  ops.push("Q");
}

function drawFurniture(ops, meta, pageNumber, pageCount) {
  // Running header.
  const headerY = PAGE.height - 46;
  drawLine(
    ops,
    [{ text: meta.title, font: "F2", width: 0, space: false }],
    MARGIN.left,
    headerY,
    8.5,
    COLOR.navy600
  );
  const badge = "SPECIMEN – NOT A BINDING OFFER";
  const badgeWidth = textWidth(badge, "F2", 8.5);
  drawLine(
    ops,
    [{ text: badge, font: "F2", width: 0, space: false }],
    PAGE.width - MARGIN.right - badgeWidth,
    headerY,
    8.5,
    COLOR.brand700
  );
  drawRect(ops, MARGIN.left, headerY - 8, CONTENT_WIDTH, 0.6, COLOR.rule);

  // Footer.
  const footerY = 44;
  drawRect(ops, MARGIN.left, footerY + 12, CONTENT_WIDTH, 0.6, COLOR.rule);
  const left = `Version ${meta.version} · issued ${meta.issued} · example only – not an offer of employment`;
  drawLine(ops, [{ text: left, font: "F1", width: 0, space: false }], MARGIN.left, footerY, 8, COLOR.footer);
  const right = `Page ${pageNumber} of ${pageCount}`;
  const rightWidth = textWidth(right, "F1", 8);
  drawLine(
    ops,
    [{ text: right, font: "F1", width: 0, space: false }],
    PAGE.width - MARGIN.right - rightWidth,
    footerY,
    8,
    COLOR.footer
  );
}

function renderPage(pageItems, meta, pageNumber, pageCount) {
  const ops = [];
  drawWatermark(ops);
  drawFurniture(ops, meta, pageNumber, pageCount);

  for (const item of pageItems) {
    const { style, lines, indent, inset, top } = item;

    if (item.type === "note") {
      const boxHeight = lines.length * style.leading + NOTE_PAD.y * 2;
      drawRect(ops, MARGIN.left, top - boxHeight, CONTENT_WIDTH, boxHeight, COLOR.noteBg);
      drawRect(ops, MARGIN.left, top - boxHeight, NOTE_BAR_WIDTH, boxHeight, COLOR.noteBar);
    }

    let y = top - style.size - (item.type === "note" ? NOTE_PAD.y : 0) + (style.leading - style.size) / 2;

    lines.forEach((line, index) => {
      const x = MARGIN.left + indent + inset;
      if (item.type === "li" && index === 0 && !item.continued) {
        drawLine(
          ops,
          [{ text: "•", font: "F1", width: 0, space: false }],
          MARGIN.left + 4,
          y,
          style.size,
          COLOR.brand700
        );
      }
      drawLine(ops, line, x, y, style.size, style.color);
      y -= style.leading;
    });

    if (item.type === "h1") {
      drawRect(ops, MARGIN.left, top - item.height - 6, 54, 2.4, COLOR.brand700);
    }
  }

  return ops.join("\n");
}

/* -------------------------------------------------------------------------- */
/* PDF file assembly                                                           */
/* -------------------------------------------------------------------------- */

/** PDF date string; fixed to the document's issue date so builds are stable. */
function pdfDate(isoDay) {
  return `D:${isoDay.replace(/-/g, "")}000000Z`;
}

function buildPdf(contentStreams, meta) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length; // object numbers are 1-based
  };

  const pageCount = contentStreams.length;
  const catalogId = 1;
  const pagesId = 2;
  objects.push("", ""); // reserved slots for catalog + page tree

  const fontIds = {
    F1: add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),
    F2: add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"),
    F3: add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>"),
  };
  const resources =
    `<< /Font << /F1 ${fontIds.F1} 0 R /F2 ${fontIds.F2} 0 R /F3 ${fontIds.F3} 0 R >> >>`;

  const pageIds = [];
  for (const stream of contentStreams) {
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    pageIds.push(
      add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${fmt(PAGE.width)} ${fmt(PAGE.height)}] ` +
          `/Resources ${resources} /Contents ${contentId} 0 R >>`
      )
    );
  }

  objects[pagesId - 1] =
    `<< /Type /Pages /Count ${pageCount} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

  const infoId = add(
    `<< /Title ${pdfString(`${meta.title} (specimen, version ${meta.version})`)} ` +
      `/Author ${pdfString(meta.company)} ` +
      `/Subject ${pdfString("Specimen employment contract - example only, not an offer of employment")} ` +
      `/Keywords ${pdfString("specimen, sample contract, not binding, example")} ` +
      `/Creator ${pdfString("scripts/build-contract-pdf.mjs")} ` +
      `/CreationDate (${pdfDate(meta.issued)}) /ModDate (${pdfDate(meta.issued)}) >>`
  );

  let pdf = "%PDF-1.7\n%âãÏÓ\n";
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf +=
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

function main() {
  const meta = JSON.parse(readFileSync(META_PATH, "utf8"));
  meta.company = "NexaCare Support Solutions";

  const source = readFileSync(join(ROOT, meta.sourceFile), "utf8");
  const blocks = parseMarkdown(source);
  const items = measureBlocks(blocks);
  const pages = paginate(items);

  const streams = pages.map((page, index) => renderPage(page, meta, index + 1, pages.length));
  const pdf = buildPdf(streams, meta);

  const outPath = join(ROOT, "public", meta.downloadPath.replace(/^\//, ""));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, pdf);

  meta.generated = { pages: pages.length, bytes: pdf.length };
  delete meta.company;
  writeFileSync(META_PATH, `${JSON.stringify(meta, null, 2)}\n`);

  if (unknownChars.size > 0) {
    console.warn(
      `WARNING: unsupported character(s) replaced with "?": ${[...unknownChars]
        .map((c) => JSON.stringify(c))
        .join(", ")}\n` + "Add them to EXTRA_CHARS in this script, or use a plain ASCII equivalent."
    );
  }

  console.log(
    `Built ${meta.downloadPath} — ${pages.length} pages, ${(pdf.length / 1024).toFixed(1)} KB ` +
      `(version ${meta.version}, from ${meta.sourceFile})`
  );
}

main();
