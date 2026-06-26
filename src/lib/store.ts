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
