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
   * Only a finished application counts as having applied.
   *
   * A record is created at step one so the recruiter gets the notification and
   * the interview link straight away, but that is an attempt, not an
   * application. Counting it meant someone who filled in their details and
   * closed the tab was permanently locked out by their own abandoned record —
   * and told to contact us about an application they never made.
   *
   * Completing the assessment counts too: at that point we have what matters,
   * whatever happened to the rest of the form.
   */
  const applied = others.filter((c) => c.submittedAt || c.interview);

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
      .filter((c) => !c.submittedAt && !c.interview && normaliseEmail(c.email) === wantEmail)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    if (open[0]) resumeId = open[0].id;
  }

  return { emailTaken, phoneMatch, resumeId };
}

/**
 * Record that the candidate opened their assessment, the first time only.
 *
 * Returns false when it was already recorded, so the common case — a refresh,
 * or coming back to the tab — costs a read and no write at all.
 */
export function recordInterviewOpened(id: string): Promise<boolean> {
  return withWrite((list) => {
    const c = list.find((x) => x.id === id);
    if (!c || c.interviewOpenedAt) return { list, result: false };
    c.interviewOpenedAt = new Date().toISOString();
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
export function deleteCandidate(id: string): Promise<boolean> {
  return withWrite((list) => {
    const i = list.findIndex((x) => x.id === id);
    if (i === -1) return { list, result: false };
    list.splice(i, 1);
    return { list, result: true };
  });
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
