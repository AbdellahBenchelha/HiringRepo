/**
 * SERVER-ONLY. The Independent Contractor Agreement as a PDF, filled for one
 * candidate. See lib/agreement for where each detail comes from and
 * lib/agreementText for the wording.
 *
 * Drawn with pdf-lib's built-in Helvetica, so nothing is fetched and no font
 * files ship. That font covers Western European letters (é, ñ, ü…); anything
 * outside it is written without its accent, or as "?", rather than failing.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { siteConfig } from "@/config/site";
import { formatAgreementDate, type AgreementTerms } from "@/lib/agreement";
import {
  AGREEMENT_CLAUSES,
  AGREEMENT_VERSION,
  SIGNATURES_INTRO,
  SIGNATURES_TITLE,
} from "@/lib/agreementText";

const NAVY = rgb(0.06, 0.06, 0.21);
const BODY = rgb(0.15, 0.15, 0.3);
const MUTED = rgb(0.4, 0.4, 0.55);
const AMBER = rgb(0.6, 0.37, 0.04);
const LINE = rgb(0.85, 0.84, 0.78);
const TINT = rgb(0.98, 0.976, 0.96);

const W = 595.28;
const H = 841.89;
const LEFT = 56;
const RIGHT = W - 56;
const TOP = H - 60;
const BOTTOM = 70;

// Characters Helvetica (WinAnsi) can draw beyond plain ASCII and Latin-1.
const EXTRA = new Set(["‘", "’", "“", "”", "–", "—", "…", "•", "€"]);

/** Keep what the font can draw; strip an accent it cannot; "?" for the rest. */
function safe(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFC")) {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || EXTRA.has(ch)) {
      out += ch;
      continue;
    }
    if (ch === "−") {
      out += "-";
      continue;
    }
    const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    out += /^[\x20-\x7e\xa0-\xff]+$/.test(base) ? base : "?";
  }
  return out;
}

class Writer {
  page!: PDFPage;
  y = TOP;
  pages: PDFPage[] = [];
  constructor(
    private doc: PDFDocument,
    readonly font: PDFFont,
    readonly bold: PDFFont,
    readonly italic: PDFFont,
  ) {
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage([W, H]);
    this.pages.push(this.page);
    this.y = TOP;
  }
  /** Make room for `space` points, starting a new page if needed. */
  ensure(space: number) {
    if (this.y - space < BOTTOM) this.newPage();
  }
  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const words = safe(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  /** A wrapped paragraph at `x`, `width` wide. */
  para(text: string, opts: { x?: number; width?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number } = {}) {
    const size = opts.size ?? 9.5;
    const font = opts.font ?? this.font;
    const x = opts.x ?? LEFT;
    const lead = size * 1.42;
    for (const line of this.wrap(text, font, size, opts.width ?? RIGHT - x)) {
      this.ensure(lead);
      this.page.drawText(line, { x, y: this.y, size, font, color: opts.color ?? BODY });
      this.y -= lead;
    }
    this.y -= opts.gap ?? 5;
  }
  text(s: string, x: number, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {}) {
    this.page.drawText(safe(s), { x, y: this.y, size: opts.size ?? 9.5, font: opts.font ?? this.font, color: opts.color ?? NAVY });
  }
  heading(s: string) {
    this.ensure(40);
    this.y -= 6;
    this.text(s, LEFT, { size: 11.5, font: this.bold, color: NAVY });
    this.y -= 17;
  }
  rule(y = this.y) {
    this.page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 0.6, color: LINE });
  }
}

export interface AgreementPdfInput {
  terms: AgreementTerms;
  /** Printed on every page. */
  ref: string;
  /** ISO time the agreement is issued; the Company's signing date. */
  issuedAt: string;
}

export async function agreementPdf({ terms, ref, issuedAt }: AgreementPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const legal = siteConfig.legal;
  doc.setTitle(safe(`Independent Contractor Agreement — ${terms.contractorName}`));
  doc.setAuthor(legal.registeredName);
  doc.setSubject(`Agreement ${ref}`);
  doc.setCreator(siteConfig.company.name);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const w = new Writer(doc, font, bold, italic);
  const issued = formatAgreementDate(issuedAt);

  // Title
  w.text(`${siteConfig.company.name.toUpperCase()} · ${siteConfig.company.descriptor.toUpperCase()}`, LEFT, {
    size: 8,
    font: bold,
    color: AMBER,
  });
  w.y -= 26;
  w.text("Independent Contractor Agreement", LEFT, { size: 21, font: bold });
  w.y -= 18;
  w.text(`Reference ${ref}  ·  Issued ${issued}`, LEFT, { size: 9, color: MUTED });
  w.y -= 14;
  w.rule(w.y + 4);
  w.y -= 14;

  // Parties
  w.heading("Parties");
  w.para(
    `(1) The Company. ${legal.registeredName}, a company registered in ${legal.registeredIn} under company number ${legal.registrationNumber}, whose registered office is at ${legal.registeredAddress}, trading as ${legal.tradingName} (“the Company”, “we”, “us”).`,
  );
  w.para(`(2) The Contractor. ${terms.contractorParty} (“the Contractor”, “you”).`);
  w.para(`This agreement begins on ${terms.startDate} and continues until ended under clause 13.`, { gap: 10 });

  // Schedule
  w.heading("Schedule of key terms");
  const rows: [string, string][] = [
    ["Services", terms.services],
    ["Fee", terms.fee],
    ["Guaranteed hours", terms.guaranteedHours],
    ["Availability window", terms.window],
    ["Working days", terms.days],
    ["Maximum work", "5 hours per day, 25 hours per week"],
    ["Invoicing", "Monthly in arrears"],
    ["Payment", terms.payment],
    ["Notice", terms.notice],
    ["Governing law", terms.governingLaw],
  ];
  const labelW = 130;
  const valueX = LEFT + labelW + 10;
  for (const [label, value] of rows) {
    const lines = w.wrap(value, font, 9.5, RIGHT - valueX - 8);
    const h = lines.length * 13.5 + 9;
    w.ensure(h);
    const top = w.y + 12;
    w.page.drawRectangle({ x: LEFT, y: top - h, width: RIGHT - LEFT, height: h, color: TINT, borderColor: LINE, borderWidth: 0.5 });
    w.text(label, LEFT + 8, { size: 9.5, font: bold });
    for (const line of lines) {
      w.page.drawText(line, { x: valueX, y: w.y, size: 9.5, font, color: BODY });
      w.y -= 13.5;
    }
    w.y = top - h - 12;
  }
  w.y -= 8;

  // Clauses
  for (const clause of AGREEMENT_CLAUSES) {
    w.heading(clause.title);
    for (const block of clause.blocks) {
      if (typeof block === "string") {
        w.para(block);
        continue;
      }
      block.list.forEach((item, i) => {
        w.ensure(14);
        w.text(`${i + 1}.`, LEFT + 6, { size: 9.5, color: BODY });
        w.para(item, { x: LEFT + 22, gap: 3 });
      });
      w.y -= 4;
    }
  }

  // Signatures
  w.ensure(260);
  w.heading(SIGNATURES_TITLE);
  w.para(SIGNATURES_INTRO, { gap: 12 });
  const boxW = (RIGHT - LEFT - 16) / 2;
  const boxH = 175;
  const boxTop = w.y + 4;
  const box = (x: number, title: string, lines: { label: string; value?: string; sign?: boolean; tall?: boolean }[]) => {
    w.page.drawRectangle({ x, y: boxTop - boxH, width: boxW, height: boxH, borderColor: LINE, borderWidth: 0.8 });
    let y = boxTop - 20;
    w.page.drawText(safe(title), { x: x + 12, y, size: 9.5, font: bold, color: NAVY });
    y -= 26;
    for (const l of lines) {
      w.page.drawText(safe(l.label), { x: x + 12, y, size: 8, font: bold, color: MUTED });
      // Room to write a signature by hand.
      y -= l.tall ? 40 : 15;
      if (l.value) {
        w.page.drawText(safe(l.value), { x: x + 12, y, size: l.sign ? 13 : 9.5, font: l.sign ? italic : font, color: NAVY });
      }
      w.page.drawLine({ start: { x: x + 12, y: y - 4 }, end: { x: x + boxW - 12, y: y - 4 }, thickness: 0.5, color: LINE });
      y -= 20;
    }
  };
  box(LEFT, `For and on behalf of ${legal.registeredName}`, [
    { label: "Name", value: `${terms.signatoryName}, ${terms.signatoryTitle}` },
    { label: "Signature", value: terms.signatoryName, sign: true, tall: true },
    { label: "Date", value: issued },
  ]);
  box(LEFT + boxW + 16, terms.companyName ? `The Contractor (${terms.companyName})` : "The Contractor", [
    { label: "Name", value: terms.contractorName },
    { label: "Signature", tall: true },
    { label: "Date" },
  ]);
  w.y = boxTop - boxH - 20;
  w.para(
    `Please sign and date where it says “The Contractor”, then send every page back to us. Questions? Write to ${siteConfig.contact.recruitmentEmail}.`,
    { size: 8.5, color: MUTED },
  );

  // Footer on every page
  const total = w.pages.length;
  w.pages.forEach((page, i) => {
    page.drawLine({ start: { x: LEFT, y: 46 }, end: { x: RIGHT, y: 46 }, thickness: 0.5, color: LINE });
    page.drawText(safe(`Independent Contractor Agreement · ${terms.contractorName} · Ref ${ref} · v${AGREEMENT_VERSION}`), {
      x: LEFT,
      y: 34,
      size: 7.5,
      font,
      color: MUTED,
    });
    const label = `Page ${i + 1} of ${total}`;
    page.drawText(label, { x: RIGHT - font.widthOfTextAtSize(label, 7.5), y: 34, size: 7.5, font, color: MUTED });
  });

  return doc.save();
}
