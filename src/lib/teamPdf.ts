/**
 * SERVER-ONLY. The PDFs a member can download from the portal: a monthly
 * statement of hours and pay, and a summary of the offer they accepted.
 *
 * Drawn with pdf-lib's built-in Helvetica, so nothing is fetched and no font
 * files ship. That font covers Western European letters only; anything else
 * (a name in Devanagari, say) is written without its accents or as "?" rather
 * than failing the download.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { siteConfig } from "@/config/site";
import { entryAmount, totals } from "@/lib/teamHours";
import {
  WORK_STATUS_LABEL,
  formatDay,
  formatHours,
  formatMonth,
  formatUsd,
} from "@/lib/teamShared";
import type { MemberWork, TeamMember } from "@/lib/teamStore";
import { formatAvailability } from "@/lib/availability";
import { formatRate, type Offer } from "@/lib/offer";

const NAVY = rgb(0.06, 0.06, 0.21);
const MUTED = rgb(0.31, 0.31, 0.5);
const LINE = rgb(0.92, 0.91, 0.86);

/** What Helvetica (WinAnsi) can draw. */
function safe(s: string): string {
  return s
    .replace(/−/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e -ÿ•–—…€]/g, "?");
}

class Writer {
  page: PDFPage;
  y = 0;
  constructor(
    private doc: PDFDocument,
    private font: PDFFont,
    private bold: PDFFont,
  ) {
    this.page = this.newPage();
  }
  newPage(): PDFPage {
    this.page = this.doc.addPage([595.28, 841.89]);
    this.y = 800;
    return this.page;
  }
  ensure(space: number) {
    if (this.y - space < 50) this.newPage();
  }
  text(s: string, x: number, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; right?: boolean } = {}) {
    const size = opts.size ?? 10;
    const f = opts.bold ? this.bold : this.font;
    const str = safe(s);
    const w = f.widthOfTextAtSize(str, size);
    this.page.drawText(str, { x: opts.right ? x - w : x, y: this.y, size, font: f, color: opts.color ?? NAVY });
  }
  line() {
    this.page.drawLine({ start: { x: 50, y: this.y + 4 }, end: { x: 545, y: this.y + 4 }, thickness: 0.7, color: LINE });
  }
  gap(n: number) {
    this.y -= n;
  }
}

async function start(title: string, m: TeamMember, subtitle: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(safe(`${title} — ${m.fullName}`));
  doc.setAuthor(siteConfig.company.name);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold);
  w.text(siteConfig.company.name, 50, { size: 18, bold: true });
  w.gap(16);
  w.text("TEAM PORTAL", 50, { size: 8, bold: true, color: rgb(0.69, 0.43, 0.05) });
  w.gap(34);
  w.text(title, 50, { size: 16, bold: true });
  w.gap(18);
  w.text(subtitle, 50, { size: 10, color: MUTED });
  w.gap(26);
  w.text(m.fullName, 50, { size: 11, bold: true });
  w.gap(14);
  w.text(m.loginEmail, 50, { size: 10, color: MUTED });
  if (m.workEmail) {
    w.gap(13);
    w.text(m.workEmail, 50, { size: 10, color: MUTED });
  }
  w.gap(28);
  return { doc, w };
}

function footer(w: Writer) {
  w.ensure(40);
  w.gap(24);
  w.text(`Generated ${new Date().toISOString().slice(0, 10)} · ${siteConfig.company.name} · All amounts in US dollars`, 50, {
    size: 8,
    color: MUTED,
  });
}

export async function statementPdf(m: TeamMember, month: string, work: MemberWork): Promise<Uint8Array> {
  const inMonth = <T extends { date: string }>(xs: T[]) =>
    xs.filter((x) => x.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
  const entries = inMonth(work.entries);
  const adjustments = inMonth(work.adjustments);
  const payments = inMonth(work.payments);
  const t = totals(entries, adjustments, payments);
  const upTo = <T extends { date: string }>(xs: T[]) => xs.filter((x) => x.date.slice(0, 7) <= month);
  const balance = totals(upTo(work.entries), upTo(work.adjustments), upTo(work.payments)).balance;

  const { doc, w } = await start("Monthly statement", m, formatMonth(month));

  const cols = { date: 50, status: 175, hours: 345, rate: 430, amount: 545 };
  w.text("Date", cols.date, { bold: true, size: 9 });
  w.text("Status", cols.status, { bold: true, size: 9 });
  w.text("Hours", cols.hours, { bold: true, size: 9, right: true });
  w.text("Rate", cols.rate, { bold: true, size: 9, right: true });
  w.text("Amount", cols.amount, { bold: true, size: 9, right: true });
  w.gap(8);
  w.line();
  w.gap(12);
  if (!entries.length) {
    w.text("No work days this month.", cols.date, { color: MUTED });
    w.gap(16);
  }
  for (const e of entries) {
    w.ensure(16);
    w.text(formatDay(e.date), cols.date);
    w.text(WORK_STATUS_LABEL[e.status] + (e.note ? ` — ${e.note.slice(0, 30)}` : ""), cols.status, { color: MUTED });
    w.text(formatHours(e.hours), cols.hours, { right: true });
    w.text(formatUsd(e.rate), cols.rate, { right: true });
    w.text(formatUsd(entryAmount(e)), cols.amount, { right: true });
    w.gap(15);
  }

  const section = (title: string, rows: [string, string, string][]) => {
    if (!rows.length) return;
    w.ensure(40);
    w.gap(12);
    w.text(title, 50, { bold: true, size: 11 });
    w.gap(8);
    w.line();
    w.gap(12);
    for (const [a, b, c] of rows) {
      w.ensure(16);
      w.text(a, cols.date);
      w.text(b, cols.status, { color: MUTED });
      w.text(c, cols.amount, { right: true });
      w.gap(15);
    }
  };
  section(
    "Bonuses and deductions",
    adjustments.map((a) => [formatDay(a.date), a.reason, formatUsd(a.amount)]),
  );
  section(
    "Payments",
    payments.map((p) => [formatDay(p.date), [p.sentTo, p.reference].filter(Boolean).join(" · ") || "Payment", formatUsd(p.amount)]),
  );

  w.ensure(110);
  w.gap(16);
  w.line();
  w.gap(14);
  const sum = (label: string, value: string, strong = false) => {
    w.text(label, 300, { bold: strong });
    w.text(value, cols.amount, { right: true, bold: strong });
    w.gap(16);
  };
  sum("Hours worked", formatHours(t.hours));
  sum("Earned from hours", formatUsd(t.earned));
  sum("Bonuses and deductions", formatUsd(t.adjustments));
  sum("Paid this month", formatUsd(t.paid));
  sum(`Balance at the end of ${formatMonth(month)}`, formatUsd(balance), true);

  footer(w);
  return doc.save();
}

export async function offerSummaryPdf(m: TeamMember, offer: Offer | undefined, acceptedAt?: string): Promise<Uint8Array> {
  const { doc, w } = await start(
    "Offer summary",
    m,
    acceptedAt ? `Accepted on ${formatDay(acceptedAt.slice(0, 10))}` : "Terms on file",
  );
  const row = (label: string, value: string) => {
    w.ensure(18);
    w.text(label, 50, { color: MUTED });
    w.text(value, 220);
    w.gap(18);
  };
  if (offer) {
    row("Position", offer.position);
    row("Agreed rate", formatRate(offer));
    if (offer.hoursPerWeek) row("Hours per week", `${offer.hoursPerWeek}`);
    if (offer.startDate) row("Start date", formatDay(offer.startDate));
    row("Engagement", offer.engagement);
    if (offer.probation) row("Probation", offer.probation);
    if (offer.note) row("Note", offer.note.slice(0, 80));
  } else if (m.position) {
    row("Position", m.position);
  }
  w.gap(10);
  row("Rate in the portal", `${formatUsd(m.rates.at(-1)?.rate ?? 0)} per hour`);
  row("Hours per work day", formatHours(m.hoursPerDay));
  row("Schedule", formatAvailability(m.schedule));
  row("First work day", formatDay(m.firstWorkDay));
  w.gap(10);
  w.text("This is a summary for your records. The signed agreement is the document that applies.", 50, {
    size: 9,
    color: MUTED,
  });
  footer(w);
  return doc.save();
}
