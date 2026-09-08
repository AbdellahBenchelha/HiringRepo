/**
 * SERVER-ONLY lightweight persistence for candidates and interview results.
 *
 * The project has no database, so candidates are stored in a single JSON file
 * (data/candidates.json, git-ignored — it contains personal data). Writes are
 * serialized through an in-process queue to avoid corruption under light load.
 *
 * Set DATA_DIR to relocate the file (e.g. a persistent disk on your host).
 * Note: on ephemeral/serverless filesystems this file does not persist between
 * deployments — use a host with a persistent disk for production.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomicWrite";
import {
  CANDIDATE_STATUSES,
  VOICE_STATUSES,
  type CandidateStatus,
  type VoiceStatus,
} from "@/lib/candidateStatus";
import { normaliseEmail, normalisePhone } from "@/lib/identity";
import { isCandidateOpen, type OpenSource } from "@/lib/followUp";
import {
  currentDocument,
  keepsHistory,
  type CandidateDocument,
  type DocumentKind,
} from "@/lib/documents";
import { needsBack, type IdDocumentType } from "@/lib/identityDocuments";
import { isVerificationKind } from "@/lib/verification";

export { CANDIDATE_STATUSES, VOICE_STATUSES };
export type { CandidateStatus, VoiceStatus };
import { effectiveOffer, type Offer } from "@/lib/offer";
import type { Availability } from "@/lib/availability";
import type { ConfirmedDetails } from "@/lib/hiring";
import type { CompanyCheck } from "@/lib/companyCheck";

export interface LanguageRow {
  language: string;
  speaking: string;
  writing: string;
  reading: string;
}

export interface InterviewResult {
  completedAt: string;
  score: number;
  total: number;
  answers: Record<string, string>;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dob: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  linkedin: string;
  languages: LanguageRow[];
  position: string;
  /** Full raw application snapshot for the profile view. */
  application: Record<string, unknown>;
  status: CandidateStatus;
  createdAt: string;
  submittedAt?: string;
  invitationSentAt?: string;
  interview?: InterviewResult;
  // Post-interview follow-up (Interviews section). The congratulations and
  // the voice-assessment request are now one email, sent when this is set.
  voiceRequestedAt?: string;
  voiceStatus?: VoiceStatus;
  /**
   * The written offer, exactly as sent. Stored rather than rebuilt from the
   * job listing: a listing's advertised pay changes, and what we offered one
   * person on one day must not change with it.
   */
  offer?: Offer;
  offerSentAt?: string;
  offerAcceptedAt?: string;
  offerDeclinedAt?: string;
  offerDeclineReason?: string;
  /**
   * What the candidate re-confirmed when they accepted.
   *
   * Kept beside the application rather than written over it. The application
   * is what someone typed to get past a form; this is what they stated when
   * it was about to become a contract, and the difference between the two is
   * worth seeing.
   */
  confirmedDetails?: ConfirmedDetails;
  confirmedDetailsAt?: string;
  /**
   * The eight-hour window and five days the candidate chose when accepting.
   *
   * Their choice, not ours, and stored with the timezone they picked it in —
   * "08:00" from Casablanca and "08:00" from Lagos are an hour apart, and the
   * schedule is the thing an agreement is built on.
   */
  availability?: Availability;
  /**
   * Result of looking this candidate up in the UK register of company
   * officers. Cached because it is a paid-for-with-requests lookup and a
   * recruiter re-opening a profile should not trigger another one — and
   * timestamped because companies are incorporated and dissolved, so an old
   * answer must not read as a current one.
   */
  companyCheck?: CompanyCheck;
  /** Set once the assessment invitation email has gone out, so a resubmit
   *  or a retried request cannot send the candidate a second copy. */
  interviewEmailSentAt?: string;
  /**
   * Set when this application's phone number matches an earlier candidate.
   * A flagged application is stored and notified as normal, but the assessment
   * email is withheld until a recruiter releases it from the Admin Panel.
   */
  duplicateFlag?: boolean;
  /** Id of the earlier candidate whose phone matched. */
  duplicateOfId?: string;
  /** Name of that candidate, kept so the Admin Panel needs no second lookup. */
  duplicateOfName?: string;
  /** Free-text recruiter notes — call outcomes, availability, anything. */
  notes?: string;
  notesUpdatedAt?: string;
  /**
   * First time the candidate actually opened their assessment page.
   *
   * Recorded from the browser, not the server render: pasting a link into
   * WhatsApp makes it fetch the URL to build a preview, which would otherwise
   * mark the assessment opened before the candidate ever saw it. Written once
   * — every write rewrites the whole file, so refreshes must not cost anything.
   */
  interviewOpenedAt?: string;
  /**
   * Most recent open, how many there have been, and which link brought them.
   *
   * interviewOpenedAt alone cannot tell you whether a reminder worked — it is
   * frozen at the first visit, which is usually before you ever chased them.
   */
  lastOpenedAt?: string;
  openCount?: number;
  lastOpenSource?: OpenSource;
  /**
   * Uploaded CV, cover letter and certificate.
   *
   * Only metadata lives here — the files themselves are in R2. A blocked
   * document keeps its entry with no key, so the recruiter can see that
   * something was sent and what happened to it.
   */
  documents?: CandidateDocument[];
  /**
   * Identity verification. The images live in R2 like any other document; these
   * record the decision about them, which outlives the files themselves so a
   * recruiter can clear the photographs without losing the outcome.
   */
  verificationConsentAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  imagesDeletedAt?: string;
  /** Set when a recruiter asks someone whose country is not on the list. */
  verificationRequestedAt?: string;
  /**
   * Which of the three documents they chose to send.
   *
   * Absent on every record made before the picker existed. That absence is
   * meaningful and must not be filled in with a guess — it says "front and
   * selfie, document unknown", which is exactly what those records hold.
   */
  identityDocumentType?: IdDocumentType;
  /**
   * When a recruiter last asked for the photographs to be taken again, and the
   * reason the candidate is shown. Kept as a timestamp rather than a flag so
   * it can be compared against the newest photograph on file — that comparison
   * is what stops the request outliving the answer to it.
   */
  identityReuploadRequestedAt?: string;
  identityReuploadReason?: string;
  /**
   * The live identity check: a link created for this one candidate in Persona,
   * emailed to them by hand when photographs could not settle the question.
   *
   * Sent, opened and started are kept apart because they are three different
   * problems: an email that never arrived, a person hesitating over it, and a
   * check already half-finished in the provider's dashboard.
   */
  liveVerificationUrl?: string;
  liveVerificationSentAt?: string;
  liveVerificationCount?: number;
  liveVerificationOpenedAt?: string;
  liveVerificationLastOpenedAt?: string;
  liveVerificationOpenCount?: number;
  liveVerificationStartedAt?: string;
  /**
   * Whether the candidate has actually opened the voice-assessment page, and
   * how often.
   *
   * Separate from interviewOpenedAt even though both live at /interview: the
   * assessment open happened weeks earlier and says nothing about whether they
   * have seen the recording step. Without this, "no recording yet" covers two
   * different people — one who read the email and is putting it off, and one
   * for whom the email never arrived — and only the second is worth chasing
   * on another channel.
   *
   * Recorded from the browser, never from the server render: pasting the link
   * into WhatsApp makes it fetch the URL for a preview, and a preview bot must
   * not count as a candidate.
   */
  voiceOpenedAt?: string;
  voiceLastOpenedAt?: string;
  voiceOpenCount?: number;
  /** Reminders chasing an outstanding recording. Email only, by design. */
  voiceReminderSentAt?: string;
  voiceReminderCount?: number;
  /**
   * Reminders chasing identity documents from someone who has accepted.
   *
   * Their own counters rather than the voice ones: these are weeks apart and
   * about different things, and "chased 3 times" is useless to whoever is
   * deciding whether to chase a fourth unless it says about what.
   */
  identityReminderSentAt?: string;
  identityReminderCount?: number;
  /**
   * The country the application was actually sent from, as the server saw it.
   *
   * Deliberately not the IP address: a raw address is personal data with real
   * weight, and a two-letter code carries the whole signal at a fraction of the
   * exposure. There is no stored "mismatch" flag either — it is derived when
   * read, so it cannot go stale if the candidate's stated country changes.
   */
  detectedCountryIso?: string;
  /** The same country as a name from the app's list, so it compares to `country`. */
  detectedCountryName?: string;
  detectedCountryAt?: string;
  /** Reminder chasing an unfinished assessment, per channel. */
  reminderEmailSentAt?: string;
  reminderEmailCount?: number;
  reminderWhatsAppSentAt?: string;
  reminderWhatsAppCount?: number;
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "candidates.json");

async function readAll(): Promise<Candidate[]> {
  let raw: string;
  try {
    raw = await fs.readFile(FILE, "utf8");
  } catch {
    // No file yet. That is genuinely nobody, on a fresh install.
    return [];
  }

  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as Candidate[]) : [];
  } catch {
    /**
     * A file that exists but will not parse is damage, not emptiness, and the
     * two must not look the same. Returning [] here would show an empty
     * candidate list — and if the caller were a write, it would then save that
     * emptiness over the top of everyone. Better a visible failure.
     */
    throw new Error(`${FILE} exists but could not be parsed as JSON`);
  }
}

// Serialize writes so concurrent requests don't clobber the file.
let writeChain: Promise<unknown> = Promise.resolve();

function withWrite<T>(fn: (list: Candidate[]) => { list: Candidate[]; result: T }): Promise<T> {
  const run = async (): Promise<T> => {
    const list = await readAll();
    const { list: next, result } = fn(list);
    // Atomic: readers never see a half-written file. Writes are serialized
    // against each other by the chain below, but reads are not serialized
    // against writes at all — and a plain truncate-then-fill let a concurrent
    // read parse nothing and conclude there were no candidates.
    await writeFileAtomic(FILE, JSON.stringify(next, null, 2));
    return result;
  };
  const p = writeChain.then(run, run);
  writeChain = p.catch(() => {});
  return p;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function listCandidates(): Promise<Candidate[]> {
  const list = await readAll();
  return list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const list = await readAll();
  return list.find((c) => c.id === id) ?? null;
}

export interface DuplicateCheck {
  /** An earlier candidate already used this email address. */
  emailTaken: boolean;
  /** An earlier candidate already used this phone number. */
  phoneMatch: { id: string; name: string; createdAt: string } | null;
  /**
   * Id of this person's own unfinished attempt, if they have one. The form
   * adopts it so a restart updates that record rather than leaving a second
   * one behind.
   */
  resumeId: string | null;
}

/**
 * Look for an earlier application from the same person.
 *
 * `selfId` is the id of the application being filled in right now, so a
 * candidate revisiting their own Personal Information step does not match
 * themselves.
 */
export async function findDuplicates(
  email: string,
  phone: string,
  selfId: string,
): Promise<DuplicateCheck> {
  const list = await readAll();
  const wantEmail = normaliseEmail(email);
  const wantPhone = normalisePhone(phone);

  const others = list.filter((c) => c.id !== selfId);

  /**
   * What counts as having applied.
   *
   * A record is created at step one so the recruiter gets the notification and
   * the interview link straight away, but reaching step one is an attempt, not
   * an application. Counting it meant someone who filled in their details and
   * closed the tab was permanently locked out by their own abandoned record —
   * and told to contact us about an application they never made.
   *
   * Three things do count, because each means the person is already moving
   * through the process rather than starting out:
   *   submittedAt        — they finished the form.
   *   interview          — they finished the assessment.
   *   interviewOpenedAt  — they opened their assessment link. The recruiter has
   *                        already sent it and is waiting on them, so a second
   *                        application would fork the same person into two
   *                        records at the point where that is most confusing.
   */
  const applied = others.filter((c) => c.submittedAt || c.interview || c.interviewOpenedAt);

  const emailTaken = wantEmail
    ? applied.some((c) => normaliseEmail(c.email) === wantEmail)
    : false;

  let phoneMatch: DuplicateCheck["phoneMatch"] = null;
  if (wantPhone) {
    // Oldest first, so the flag names the original application.
    const hit = [...applied]
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
      .find((c) => normalisePhone(c.phone) === wantPhone);
    if (hit) phoneMatch = { id: hit.id, name: hit.fullName || "Unknown", createdAt: hit.createdAt };
  }

  // An unfinished attempt from the same person, so the form can carry on with
  // that record instead of leaving a second one behind. Matched on email only:
  // a phone is shared by families and offices, and merging two people because
  // they use one handset is far worse than keeping a duplicate.
  let resumeId: string | null = null;
  if (wantEmail) {
    const open = others
      .filter(
        (c) =>
          !c.submittedAt &&
          !c.interview &&
          !c.interviewOpenedAt &&
          normaliseEmail(c.email) === wantEmail,
      )
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    if (open[0]) resumeId = open[0].id;
  }

  return { emailTaken, phoneMatch, resumeId };
}

/**
 * Record that the candidate opened their assessment, the first time only.
 *
 * Repeat opens are recorded too, because "did they come back after we chased
 * them" is the question the follow-up column answers, and the first open alone
 * cannot answer it. They are throttled to one write per REOPEN_THROTTLE_MS,
 * though: every write rewrites the whole file, so a refresh must stay free.
 *
 * Returns false when nothing was written.
 */
const REOPEN_THROTTLE_MS = 10 * 60 * 1000;

export function recordInterviewOpened(id: string, source?: OpenSource): Promise<boolean> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: false };
    // A recruiter checking the link is not the candidate opening it.
    if (!isCandidateOpen(source)) return { list, result: false };

    const now = Date.now();
    const last = c.lastOpenedAt ?? c.interviewOpenedAt;
    const recent = last && now - new Date(last).getTime() < REOPEN_THROTTLE_MS;
    // A refresh within the window is free unless it came in through a link we
    // have not credited yet — the attribution is the point.
    if (recent && (!source || source === c.lastOpenSource)) return { list, result: false };

    const iso = new Date(now).toISOString();
    if (!c.interviewOpenedAt) c.interviewOpenedAt = iso;
    c.lastOpenedAt = iso;
    c.openCount = (c.openCount ?? 0) + 1;
    if (source) c.lastOpenSource = source;
    return { list, result: true };
  });
}

/**
 * Record that the candidate opened their voice-assessment page.
 *
 * Same shape and the same throttle as the assessment open, for the same
 * reasons: repeat opens answer "did they come back after we chased them", and
 * every write rewrites the whole file so a refresh has to stay free.
 */
export function recordVoiceOpened(id: string, source?: OpenSource): Promise<boolean> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: false };
    // A recruiter checking the link is not the candidate opening it.
    if (!isCandidateOpen(source)) return { list, result: false };

    const now = Date.now();
    const last = c.voiceLastOpenedAt ?? c.voiceOpenedAt;
    if (last && now - new Date(last).getTime() < REOPEN_THROTTLE_MS) {
      return { list, result: false };
    }

    const iso = new Date(now).toISOString();
    if (!c.voiceOpenedAt) c.voiceOpenedAt = iso;
    c.voiceLastOpenedAt = iso;
    c.voiceOpenCount = (c.voiceOpenCount ?? 0) + 1;
    return { list, result: true };
  });
}

/**
 * Log a reminder sent about identity documents an accepted candidate owes.
 *
 * Counted only once the message is away — a count that includes failures reads
 * as "chased twice, no response" about somebody who was never reached.
 */
export function recordIdentityReminder(id: string): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    c.identityReminderSentAt = new Date().toISOString();
    c.identityReminderCount = (c.identityReminderCount ?? 0) + 1;
    return { list, result: c };
  });
}

/**
 * Record that a live identity check was emailed to a candidate.
 *
 * The link is stored with it. It is the only copy: the recruiter created it in
 * Persona for this one person, and without it here a second attempt means
 * going back to the provider's dashboard to find which inquiry belonged to
 * whom. Sending again replaces the link, because the newest one is the one
 * their email now points at.
 */
export function recordLiveVerificationSent(id: string, url: string): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    c.liveVerificationUrl = url;
    c.liveVerificationSentAt = new Date().toISOString();
    c.liveVerificationCount = (c.liveVerificationCount ?? 0) + 1;
    // A fresh request, so what happened to the last one is history. Leaving
    // the old marks would show "opened" against a link nobody has opened yet.
    c.liveVerificationOpenedAt = undefined;
    c.liveVerificationLastOpenedAt = undefined;
    c.liveVerificationOpenCount = undefined;
    c.liveVerificationStartedAt = undefined;
    return { list, result: c };
  });
}

/** They opened the page we sent them. Throttled like the other opens. */
export function recordLiveVerificationOpened(id: string): Promise<boolean> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: false };

    const now = Date.now();
    const last = c.liveVerificationLastOpenedAt ?? c.liveVerificationOpenedAt;
    if (last && now - new Date(last).getTime() < REOPEN_THROTTLE_MS) {
      return { list, result: false };
    }

    const iso = new Date(now).toISOString();
    if (!c.liveVerificationOpenedAt) c.liveVerificationOpenedAt = iso;
    c.liveVerificationLastOpenedAt = iso;
    c.liveVerificationOpenCount = (c.liveVerificationOpenCount ?? 0) + 1;
    return { list, result: true };
  });
}

/**
 * They pressed through to the provider.
 *
 * Only the first time. This answers "did they ever get as far as starting",
 * and a later attempt does not make that less true.
 */
export function recordLiveVerificationStarted(id: string): Promise<boolean> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c || c.liveVerificationStartedAt) return { list, result: false };
    c.liveVerificationStartedAt = new Date().toISOString();
    return { list, result: true };
  });
}

/**
 * Log a reminder sent about an outstanding voice recording.
 *
 * Kept apart from the assessment reminder counters rather than reusing them.
 * They chase different things weeks apart, and a single count would tell a
 * recruiter "chased 3 times" without saying about what — which is the one
 * thing they need to know before sending a fourth.
 */
export function recordVoiceReminder(id: string): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    c.voiceReminderSentAt = new Date().toISOString();
    c.voiceReminderCount = (c.voiceReminderCount ?? 0) + 1;
    return { list, result: c };
  });
}

/** Log a reminder sent about an unfinished assessment. */
export function recordReminder(id: string, channel: "email" | "whatsapp"): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    const now = new Date().toISOString();
    if (channel === "email") {
      c.reminderEmailSentAt = now;
      c.reminderEmailCount = (c.reminderEmailCount ?? 0) + 1;
    } else {
      c.reminderWhatsAppSentAt = now;
      c.reminderWhatsAppCount = (c.reminderWhatsAppCount ?? 0) + 1;
    }
    return { list, result: c };
  });
}

/** Save recruiter notes against a candidate. */
export function setNotes(id: string, notes: string): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    c.notes = notes.slice(0, 5000);
    c.notesUpdatedAt = new Date().toISOString();
    return { list, result: c };
  });
}

/**
 * Permanently remove a candidate.
 *
 * There is no undo and no soft-delete: the record holds personal data, and a
 * deletion request under GDPR means the data goes, not that it is hidden.
 */
/**
 * Remove a candidate, returning the record that was removed.
 *
 * The record rather than a boolean, because their documents have to be deleted
 * from R2 as well and the keys only exist here. Storage is cleaned up by the
 * caller: this module owns the file, not the network.
 */
export function deleteCandidate(id: string): Promise<Candidate | null> {
  return withWrite((list) => {
    const i = list.findIndex((x) => x.id === id);
    if (i === -1) return { list, result: null };
    const [removed] = list.splice(i, 1);
    return { list, result: removed };
  });
}

/**
 * Record an uploaded document.
 *
 * Two behaviours, deliberately different.
 *
 * An identity photograph or a voice recording never displaces its
 * predecessor. When a recruiter sends someone back for a clearer picture, what
 * they sent the first time is the only record of what was actually submitted —
 * and the interesting question is often whether the second attempt is the same
 * document photographed better or a different document entirely, which cannot
 * be asked at all once the first one is gone. The same holds for a re-recorded
 * assessment. The old record is marked superseded and kept; it leaves when a
 * recruiter deletes it by hand.
 *
 * Everything else — a CV, a cover letter, a certificate — is replaced. There
 * is no evidential question about a CV, and the key of the file it replaced is
 * returned so the caller can delete the orphan: otherwise the old object sits
 * in the bucket forever, paid for and unreachable.
 */
export function addDocument(
  id: string,
  doc: CandidateDocument,
): Promise<{ ok: boolean; replacedKey?: string }> {
  type Result = { ok: boolean; replacedKey?: string };
  return withWrite<Result>((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: { ok: false } };
    const docs = c.documents ?? [];

    if (keepsHistory(doc.kind)) {
      const now = new Date().toISOString();
      c.documents = [
        ...docs.map((d) =>
          d.kind === doc.kind && !d.supersededAt ? { ...d, supersededAt: now } : d,
        ),
        doc,
      ];
      // Nothing to delete: the point is that it stays.
      return { list, result: { ok: true } };
    }

    const previous = docs.find((d) => d.kind === doc.kind);
    c.documents = [...docs.filter((d) => d.kind !== doc.kind), doc];
    return { list, result: { ok: true, replacedKey: previous?.key } };
  });
}

/**
 * One stored document, or null. Used by the admin download route.
 *
 * The current one, not the first one in the list. Identity photographs keep
 * their predecessors, so "the identity document" and "a document whose kind is
 * identity" stopped meaning the same thing — and answering with the wrong one
 * would put a replaced photograph in front of whoever is reviewing it.
 *
 * Pass `key` to reach a specific version. It is matched against this
 * candidate's own documents, so it selects among their files and can never
 * name anybody else's.
 */
export async function getDocument(
  id: string,
  kind: DocumentKind,
  key?: string,
): Promise<CandidateDocument | null> {
  const c = await getCandidate(id);
  if (key) {
    return (c?.documents ?? []).find((d) => d.kind === kind && d.key === key) ?? null;
  }
  return currentDocument(c?.documents, kind);
}

/**
 * Another candidate who uploaded a byte-identical file.
 *
 * The same person applying again under a new email and a new number still
 * photographs the same passport, so an identical hash on an identity image is
 * the same person with near-certainty. Returned rather than acted on: two
 * siblings sharing a household is not the same as one person applying twice,
 * and only a human can tell those apart.
 */
export async function findDocumentTwin(
  id: string,
  sha256: string,
): Promise<{ id: string; name: string; kind: DocumentKind } | null> {
  if (!sha256) return null;
  const list = await readAll();
  for (const c of list) {
    if (c.id === id) continue;
    const hit = (c.documents ?? []).find((d) => d.sha256 === sha256 && d.status !== "blocked");
    if (hit) return { id: c.id, name: c.fullName || "Unknown", kind: hit.kind };
  }
  return null;
}

/** Record the candidate's explicit consent to identity processing. */
export function recordVerificationConsent(id: string): Promise<boolean> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: false };
    if (!c.verificationConsentAt) c.verificationConsentAt = new Date().toISOString();
    return { list, result: true };
  });
}

/** A recruiter's decision on the images. */
export function setVerificationDecision(
  id: string,
  decision: "verified" | "rejected",
  by: string,
  reason?: string,
): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    const now = new Date().toISOString();
    if (decision === "verified") {
      c.verifiedAt = now;
      c.verifiedBy = by;
      delete c.rejectedAt;
      delete c.rejectionReason;
    } else {
      c.rejectedAt = now;
      c.verifiedBy = by;
      c.rejectionReason = reason?.slice(0, 300) || undefined;
      delete c.verifiedAt;
    }
    return { list, result: c };
  });
}

/**
 * Forget the identity images, keeping the decision.
 *
 * Returns the keys so the caller can remove them from storage. The record
 * stays: "verified on 3 March by wradmin" is the useful part, and the
 * photographs are the part worth not keeping once they have been looked at.
 */
export function clearVerificationImages(id: string): Promise<string[]> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: [] as string[] };
    const removed: string[] = [];
    c.documents = (c.documents ?? []).filter((d) => {
      if (!isVerificationKind(d.kind)) return true;
      if (d.key) removed.push(d.key);
      return false;
    });
    if (removed.length) c.imagesDeletedAt = new Date().toISOString();
    return { list, result: removed };
  });
}

/**
 * Ask a candidate to verify, and record when.
 *
 * Used for three people: someone whose country is not on the list, someone
 * whose country is but who finished their assessment before the check existed,
 * and someone who was rejected and is being given another go. A previous
 * rejection is cleared, because it is what makes their status "rejected" and
 * so stops the upload step ever appearing for them again — asking someone to
 * try again while leaving them barred is not asking at all.
 */
export function requestVerification(id: string): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    c.verificationRequestedAt = new Date().toISOString();
    delete c.rejectedAt;
    delete c.rejectionReason;
    return { list, result: c };
  });
}

/**
 * Ask for the identity photographs to be taken again, with a reason.
 *
 * For the candidate who already sent something and whose something is no good:
 * unreadable, the wrong document, an expired card, a back that never arrived.
 * Distinct from requestVerification because that one asks someone who has sent
 * nothing, and the two need opposite things from the record.
 *
 * The existing photographs stay. Deleting them here would be the tidier code
 * and the wrong behaviour: the old picture is the only evidence of what was
 * actually sent, and it has to survive until a replacement arrives — otherwise
 * a candidate who never answers leaves a record showing they sent nothing at
 * all.
 *
 * Any decision is withdrawn. A verified candidate whose passport turns out to
 * be illegible is not verified, and a rejected one being given another go is
 * not barred; leaving either in place would stop the upload step from ever
 * appearing for them again.
 */
export function requestIdentityReupload(
  id: string,
  reason: string,
): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    const now = new Date().toISOString();
    c.identityReuploadRequestedAt = now;
    c.identityReuploadReason = reason.trim().slice(0, 400) || undefined;
    // Also counted as a request, so the panel shows "Awaiting upload" rather
    // than the louder "Not asked yet" — they have been asked, twice now.
    c.verificationRequestedAt = now;
    delete c.verifiedAt;
    delete c.verifiedBy;
    delete c.rejectedAt;
    delete c.rejectionReason;
    return { list, result: c };
  });
}

/**
 * Record which of the three documents a candidate chose.
 *
 * Written when they submit, alongside consent, rather than when they pick:
 * someone flicking between the options while deciding is not information, and
 * a value stored on every click would leave "driver's licence" against a
 * record holding a passport photograph.
 */
export function setIdentityDocumentType(
  id: string,
  type: IdDocumentType,
): Promise<boolean> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: false };
    c.identityDocumentType = type;

    // Someone who sent an ID card and is now sending a passport has a "back of
    // card" on file that belongs to the submission they are replacing. Nothing
    // supersedes it, because no new back is coming — so it would sit in the
    // current set as though it were part of what they just sent. Retire it
    // here, where the change of type is known.
    if (!needsBack(type)) {
      const now = new Date().toISOString();
      c.documents = (c.documents ?? []).map((d) =>
        d.kind === "identityBack" && !d.supersededAt ? { ...d, supersededAt: now } : d,
      );
    }
    return { list, result: true };
  });
}

/**
 * Record an offer as sent, with the exact terms.
 *
 * The status moves to "Offer Sent" here rather than being left to the
 * recruiter: an offer is out in the world, and a record still reading "Under
 * review" would be wrong the moment the email leaves.
 */
export function recordOffer(id: string, offer: Offer, sentAt?: string): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    c.offer = offer;
    // The caller may supply the timestamp because the acceptance link in the
    // email is signed against it, and that email is built before this write
    // happens — the offer is still only recorded once the mail has actually
    // left, but both sides have to agree on which moment this offer is.
    c.offerSentAt = sentAt ?? new Date().toISOString();
    // A re-sent offer supersedes the previous answer; the terms just changed.
    delete c.offerAcceptedAt;
    delete c.offerDeclinedAt;
    delete c.offerDeclineReason;
    c.status = "Offer Sent";
    return { list, result: c };
  });
}

/** What the candidate said. Accepting moves them to Hired. */
export function setOfferOutcome(
  id: string,
  outcome: "accepted" | "declined",
  reason?: string,
): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c || !c.offerSentAt) return { list, result: null };
    const now = new Date().toISOString();
    if (outcome === "accepted") {
      c.offerAcceptedAt = now;
      delete c.offerDeclinedAt;
      delete c.offerDeclineReason;
      c.status = "Hired";
    } else {
      c.offerDeclinedAt = now;
      c.offerDeclineReason = reason?.slice(0, 300) || undefined;
      delete c.offerAcceptedAt;
      c.status = "Rejected";
    }
    return { list, result: c };
  });
}

/**
 * Why a candidate's own answer to an offer could not be recorded.
 *
 * "superseded" is the one worth having: a revised offer changes offerSentAt,
 * and an older email still sitting in an inbox must not be able to accept the
 * terms it was sent with.
 */
export type OfferAnswerResult =
  | { ok: true; candidate: Candidate }
  | { ok: false; reason: "not_found" | "no_offer" | "superseded" | "already_answered" };

/**
 * The candidate's own answer, from the link in their offer email.
 *
 * Separate from setOfferOutcome, which is the recruiter recording what they
 * were told on a call. This one has to defend itself: every precondition is
 * re-checked inside the same serialized write that acts on it, so two taps on
 * a slow phone connection cannot both succeed, and a link cannot be redeemed
 * against an offer that has since been replaced.
 *
 * Details and acceptance are written together or not at all. Half of this —
 * a candidate marked Hired with no confirmed details, or details stored
 * against an offer nobody accepted — would be worse than neither.
 */
export function acceptOfferWithDetails(
  id: string,
  offerSentAt: string,
  details: ConfirmedDetails,
  availability?: Availability,
): Promise<OfferAnswerResult> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: { ok: false, reason: "not_found" } as OfferAnswerResult };
    if (!c.offerSentAt) return { list, result: { ok: false, reason: "no_offer" } as OfferAnswerResult };
    if (c.offerSentAt !== offerSentAt) {
      return { list, result: { ok: false, reason: "superseded" } as OfferAnswerResult };
    }
    if (c.offerAcceptedAt || c.offerDeclinedAt) {
      return { list, result: { ok: false, reason: "already_answered" } as OfferAnswerResult };
    }

    const now = new Date().toISOString();
    c.confirmedDetails = details;
    c.confirmedDetailsAt = now;
    if (availability) c.availability = availability;
    // They accepted what the page showed them, which is the capped figure —
    // so that is what the record says they accepted. The original survives on
    // the offer as hoursCappedFrom, because their email still quotes it.
    if (c.offer) c.offer = effectiveOffer(c.offer);
    c.offerAcceptedAt = now;
    c.status = "Hired";
    return { list, result: { ok: true, candidate: c } as OfferAnswerResult };
  });
}

/** The candidate declining from their own link, with an optional reason. */
export function declineOfferByCandidate(
  id: string,
  offerSentAt: string,
  reason?: string,
): Promise<OfferAnswerResult> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: { ok: false, reason: "not_found" } as OfferAnswerResult };
    if (!c.offerSentAt) return { list, result: { ok: false, reason: "no_offer" } as OfferAnswerResult };
    if (c.offerSentAt !== offerSentAt) {
      return { list, result: { ok: false, reason: "superseded" } as OfferAnswerResult };
    }
    if (c.offerAcceptedAt || c.offerDeclinedAt) {
      return { list, result: { ok: false, reason: "already_answered" } as OfferAnswerResult };
    }

    c.offerDeclinedAt = new Date().toISOString();
    c.offerDeclineReason = reason?.trim().slice(0, 300) || undefined;
    c.status = "Rejected";
    return { list, result: { ok: true, candidate: c } as OfferAnswerResult };
  });
}

/**
 * Record where the application came from, as the server observed it.
 *
 * Written on both step one and final submit: the second call catches anyone
 * who changed their stated country in between, and re-detection is cheap.
 * Silently does nothing for an unknown id — detection runs alongside a
 * best-effort upsert that may not have landed.
 */
export function setDetectedCountry(id: string, iso2: string, name: string): Promise<boolean> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: false };
    c.detectedCountryIso = iso2;
    c.detectedCountryName = name;
    c.detectedCountryAt = new Date().toISOString();
    return { list, result: true };
  });
}

/**
 * Store the outcome of a Companies House lookup.
 *
 * Overwrites any previous one: this is a snapshot of the register at a moment,
 * not a history, and keeping stale snapshots beside a fresh one only invites
 * reading the wrong one.
 */
export function recordCompanyCheck(id: string, check: CompanyCheck): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    c.companyCheck = check;
    return { list, result: c };
  });
}

/** Every R2 key a candidate owns, for cleanup. */
export function documentKeys(c: Candidate | null): string[] {
  return (c?.documents ?? []).map((d) => d.key).filter((k): k is string => !!k);
}

/** Mark an application as a possible duplicate of an earlier one. */
export function flagDuplicate(id: string, ofId: string, ofName: string): Promise<void> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (c) {
      c.duplicateFlag = true;
      c.duplicateOfId = ofId;
      c.duplicateOfName = ofName;
    }
    return { list, result: undefined };
  });
}

interface PersonalInput {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  linkedin: string;
}

/** Create or update a candidate from the Personal Information step. */
export function upsertPersonal(input: PersonalInput): Promise<Candidate> {
  return withWrite((list) => {
    const now = new Date().toISOString();
    const fullName = `${input.firstName} ${input.lastName}`.trim();
    const existing = list.find((c) => c.id === input.id);
    if (existing) {
      Object.assign(existing, {
        firstName: input.firstName,
        lastName: input.lastName,
        fullName,
        dob: input.dob,
        email: input.email,
        phone: input.phone,
        country: input.country,
        city: input.city,
        address: input.address,
        linkedin: input.linkedin,
      });
      return { list, result: existing };
    }
    const candidate: Candidate = {
      id: input.id,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName,
      dob: input.dob,
      email: input.email,
      phone: input.phone,
      country: input.country,
      city: input.city,
      address: input.address,
      linkedin: input.linkedin,
      languages: [],
      position: "",
      application: {},
      status: "New Application",
      createdAt: now,
    };
    list.push(candidate);
    return { list, result: candidate };
  });
}

/** Save the full application on final submit. */
export function saveApplication(id: string, application: Record<string, unknown>): Promise<Candidate> {
  return withWrite((list) => {
    const now = new Date().toISOString();
    let c = list.find((x) => x.id === id);
    if (!c) {
      c = {
        id,
        firstName: str(application.firstName),
        lastName: str(application.lastName),
        fullName: `${str(application.firstName)} ${str(application.lastName)}`.trim(),
        dob: str(application.dob),
        email: str(application.email),
        phone: str(application.phone),
        country: str(application.country),
        city: str(application.city),
        address: str(application.address),
        linkedin: str(application.linkedin),
        languages: [],
        position: "",
        application: {},
        status: "New Application",
        createdAt: now,
      };
      list.push(c);
    }
    c.fullName = `${str(application.firstName)} ${str(application.lastName)}`.trim() || c.fullName;
    c.firstName = str(application.firstName) || c.firstName;
    c.lastName = str(application.lastName) || c.lastName;
    c.dob = str(application.dob) || c.dob;
    c.email = str(application.email) || c.email;
    c.phone = str(application.phone) || c.phone;
    c.country = str(application.country) || c.country;
    c.city = str(application.city) || c.city;
    c.address = str(application.address) || c.address;
    c.linkedin = str(application.linkedin) || c.linkedin;
    c.position = str(application.position) || c.position;
    if (Array.isArray(application.languages)) c.languages = application.languages as LanguageRow[];
    c.application = application;
    c.submittedAt = now;
    return { list, result: c };
  });
}

/** Record interview answers + score when the candidate completes the interview. */
export function recordInterview(
  id: string,
  result: { score: number; total: number; answers: Record<string, string> },
): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    c.interview = {
      completedAt: new Date().toISOString(),
      score: result.score,
      total: result.total,
      answers: result.answers,
    };
    c.status = "Interview Completed";
    return { list, result: c };
  });
}

export function setStatus(id: string, status: CandidateStatus): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    c.status = status;
    return { list, result: c };
  });
}

export function recordInvitation(id: string): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    c.invitationSentAt = new Date().toISOString();
    if (c.status === "New Application") c.status = "Interview Invitation Sent";
    return { list, result: c };
  });
}

/**
 * Claim the right to send the assessment invitation.
 *
 * Returns true only for the first caller; the timestamp is written inside the
 * same serialized write that checks it, so two concurrent submits cannot both
 * be told to send.
 */
export function claimInterviewEmail(id: string): Promise<boolean> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c || c.interviewEmailSentAt) return { list, result: false };
    c.interviewEmailSentAt = new Date().toISOString();
    return { list, result: true };
  });
}

/** Release the claim if the send failed, so a later retry can try again. */
export function releaseInterviewEmail(id: string): Promise<void> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (c) delete c.interviewEmailSentAt;
    return { list, result: undefined };
  });
}

export function recordVoiceRequest(id: string): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    c.voiceRequestedAt = new Date().toISOString();
    if (!c.voiceStatus || c.voiceStatus === "Voice Assessment Not Requested") {
      c.voiceStatus = "Voice Assessment Requested";
    }
    return { list, result: c };
  });
}

export function setVoiceStatus(id: string, status: VoiceStatus): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    c.voiceStatus = status;
    return { list, result: c };
  });
}
