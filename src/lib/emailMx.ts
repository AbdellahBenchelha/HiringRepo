/**
 * SERVER-ONLY: can this domain receive email at all?
 *
 * A typo in the domain ("gmail.con") or an invented one bounces every message
 * sent to it. DNS answers the question before anything is sent: a domain with
 * mail servers (MX records) receives mail, and so does one with only an address
 * record, which is where mail falls back to.
 *
 * Built to fail open. Only a definite "this domain does not exist" or "this
 * domain accepts no mail" blocks anybody; a slow or failing lookup lets them
 * through, because a real candidate turned away by our DNS trouble is worse
 * than one bounced email.
 */
import { promises as dns } from "node:dns";
import { emailAddressProblem, emailDomain, isExampleDomain, type EmailProblem } from "@/lib/emailCheck";

const LOOKUP_TIMEOUT_MS = 3000;
const CACHE_MS = 60 * 60 * 1000;
const CACHE_MAX = 2000;

const cache = new Map<string, { at: number; receives: boolean | null }>();

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), LOOKUP_TIMEOUT_MS)),
  ]);
}

/** Codes that mean "the domain has no such record", not "the lookup failed". */
const NO_RECORD = new Set(["ENOTFOUND", "ENODATA"]);

async function lookup(domain: string): Promise<boolean | null> {
  try {
    const mx = await withTimeout(dns.resolveMx(domain));
    // A "null MX" (RFC 7505) — one record with an empty host — is a domain
    // saying in so many words that it accepts no mail. example.com has one.
    const real = mx.filter((r) => r.exchange && r.exchange !== ".");
    if (real.length) return true;
    if (mx.length) return false;
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (code === "ENOTFOUND") return false;
    if (!NO_RECORD.has(code)) return null;
  }
  // No MX records: mail goes to the domain's own address, if it has one.
  try {
    const a = await withTimeout(dns.resolve4(domain));
    if (a.length) return true;
  } catch (e) {
    if (!NO_RECORD.has((e as { code?: string }).code ?? "")) return null;
  }
  try {
    const aaaa = await withTimeout(dns.resolve6(domain));
    return aaaa.length > 0;
  } catch (e) {
    return NO_RECORD.has((e as { code?: string }).code ?? "") ? false : null;
  }
}

/** true: receives mail. false: definitely does not. null: could not tell. */
export async function domainReceivesMail(domain: string): Promise<boolean | null> {
  const key = domain.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.receives;
  const receives = await lookup(key);
  // An unknown answer is not cached: the next person should get a fresh try.
  if (receives !== null) {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), receives });
  }
  return receives;
}

/** Test environment only — see emailAddressProblem. */
export function allowExampleEmails(): boolean {
  return process.env.EMAIL_ALLOW_EXAMPLE_DOMAINS === "1";
}

/**
 * The full check on an applicant's email: the lists first, then DNS.
 * Returns null when the address may be used.
 */
export async function applicantEmailProblem(email: string): Promise<EmailProblem | null> {
  const allowExample = allowExampleEmails();
  const listed = emailAddressProblem(email, { allowExample });
  if (listed) return listed;
  if (allowExample && isExampleDomain(email)) return null;
  const domain = emailDomain(email);
  if (!domain) return null;
  return (await domainReceivesMail(domain)) === false ? "no_mail" : null;
}
