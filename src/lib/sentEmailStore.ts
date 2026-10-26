import { promises as fs } from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomicWrite";
import { newId } from "@/lib/id";
import type { ComposeDesign } from "@/lib/composeOptions";

/**
 * SERVER-ONLY. Every email written and sent by hand from the Send email tab,
 * newest first — who it went to, what it said, who sent it and whether it
 * left. Failures are kept too, so a "did that go?" has an answer.
 *
 * Its own small file beside candidates.json, so sending a letter never
 * rewrites the file holding every application. Capped, oldest dropped first:
 * this is a record of recent correspondence, not an archive.
 */

const FILE = "sent-emails.json";
const MAX_KEPT = 1000;

const dir = () => process.env.DATA_DIR || path.join(process.cwd(), "data");
const file = () => path.join(dir(), FILE);

export interface SentEmail {
  id: string;
  at: string;
  /** The admin who sent it. */
  by: string;
  to: string;
  toName?: string;
  /** When the address was picked from the candidate list. */
  candidateId?: string;
  subject: string;
  /** The message as sent, after cleaning — the body only, without the design. */
  bodyHtml: string;
  design: ComposeDesign;
  status: "sent" | "failed";
  /** Why it did not leave, in the sender's words (e.g. warmup_limit). */
  error?: string;
}

/** What the history list shows — everything but the message itself. */
export type SentEmailSummary = Omit<SentEmail, "bodyHtml">;

async function readAll(): Promise<SentEmail[]> {
  try {
    const data = JSON.parse(await fs.readFile(file(), "utf8")) as unknown;
    return Array.isArray(data) ? (data as SentEmail[]) : [];
  } catch {
    return [];
  }
}

let writeChain: Promise<unknown> = Promise.resolve();

export function addSentEmail(entry: Omit<SentEmail, "id" | "at">): Promise<SentEmail> {
  const run = async () => {
    const list = await readAll();
    const saved: SentEmail = { id: newId(9), at: new Date().toISOString(), ...entry };
    await fs.mkdir(dir(), { recursive: true });
    await writeFileAtomic(file(), JSON.stringify([saved, ...list].slice(0, MAX_KEPT), null, 2));
    return saved;
  };
  const p = writeChain.then(run, run);
  writeChain = p.catch(() => {});
  return p;
}

export async function listSentEmails(limit = 50, offset = 0): Promise<{ items: SentEmailSummary[]; total: number }> {
  const list = await readAll();
  return {
    items: list.slice(offset, offset + limit).map(({ bodyHtml: _body, ...rest }) => rest),
    total: list.length,
  };
}

export async function getSentEmail(id: string): Promise<SentEmail | null> {
  return (await readAll()).find((e) => e.id === id) ?? null;
}

/** The newest one sent to this address with this subject, to catch a double click. */
export async function lastSentTo(to: string, subject: string): Promise<SentEmail | null> {
  const want = to.trim().toLowerCase();
  return (
    (await readAll()).find((e) => e.status === "sent" && e.to.toLowerCase() === want && e.subject === subject) ?? null
  );
}
