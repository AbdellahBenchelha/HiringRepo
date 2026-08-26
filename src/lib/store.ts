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
import {
  CANDIDATE_STATUSES,
  VOICE_STATUSES,
  type CandidateStatus,
  type VoiceStatus,
} from "@/lib/candidateStatus";
import { normaliseEmail, normalisePhone } from "@/lib/identity";
import { isCandidateOpen, type OpenSource } from "@/lib/followUp";
import type { CandidateDocument, DocumentKind } from "@/lib/documents";

export { CANDIDATE_STATUSES, VOICE_STATUSES };
export type { CandidateStatus, VoiceStatus };

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
  // Post-interview WhatsApp follow-ups (Interviews section).
  successMessageSentAt?: string;
  voiceRequestedAt?: string;
  voiceStatus?: VoiceStatus;
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
  /** Reminder chasing an unfinished assessment, per channel. */
  reminderEmailSentAt?: string;
  reminderEmailCount?: number;
  reminderWhatsAppSentAt?: string;
  reminderWhatsAppCount?: number;
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "candidates.json");

async function readAll(): Promise<Candidate[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as Candidate[]) : [];
  } catch {
    return [];
  }
}

// Serialize writes so concurrent requests don't clobber the file.
let writeChain: Promise<unknown> = Promise.resolve();

function withWrite<T>(fn: (list: Candidate[]) => { list: Candidate[]; result: T }): Promise<T> {
  const run = async (): Promise<T> => {
    const list = await readAll();
    const { list: next, result } = fn(list);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(next, null, 2), "utf8");
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
 * Record an uploaded document, replacing any earlier one of the same kind.
 *
 * Returns the key of the document it replaced, if any, so the caller can
 * delete the orphan from R2 — re-uploading a CV should not quietly leave the
 * old one paid for and unreachable forever.
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
    const previous = docs.find((d) => d.kind === doc.kind);
    c.documents = [...docs.filter((d) => d.kind !== doc.kind), doc];
    return { list, result: { ok: true, replacedKey: previous?.key } };
  });
}

/** One stored document, or null. Used by the admin download route. */
export async function getDocument(
  id: string,
  kind: DocumentKind,
): Promise<CandidateDocument | null> {
  const c = await getCandidate(id);
  return c?.documents?.find((d) => d.kind === kind) ?? null;
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
      if (d.kind !== "identity" && d.kind !== "selfie") return true;
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

export function recordSuccessMessage(id: string): Promise<Candidate | null> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return { list, result: null };
    c.successMessageSentAt = new Date().toISOString();
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
