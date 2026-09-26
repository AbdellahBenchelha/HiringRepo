/**
 * Every email this application sends, rendered with sample data, for reading.
 *
 * Read-only by design. The templates are code — they are reviewed and
 * committed like everything else — and a panel that let somebody retype an
 * offer email in a text box would be a second, unreviewed source of truth for
 * words that promise people money. What a recruiter needs is to see exactly
 * what a candidate will receive, and that is all this is.
 *
 * Rendered through the real template functions and the real formatting
 * helpers, never through copies. A preview built from hand-typed strings would
 * drift from the email the moment somebody changed either, and the whole value
 * of this page is that it cannot disagree with what actually goes out.
 *
 * Adding a template means adding it here. The test suite checks every
 * exported `…Html` function in emailTemplates has an entry, so a new template
 * cannot quietly be missing from the page.
 */
import { siteConfig } from "@/config/site";
import {
  companyDetailsHtml,
  companyDetailsSubject,
  companyDetailsText,
  identityReminderHtml,
  identityReminderSubject,
  identityReminderText,
  identityReuploadHtml,
  identityReuploadSubject,
  identityReuploadText,
  interviewInviteHtml,
  interviewInviteSubject,
  interviewInviteText,
  liveVerificationHtml,
  liveVerificationSubject,
  liveVerificationText,
  offerHtml,
  offerReminderHtml,
  offerReminderSubject,
  offerReminderText,
  offerSubject,
  offerText,
  reminderHtml,
  reminderSubject,
  reminderText,
  residenceRequestHtml,
  residenceRequestSubject,
  residenceRequestText,
  submissionReceivedHtml,
  submissionReceivedSubject,
  submissionReceivedText,
  verificationRequestHtml,
  verificationRequestSubject,
  verificationRequestText,
  voiceAckHtml,
  voiceAckSubject,
  voiceAckText,
  voiceAssessmentHtml,
  voiceAssessmentSubject,
  voiceAssessmentText,
  voiceReminderHtml,
  voiceReminderSubject,
  voiceReminderText,
} from "@/lib/emailTemplates";
import { effectiveOffer, formatRate, type Offer } from "@/lib/offer";
import { deadlineFrom, formatDeadline } from "@/lib/offerReminder";
import { sampleAgreement } from "@/lib/sampleAgreement";
import { REUPLOAD_REASONS } from "@/lib/verification";
import { RESIDENCE_REASONS } from "@/lib/residence";

export type EmailStage = "application" | "voice" | "identity" | "offer";

export const STAGE_LABEL: Record<EmailStage, string> = {
  application: "Application & assessment",
  voice: "Voice assessment",
  identity: "Identity & residence",
  offer: "Offer & agreement",
};

export const STAGE_ORDER: readonly EmailStage[] = ["application", "voice", "identity", "offer"];

export interface CatalogueEntry {
  /** Stable, used in the URL: /admin/emails?t=offer */
  id: string;
  name: string;
  stage: EmailStage;
  /** What causes it to be sent, in the terms of the panel that sends it. */
  when: string;
  /**
   * Whether it counts against the daily warm-up cap. Only the acknowledgement
   * somebody gets for applying is exempt.
   */
  kind: "campaign" | "reactive" | "both";
  /** The template function it renders, so the test can prove none is missing. */
  source: string;
  render: () => { subject: string; html: string; text: string };
}

/* -------------------------------------------------------------------------- */
/* Sample data                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * One invented candidate, used in every preview.
 *
 * Plainly fictional and the same person throughout, so a recruiter reading
 * the offer and then the reminder sees one story rather than a different
 * stranger in each email.
 */
const SAMPLE_NAME = "Amina Diallo";
const SAMPLE_EMAIL = "amina.diallo@example.com";
const SAMPLE_POSITION = "Customer Support Representative";

/**
 * Links in a preview point at the real site with an obviously fake token.
 * They are never followed — the preview frame does not allow it — but the
 * address shown in "Button not working? Copy this link" should look like the
 * real thing rather than like a placeholder.
 */
const base = siteConfig.url.replace(/\/$/, "");
const link = (path: string) => `${base}${path}`;

const SAMPLE_OFFER: Offer = {
  position: SAMPLE_POSITION,
  rate: 9,
  currency: "USD",
  unit: "HOUR",
  hoursPerWeek: 25,
  startDate: "2026-10-05",
  engagement: "Independent contractor",
};

/* -------------------------------------------------------------------------- */
/* The catalogue                                                               */
/* -------------------------------------------------------------------------- */

export const EMAIL_CATALOGUE: readonly CatalogueEntry[] = [
  /* ---------------------------------------------------------------- */
  /* Application & assessment                                          */
  /* ---------------------------------------------------------------- */
  {
    id: "interview-invite",
    name: "Assessment invitation",
    stage: "application",
    when:
      "Sent automatically the moment somebody submits an application, and again when you send the assessment link from the Candidates tab.",
    kind: "both",
    source: "interviewInviteHtml",
    render: () => {
      const invite = {
        fullName: SAMPLE_NAME,
        interviewUrl: link("/interview?c=EXAMPLE"),
        position: SAMPLE_POSITION,
      };
      return {
        subject: interviewInviteSubject(SAMPLE_POSITION),
        html: interviewInviteHtml(invite),
        text: interviewInviteText(invite),
      };
    },
  },
  {
    id: "assessment-reminder",
    name: "Assessment reminder",
    stage: "application",
    when:
      "Sent from Remind to answer, to candidates who were sent the assessment and have not finished it.",
    kind: "campaign",
    source: "reminderHtml",
    render: () => {
      const invite = {
        fullName: SAMPLE_NAME,
        interviewUrl: link("/interview?c=EXAMPLE&s=reminder-email"),
        position: SAMPLE_POSITION,
      };
      return {
        subject: reminderSubject(SAMPLE_POSITION),
        html: reminderHtml(invite),
        text: reminderText(invite),
      };
    },
  },

  /* ---------------------------------------------------------------- */
  /* Voice assessment                                                  */
  /* ---------------------------------------------------------------- */
  {
    id: "voice-assessment",
    name: "Interview passed — voice assessment",
    stage: "voice",
    when:
      "Sent from the Interviews tab when a candidate has passed the online interview and is asked to record the voice assessment.",
    kind: "campaign",
    source: "voiceAssessmentHtml",
    render: () => {
      const invite = {
        fullName: SAMPLE_NAME,
        email: SAMPLE_EMAIL,
        position: SAMPLE_POSITION,
        recordUrl: link("/interview?c=EXAMPLE"),
      };
      return {
        subject: voiceAssessmentSubject(),
        html: voiceAssessmentHtml(invite),
        text: voiceAssessmentText(invite),
      };
    },
  },
  {
    id: "voice-reminder",
    name: "Voice assessment reminder",
    stage: "voice",
    when: "Sent to candidates who were asked for a recording and have not sent one.",
    kind: "campaign",
    source: "voiceReminderHtml",
    render: () => {
      const invite = {
        fullName: SAMPLE_NAME,
        email: SAMPLE_EMAIL,
        position: SAMPLE_POSITION,
        recordUrl: link("/interview?c=EXAMPLE"),
      };
      return {
        subject: voiceReminderSubject(),
        html: voiceReminderHtml(invite),
        text: voiceReminderText(invite),
      };
    },
  },
  {
    id: "voice-ack",
    name: "Recording received",
    stage: "voice",
    when:
      "Sent to confirm a voice recording arrived and that an answer is coming. The candidate then appears in the Waiting tab.",
    kind: "campaign",
    source: "voiceAckHtml",
    render: () => {
      const invite = {
        fullName: SAMPLE_NAME,
        position: SAMPLE_POSITION,
        receivedAt: new Date().toISOString(),
      };
      return {
        subject: voiceAckSubject(),
        html: voiceAckHtml(invite),
        text: voiceAckText(invite),
      };
    },
  },

  /* ---------------------------------------------------------------- */
  /* Identity & residence                                              */
  /* ---------------------------------------------------------------- */
  {
    id: "verification-request",
    name: "Identity check request",
    stage: "identity",
    when:
      "Sent from the ID check tab to ask for identity documents from somebody whose country does not require them automatically.",
    kind: "campaign",
    source: "verificationRequestHtml",
    render: () => {
      const invite = {
        fullName: SAMPLE_NAME,
        interviewUrl: link("/interview?c=EXAMPLE"),
        position: SAMPLE_POSITION,
      };
      return {
        subject: verificationRequestSubject(),
        html: verificationRequestHtml(invite),
        text: verificationRequestText(invite),
      };
    },
  },
  {
    id: "identity-reupload",
    name: "New identity photos needed",
    stage: "identity",
    when:
      "Sent from Ask for new photos in the ID check tab. The highlighted box carries the reason you choose; this preview shows the first preset.",
    kind: "campaign",
    source: "identityReuploadHtml",
    render: () => {
      const payload = {
        fullName: SAMPLE_NAME,
        url: link("/offer?t=EXAMPLE"),
        reason: REUPLOAD_REASONS[0].message,
      };
      return {
        subject: identityReuploadSubject(),
        html: identityReuploadHtml(payload),
        text: identityReuploadText(payload),
      };
    },
  },
  {
    id: "identity-reminder",
    name: "Identity documents reminder",
    stage: "identity",
    when: "Sent to candidates who owe identity documents and have not sent them.",
    kind: "campaign",
    source: "identityReminderHtml",
    render: () => {
      const invite = {
        fullName: SAMPLE_NAME,
        uploadUrl: link("/offer?t=EXAMPLE"),
        position: SAMPLE_POSITION,
      };
      return {
        subject: identityReminderSubject(),
        html: identityReminderHtml(invite),
        text: identityReminderText(invite),
      };
    },
  },
  {
    id: "live-agreement",
    name: "Live verification — before the agreement",
    stage: "identity",
    when:
      "Sent from Start live verification when the reason is “One last step before we send your agreement”.",
    kind: "campaign",
    source: "liveVerificationHtml",
    render: () => {
      const invite = {
        fullName: SAMPLE_NAME,
        startUrl: link("/verify/live?t=EXAMPLE"),
        reason: "agreement" as const,
      };
      return {
        subject: liveVerificationSubject("agreement"),
        html: liveVerificationHtml(invite),
        text: liveVerificationText(invite),
      };
    },
  },
  {
    id: "live-retry",
    name: "Live verification — could not verify ID",
    stage: "identity",
    when:
      "Sent from Start live verification when the reason is “We couldn't verify your ID”.",
    kind: "campaign",
    source: "liveVerificationHtml",
    render: () => {
      const invite = {
        fullName: SAMPLE_NAME,
        startUrl: link("/verify/live?t=EXAMPLE"),
        reason: "retry" as const,
      };
      return {
        subject: liveVerificationSubject("retry"),
        html: liveVerificationHtml(invite),
        text: liveVerificationText(invite),
      };
    },
  },
  {
    id: "residence",
    name: "Proof of residence",
    stage: "identity",
    when:
      "Sent from Ask for proof of address in the ID check tab. The highlighted box carries the reason you choose; this preview shows the first preset.",
    kind: "campaign",
    source: "residenceRequestHtml",
    render: () => {
      const payload = {
        fullName: SAMPLE_NAME,
        url: link("/offer?t=EXAMPLE&step=residence"),
        reason: RESIDENCE_REASONS[0].message,
        country: "China",
      };
      return {
        subject: residenceRequestSubject(),
        html: residenceRequestHtml(payload),
        text: residenceRequestText(payload),
      };
    },
  },
  {
    id: "submission-received",
    name: "Submission received — under review",
    stage: "identity",
    when:
      "Sent by hand from the ID check tab — once a candidate has submitted identity documents or proof of residence waiting for review, or while their ID check shows Awaiting upload or Verified.",
    kind: "campaign",
    source: "submissionReceivedHtml",
    render: () => {
      const payload = { fullName: SAMPLE_NAME };
      return {
        subject: submissionReceivedSubject(),
        html: submissionReceivedHtml(payload),
        text: submissionReceivedText(payload),
      };
    },
  },

  /* ---------------------------------------------------------------- */
  /* Offer & agreement                                                 */
  /* ---------------------------------------------------------------- */
  {
    id: "offer",
    name: "Job offer",
    stage: "offer",
    when:
      "Sent from the Offer tab in View info. The terms shown are a sample — the real email carries the rate, hours and start date you enter.",
    kind: "campaign",
    source: "offerHtml",
    render: () => {
      const sample = sampleAgreement(base);
      const offerUrl = link("/offer?t=EXAMPLE");
      const payload = {
        fullName: SAMPLE_NAME,
        position: SAMPLE_OFFER.position,
        rate: formatRate(SAMPLE_OFFER),
        engagement: SAMPLE_OFFER.engagement,
        hoursPerWeek: effectiveOffer(SAMPLE_OFFER).hoursPerWeek,
        startDate: SAMPLE_OFFER.startDate,
        acceptUrl: offerUrl,
        declineUrl: `${offerUrl}&a=decline`,
        sampleUrl: sample?.url,
        sampleVersion: sample?.version,
      };
      return {
        subject: offerSubject(SAMPLE_OFFER.position),
        html: offerHtml(payload),
        text: offerText(payload),
      };
    },
  },
  {
    id: "offer-reminder",
    name: "Offer reminder",
    stage: "offer",
    when:
      "Sent from the Offers tab to candidates who have not answered their offer, with a deadline to reply.",
    kind: "campaign",
    source: "offerReminderHtml",
    render: () => {
      const invite = {
        fullName: SAMPLE_NAME,
        position: SAMPLE_OFFER.position,
        rate: formatRate(SAMPLE_OFFER),
        offerUrl: link("/offer?t=EXAMPLE"),
        deadline: formatDeadline(deadlineFrom(Date.now())),
      };
      return {
        subject: offerReminderSubject(invite.position),
        html: offerReminderHtml(invite),
        text: offerReminderText(invite),
      };
    },
  },
  {
    id: "company-details",
    name: "Company details request",
    stage: "offer",
    when:
      "Sent from the Company tab to a candidate who accepted as a company, asking them to confirm it with its paperwork.",
    kind: "campaign",
    source: "companyDetailsHtml",
    render: () => {
      const invite = {
        fullName: SAMPLE_NAME,
        companyName: "Diallo Support Services LLC",
        url: link("/company?t=EXAMPLE"),
      };
      return {
        subject: companyDetailsSubject(),
        html: companyDetailsHtml(invite),
        text: companyDetailsText(invite),
      };
    },
  },
];

export function catalogueEntry(id: string | undefined): CatalogueEntry {
  return EMAIL_CATALOGUE.find((e) => e.id === id) ?? EMAIL_CATALOGUE[0];
}

/**
 * Stop links inside the preview doing anything.
 *
 * The frame is sandboxed, which stops scripts and top-level navigation, but a
 * sandboxed frame may still navigate itself — and every link in these emails
 * points at the live site with a fake token, so a stray click would load an
 * "invalid link" page into the middle of the preview. One rule in the head,
 * which changes nothing about how the email looks.
 */
export function previewDocument(html: string): string {
  const guard = "<style>a{pointer-events:none!important}</style>";
  return html.includes("</head>") ? html.replace("</head>", `${guard}</head>`) : guard + html;
}
