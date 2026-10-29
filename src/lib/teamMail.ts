/**
 * SERVER-ONLY. The built-in mailboxes of the team portal (name@workroute.team).
 *
 * Two parts, so a large email never slows the list down:
 *   team-mail.json      every message's summary — who, what, when, read or
 *                       not, its attachments — the index the lists are built from;
 *   team-mail/<id>.json one message's text and (cleaned) HTML.
 * Attachments are in storage (R2), never in either file.
 *
 * Mail to an address no member has is kept with no member (`memberId: null`)
 * for a recruiter to look at, rather than thrown away.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomicWrite";
import { newId } from "@/lib/id";
import { deleteObjects } from "@/lib/r2";

const dir = () => process.env.DATA_DIR || path.join(process.cwd(), "data");
const indexFile = () => path.join(dir(), "team-mail.json");
const bodyFile = (id: string) => path.join(dir(), "team-mail", `${id.replace(/[^A-Za-z0-9]/g, "")}.json`);

/** Oldest messages beyond this, per member and folder, are deleted. */
const MAX_PER_FOLDER = 3000;

export interface MailAddress {
  address: string;
  name?: string;
}

export interface MailAttachment {
  id: string;
  /** Where it is stored; absent when it was not kept (see `dropped`). */
  key?: string;
  name: string;
  type: string;
  size: number;
  /** For pictures shown inside the email ("cid:" links). */
  contentId?: string;
  /** Why it was not kept, e.g. "larger than 10 MB". */
  dropped?: string;
}

export interface MailMessage {
  id: string;
  memberId: string | null;
  folder: "inbox" | "sent";
  from: MailAddress;
  to: MailAddress[];
  cc: MailAddress[];
  subject: string;
  at: string;
  snippet: string;
  read: boolean;
  attachments: MailAttachment[];
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  /** The address it was actually delivered to. */
  envelopeTo?: string;
  hasHtml: boolean;
  /** Sent mail only. */
  status?: "sent" | "failed";
  error?: string;
}

export interface MailBody {
  text: string;
  html?: string;
}

async function readIndex(): Promise<MailMessage[]> {
  try {
    const data = JSON.parse(await fs.readFile(indexFile(), "utf8")) as unknown;
    return Array.isArray(data) ? (data as MailMessage[]) : [];
  } catch {
    return [];
  }
}

let chain: Promise<unknown> = Promise.resolve();
function withWrite<T>(fn: () => Promise<T>): Promise<T> {
  const p = chain.then(fn, fn);
  chain = p.catch(() => {});
  return p;
}

const newest = (a: MailMessage, b: MailMessage) => b.at.localeCompare(a.at);

export async function listMail(memberId: string | null, folder?: "inbox" | "sent"): Promise<MailMessage[]> {
  return (await readIndex())
    .filter((m) => m.memberId === memberId && (!folder || m.folder === folder))
    .sort(newest);
}

export async function getMail(id: string): Promise<MailMessage | null> {
  return (await readIndex()).find((m) => m.id === id) ?? null;
}

export async function getMailBody(id: string): Promise<MailBody> {
  try {
    return JSON.parse(await fs.readFile(bodyFile(id), "utf8")) as MailBody;
  } catch {
    return { text: "" };
  }
}

export async function unreadCount(memberId: string): Promise<number> {
  return (await readIndex()).filter((m) => m.memberId === memberId && m.folder === "inbox" && !m.read).length;
}

/** Sent today (UTC), for the daily sending limit. */
export async function sentToday(memberId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  return (await readIndex()).filter(
    (m) => m.memberId === memberId && m.folder === "sent" && m.status === "sent" && m.at.startsWith(today),
  ).length;
}

/** Has this message already been delivered to this inbox? (A mail server may retry.) */
export async function alreadyReceived(memberId: string | null, messageId: string | undefined): Promise<boolean> {
  if (!messageId) return false;
  return (await readIndex()).some((m) => m.folder === "inbox" && m.memberId === memberId && m.messageId === messageId);
}

export function newMailId(): string {
  return newId(12);
}

export function addMail(message: MailMessage, body: MailBody): Promise<MailMessage> {
  return withWrite(async () => {
    await writeFileAtomic(bodyFile(message.id), JSON.stringify(body));
    const all = await readIndex();
    all.push(message);
    // Keep each folder to its newest MAX_PER_FOLDER.
    const same = all.filter((m) => m.memberId === message.memberId && m.folder === message.folder).sort(newest);
    const drop = same.slice(MAX_PER_FOLDER);
    const dropIds = new Set(drop.map((m) => m.id));
    await writeFileAtomic(indexFile(), JSON.stringify(all.filter((m) => !dropIds.has(m.id))));
    for (const m of drop) await removeFiles(m);
    return message;
  });
}

async function removeFiles(m: MailMessage) {
  await fs.rm(bodyFile(m.id), { force: true }).catch(() => {});
  const keys = m.attachments.map((a) => a.key).filter((k): k is string => !!k);
  if (keys.length) await deleteObjects(keys).catch(() => {});
}

export function markRead(id: string, read = true): Promise<void> {
  return withWrite(async () => {
    const all = await readIndex();
    const m = all.find((x) => x.id === id);
    if (!m || m.read === read) return;
    m.read = read;
    await writeFileAtomic(indexFile(), JSON.stringify(all));
  });
}

export function deleteMail(id: string): Promise<boolean> {
  return withWrite(async () => {
    const all = await readIndex();
    const m = all.find((x) => x.id === id);
    if (!m) return false;
    await writeFileAtomic(indexFile(), JSON.stringify(all.filter((x) => x.id !== id)));
    await removeFiles(m);
    return true;
  });
}

/** Give a message that reached an unknown address to a member. */
export function assignMail(id: string, memberId: string): Promise<MailMessage | null> {
  return withWrite(async () => {
    const all = await readIndex();
    const m = all.find((x) => x.id === id);
    if (!m || m.memberId !== null) return null;
    m.memberId = memberId;
    m.read = false;
    await writeFileAtomic(indexFile(), JSON.stringify(all));
    return m;
  });
}

/** A short plain preview for the list. */
export function snippetOf(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 160);
}

export function formatAddress(a: MailAddress): string {
  return a.name ? `${a.name} <${a.address}>` : a.address;
}
