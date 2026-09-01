/**
 * The shape of a candidate as the Admin Panel's client components see them.
 *
 * Separate from the stored `Candidate` because the two differ deliberately:
 * derived values like the verification status and the interview link are
 * computed once on the server, and nothing here reaches for the filesystem.
 * Both the Candidates and Interviews tabs build the same view, so they build it
 * the same way.
 */
import type { Candidate } from "@/lib/store";
import type { CandidateDocument } from "@/lib/documents";
import type { CandidateStatus } from "@/lib/candidateStatus";
import { verificationStatus, type VerificationStatus } from "@/lib/verification";
import type { Offer } from "@/lib/offer";
import type { VoiceStatus } from "@/lib/candidateStatus";

export interface CandidateView {
  id: string;
  fullName: string;
  dob: string;
  email: string;
  phone: string;
  country: string;
  /** Where the application was actually sent from. Never the IP address. */
  detectedCountryName?: string;
  detectedCountryIso?: string;
  detectedCountryAt?: string;
  city: string;
  address: string;
  linkedin: string;
  languages: string[];
  position: string;
  status: CandidateStatus;
  createdAt: string;
  submittedAt?: string;
  invitationSentAt?: string;
  interviewCompleted: boolean;
  score?: number;
  total?: number;
  interviewLink: string;
  notes?: string;
  interviewOpenedAt?: string;
  formCompleted: boolean;
  reminderEmailSentAt?: string;
  reminderEmailCount?: number;
  reminderWhatsAppSentAt?: string;
  reminderWhatsAppCount?: number;
  duplicateFlag?: boolean;
  duplicateOfName?: string;
  interviewEmailSentAt?: string;
  lastOpenedAt?: string;
  openCount?: number;
  lastOpenSource?: string;
  documents?: CandidateDocument[];
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  imagesDeletedAt?: string;
  verificationConsentAt?: string;
  verificationRequestedAt?: string;
  voiceStatus?: VoiceStatus;
  /** Interview follow-up state, for the Interviews tab's own filters. */
  interviewCompletedAt?: string;
  voiceRequestedAt?: string;
  offer?: Offer;
  offerSentAt?: string;
  offerAcceptedAt?: string;
  offerDeclinedAt?: string;
  offerDeclineReason?: string;
}

/**
 * @param base     absolute site origin, for building the interview link
 * @param required countries that must verify their identity
 */
export function toCandidateView(
  c: Candidate,
  base: string,
  required: readonly string[],
): CandidateView {
  return {
    id: c.id,
    fullName: c.fullName,
    dob: c.dob,
    email: c.email,
    phone: c.phone,
    country: c.country,
    detectedCountryName: c.detectedCountryName,
    detectedCountryIso: c.detectedCountryIso,
    detectedCountryAt: c.detectedCountryAt,
    city: c.city,
    address: c.address,
    linkedin: c.linkedin,
    languages: c.languages.filter((l) => l.language).map((l) => l.language),
    position: c.position,
    status: c.status,
    createdAt: c.createdAt,
    submittedAt: c.submittedAt,
    invitationSentAt: c.invitationSentAt,
    interviewCompleted: !!c.interview,
    score: c.interview?.score,
    total: c.interview?.total,
    interviewLink: `${base}/interview?c=${c.id}`,
    duplicateFlag: c.duplicateFlag,
    duplicateOfName: c.duplicateOfName,
    interviewEmailSentAt: c.interviewEmailSentAt,
    notes: c.notes,
    interviewOpenedAt: c.interviewOpenedAt,
    formCompleted: !!c.submittedAt,
    reminderEmailSentAt: c.reminderEmailSentAt,
    reminderEmailCount: c.reminderEmailCount,
    reminderWhatsAppSentAt: c.reminderWhatsAppSentAt,
    reminderWhatsAppCount: c.reminderWhatsAppCount,
    lastOpenedAt: c.lastOpenedAt,
    openCount: c.openCount,
    lastOpenSource: c.lastOpenSource,
    documents: c.documents,
    verificationStatus: verificationStatus(c, required),
    verifiedAt: c.verifiedAt,
    verifiedBy: c.verifiedBy,
    rejectedAt: c.rejectedAt,
    rejectionReason: c.rejectionReason,
    imagesDeletedAt: c.imagesDeletedAt,
    verificationConsentAt: c.verificationConsentAt,
    verificationRequestedAt: c.verificationRequestedAt,
    voiceStatus: c.voiceStatus,
    interviewCompletedAt: c.interview?.completedAt,
    voiceRequestedAt: c.voiceRequestedAt,
    offer: c.offer,
    offerSentAt: c.offerSentAt,
    offerAcceptedAt: c.offerAcceptedAt,
    offerDeclinedAt: c.offerDeclinedAt,
    offerDeclineReason: c.offerDeclineReason,
  };
}
