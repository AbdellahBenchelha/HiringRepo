/**
 * The wording of the Independent Contractor Agreement, clause by clause.
 *
 * Copied from the published specimen (public/sample-contractor-agreement-
 * 2026-10-02-c.pdf) word for word, so the agreement a candidate signs says
 * exactly what the specimen they read before accepting said. Only the
 * specimen's own notices are left out ("This is an example…", "not on this
 * specimen, which nobody signs"); the parties, the schedule and the signature
 * block are drawn from the candidate's details in lib/agreementPdf.
 *
 * When the specimen's wording changes, change it here too, and change
 * AGREEMENT_VERSION, which is printed on every page.
 */

export const AGREEMENT_VERSION = "2026-10-02-c";

/** A paragraph, or a numbered list of points. */
export type AgreementBlock = string | { list: string[] };

export interface AgreementClause {
  title: string;
  blocks: AgreementBlock[];
}

export const AGREEMENT_CLAUSES: AgreementClause[] = [
  {
    title: "1. What this agreement is",
    blocks: [
      "This agreement sets out the terms on which you provide services to us as an independent contractor. It replaces anything said or written before it about the same subject, including any offer email, except that the fee, hours and start date agreed in your offer are carried into the schedule above.",
      "It is written in plain English on purpose. If any part of it is unclear to you, ask us before you sign. We would rather answer a question now than have a misunderstanding later.",
    ],
  },
  {
    title: "2. The services",
    blocks: [
      "You agree to provide the services described in the schedule, with reasonable skill and care, and to the quality standards we tell you about from time to time. Those standards will relate to the work — response times, accuracy, tone with customers — and not to how you organise your own day.",
      "We may ask you to support a particular client account. Where we do, you will be told who the client is, what they sell and what kind of enquiries to expect, and you will be given the access and training needed to do the work.",
    ],
  },
  {
    title: "3. Your status: independent contractor",
    blocks: [
      "You are an independent contractor. You are not our employee, worker, agent or partner, and nothing in this agreement creates an employment relationship between us.",
      {
        list: [
          "You are responsible for your own income tax, social security and any other contributions arising from what we pay you, in the country where you are resident. We do not deduct them.",
          "You are not entitled to paid holiday, sick pay, pension contributions, notice pay or any other employment benefit from us.",
          "You are free to work for other clients, including in the same industry, provided you keep to your confidentiality obligations in clause 9 and there is no conflict of interest you have not told us about.",
          "We guarantee the weekly hours in the schedule, and clause 6 says what that means in practice. What we do not direct is how you work: the guarantee is about how much we commit to, not about who controls your day.",
          "You decide how you carry out the services, subject to the quality standards and the availability window you chose under clause 5.",
        ],
      },
    ],
  },
  {
    title: "4. Your legal right to work in this way",
    blocks: [
      "You confirm that you are legally permitted, in the country where you live, to provide services on a self-employed or independent basis, and that doing so is compatible with any immigration permission or residence permit you hold.",
      "We raise this because it matters more to you than to us. In some countries a residence permit allows employment but not self-employed activity, and accepting a contractor engagement without the right permission could put your immigration status at risk. If you are in any doubt, please check with the relevant authority before signing. Tell us if your position changes.",
    ],
  },
  {
    title: "5. Where and when you work",
    blocks: [
      "You provide the services from your own premises, using your own computer, headset and internet connection. You are responsible for their cost, maintenance and security. We will tell you the minimum technical requirements before you start.",
      "You choose your availability window, and it is eight hours long. You told us when it starts and which five days of the week you work, and both are recorded in the schedule above. Inside that window you will be asked to work no more than five hours in a day, and no more than twenty-five hours in a week.",
      {
        list: [
          "The window is longer than the work on purpose. Customer demand does not arrive evenly, and the gap is what lets the work fall where it falls without either of us rescheduling.",
          "You are not required to be available outside your window, and we will not treat time outside it as time you were unavailable.",
          "Your window and your days can change if we both agree the change in writing.",
          "We give you access to our mobile application, for the notification that a customer request is waiting, and to your account on our website, where requests are picked up. You may work from either. Both are provided by us at no cost to you, and access ends when this agreement does.",
        ],
      },
      "Any software, systems or accounts we give you access to remain ours or our client’s. You may use them only for the services, and your access ends when this agreement does.",
    ],
  },
  {
    title: "6. Fees, invoicing and payment",
    blocks: [
      "We guarantee the hours in the schedule. If the schedule says 10 hours a week, you are paid for 10 hours a week. This is a commitment on our side, not a forecast: if we do not have that much work for you in a given week, we pay you for the guaranteed hours anyway.",
      {
        list: [
          "We pay you the fee in the schedule for each hour worked, and for any guaranteed hour we did not give you work for.",
          "The guarantee applies to the hours you were available for inside the availability window in the schedule. Hours you were not available for — time off you asked for, or time you did not work when work was offered — are not guaranteed hours, and nothing in this clause requires you to be available outside that window.",
          "If you work more than the guaranteed hours in a week, at our request, we pay you for every hour you worked. The guarantee is a floor, not a ceiling.",
          "The guaranteed number can only change if we both agree the change in writing. We cannot reduce it on our own; if we need fewer hours than we committed to, the answer is either an agreed change or notice under clause 13, not a smaller payment.",
          "You invoice us monthly in arrears, for the previous month, showing the hours worked, any guaranteed hours you were not given work for, and your own tax or registration number where your country requires one.",
          "We pay a correct invoice within the number of working days shown in the schedule, by bank transfer to the account you tell us, in the currency shown.",
          "Bank charges applied by your own bank, and any currency conversion carried out by it, are yours. Tell us if you would prefer to be paid in a different currency and we will see whether we can arrange it.",
          "If we dispute part of an invoice we will tell you promptly and pay the undisputed part on time.",
        ],
      },
    ],
  },
  {
    title: "7. What you never pay us",
    blocks: [
      "We will never ask you for money. There is no fee of any kind payable by you to us or to anyone acting for us — not for training, equipment, software, onboarding, administration, a background check, or anything else. We will never ask you for a bank card, a password, or a payment to release your earnings.",
      "If you ever receive a request for payment that appears to come from us, it does not come from us. Please do not pay it, and tell us so that we can warn others.",
    ],
  },
  {
    title: "8. Expenses",
    blocks: [
      "You meet your own ordinary costs of working, including equipment, internet and electricity. We reimburse only expenses we have agreed in writing in advance, on production of a receipt.",
    ],
  },
  {
    title: "9. Confidentiality",
    blocks: [
      "In doing this work you will see information that is confidential to us, to our clients and to their customers. You agree to keep it confidential, to use it only for the services, and not to disclose it to anyone else, during the engagement and after it ends.",
      "This does not apply to information that is already public through no fault of yours, or that you are required by law to disclose — in which case, tell us first if you are allowed to.",
    ],
  },
  {
    title: "10. Personal data",
    blocks: [
      "You will handle personal data belonging to our clients’ customers. That carries specific obligations, and they are not optional.",
      {
        list: [
          "You process that data only on our documented instructions, and only as far as the services require.",
          "You keep it secure: a password-protected device, a screen no one else can read, no copying of customer data to personal storage, personal email or messaging apps, and no working on shared or public computers.",
          "You do not transfer it to anyone else, or to another country, without our written instruction.",
          "You tell us immediately — and in any event within 24 hours — if you suspect any loss, theft or unauthorised access, including a lost or stolen device. Telling us quickly is what limits the harm; you will not be penalised for reporting promptly and honestly.",
          "When this agreement ends, you delete any personal data you still hold and confirm to us that you have done so.",
        ],
      },
    ],
  },
  {
    title: "11. Intellectual property",
    blocks: [
      "Anything you create in providing the services — written material, procedures, recordings, translations — belongs to us as soon as it is created, and you assign it to us. This does not affect anything you owned before this agreement or created independently of it.",
    ],
  },
  {
    title: "12. Substitution",
    blocks: [
      "You may propose that a suitably qualified substitute performs the services in your place. We will not withhold agreement unreasonably, but because the work involves access to client and customer data we must approve the substitute in advance, and they must accept the same obligations under clauses 9 and 10. You remain responsible for their work and for paying them.",
    ],
  },
  {
    title: "13. Term and ending this agreement",
    blocks: [
      {
        list: [
          "Either of us may end this agreement at any time by giving the other written notice of the period shown in the schedule. No reason is needed.",
          "Either of us may end it immediately if the other commits a serious breach that cannot be put right, or does not put right a breach within 14 days of being asked to.",
          "The guarantee in clause 6 runs to the end of the notice period. If we ask you to stop working before the notice runs out, we still pay the guaranteed hours for the rest of it.",
          "On ending, we pay you for all hours worked up to that date, and for any guaranteed hours still owed under this clause, on your final invoice.",
          "Clauses 9, 10 and 11 continue to apply after the agreement ends.",
        ],
      },
    ],
  },
  {
    title: "14. Your assurances to us",
    blocks: [
      "You confirm that the information you gave us during recruitment is true, that you have the experience and any qualifications you told us about, and that you are not prevented by any other agreement from providing these services.",
    ],
  },
  {
    title: "15. Liability",
    blocks: [
      "Neither of us excludes liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be excluded. Subject to that, our total liability to you under this agreement is limited to the fees paid to you in the twelve months before the claim arose.",
    ],
  },
  {
    title: "16. General",
    blocks: [
      {
        list: [
          "Neither of us may transfer this agreement to anyone else without the other’s written consent, except that we may transfer it to a company in the same group.",
          "Any change to this agreement must be in writing and agreed by both of us.",
          "If any part of this agreement is found to be unenforceable, the rest continues to apply.",
          "Notices under this agreement may be given by email to the addresses we each use for day-to-day contact.",
          "No one other than the two of us has any right to enforce this agreement.",
        ],
      },
    ],
  },
  {
    title: "17. Governing law",
    blocks: [
      "This agreement is governed by the law shown in the schedule, and the courts of that jurisdiction have exclusive jurisdiction over any dispute arising from it. Nothing in this clause removes any protection that the law of the country where you live gives you and that cannot be contracted out of.",
    ],
  },
];

/** Clause 18: the signature block itself is drawn by the PDF. */
export const SIGNATURES_TITLE = "18. Signatures";
export const SIGNATURES_INTRO = "Each party signs below.";
