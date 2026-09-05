// Builds the specimen contractor agreement PDF.
//
// Written as HTML and printed by Chromium rather than assembled with a PDF
// library: the document has to look like it belongs to the rest of the site,
// and the typography, the repeating watermark and the page furniture are all
// far easier to get right in CSS than in drawing commands.
//
// Re-run this whenever the wording changes, then bump the version in
// src/config/site.ts and rename the output — a browser holding the old file in
// cache will otherwise keep serving it.
//
// Playwright is deliberately NOT a dependency of the site: it pulls a browser
// down on install, which has no business in a Railway deploy. Install it just
// for the run instead:
//
//   npm i -D playwright && npx playwright install chromium
//   node scripts/sample-agreement.mjs
//
// Set CHROMIUM to an existing Chromium binary to skip the download.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VERSION = 'September 2026';
const OUT = path.join(ROOT, 'public', 'sample-contractor-agreement-2026-09.pdf');

const NAVY = '#0f1035';
const MUTED = '#4f4f80';
const BRAND = '#f5a623';
const BRAND_DARK = '#b06e0c';
const LINE = '#e8e8f1';
const CREAM = '#fffaf0';

/** A numbered clause. */
const clause = (n, title, body) => `
  <section class="clause">
    <h2><span class="num">${n}.</span>${title}</h2>
    ${body}
  </section>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Specimen contractor agreement</title>
<style>
  @page { size: A4; margin: 20mm 18mm 22mm 18mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font: 400 10.5pt/1.55 Georgia, "Times New Roman", serif;
    color: ${NAVY}; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }

  /* Repeated on every page: a fixed element is painted onto each sheet by
     Chromium's printer, which is what makes one block cover the whole
     document rather than only the first page. */
  .watermark {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    display: flex; flex-direction: column; justify-content: space-around;
    align-items: center; overflow: hidden;
  }
  .watermark span {
    font: 700 30pt/1 Helvetica, Arial, sans-serif;
    color: ${BRAND}; opacity: 0.13; white-space: nowrap;
    transform: rotate(-32deg); letter-spacing: 3px;
  }

  .sheet { position: relative; z-index: 1; }

  h1 { font: 700 20pt/1.25 Helvetica, Arial, sans-serif; margin: 0 0 4px; }
  .sub { font: 400 10pt/1.5 Helvetica, Arial, sans-serif; color: ${MUTED}; margin: 0; }
  .eyebrow {
    font: 700 8.5pt/1 Helvetica, Arial, sans-serif; letter-spacing: 2.2px;
    text-transform: uppercase; color: ${BRAND_DARK}; margin: 0 0 10px;
  }

  .banner {
    border: 2px solid ${BRAND}; background: ${CREAM}; border-radius: 6px;
    padding: 14px 16px; margin: 18px 0 22px;
    font: 400 10pt/1.5 Helvetica, Arial, sans-serif; color: ${NAVY};
  }
  .banner strong { display: block; font-size: 11.5pt; margin-bottom: 5px; }

  h2 {
    font: 700 11pt/1.4 Helvetica, Arial, sans-serif; color: ${NAVY};
    margin: 20px 0 6px; page-break-after: avoid;
  }
  h2 .num { color: ${BRAND_DARK}; margin-right: 8px; }
  .clause { page-break-inside: avoid; }
  p { margin: 0 0 8px; text-align: justify; }
  ol.sub-list { margin: 0 0 8px; padding-left: 20px; }
  ol.sub-list li { margin-bottom: 5px; text-align: justify; }
  .fill { color: ${BRAND_DARK}; font-weight: 700; font-family: Helvetica, Arial, sans-serif; }

  table.terms { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
  table.terms th, table.terms td {
    border: 1px solid ${LINE}; padding: 7px 10px; text-align: left; vertical-align: top;
    font: 400 10pt/1.45 Helvetica, Arial, sans-serif;
  }
  table.terms th { width: 38%; background: #faf9fd; font-weight: 700; color: ${MUTED}; }

  .parties { margin: 0 0 4px; }
  .parties p { margin-bottom: 10px; }

  .sig { margin-top: 26px; page-break-inside: avoid; }
  .sig table { width: 100%; border-collapse: collapse; }
  .sig td { width: 50%; padding: 0 14px 0 0; vertical-align: top; }
  .sig .line { border-bottom: 1px solid ${NAVY}; height: 34px; margin-bottom: 5px; }
  .sig .lab { font: 400 9pt/1.4 Helvetica, Arial, sans-serif; color: ${MUTED}; }

  .end {
    margin-top: 24px; padding-top: 12px; border-top: 1px solid ${LINE};
    font: 400 9pt/1.5 Helvetica, Arial, sans-serif; color: ${MUTED}; text-align: center;
  }
</style></head>
<body>
  <!-- Kept short on purpose. Rotated at -32deg the line has to fit the page
       width, and a longer phrase is clipped at both ends on every repetition —
       which loses the one word that has to be readable. -->
  <div class="watermark">
    ${Array.from({ length: 7 }, () => '<span>SPECIMEN — NOT A CONTRACT</span>').join('')}
  </div>

  <div class="sheet">
    <p class="eyebrow">WorkRoute · Customer Experience</p>
    <h1>Independent Contractor Agreement</h1>
    <p class="sub">Specimen document · Version ${VERSION}</p>

    <div class="banner">
      <strong>This is an example, not an offer and not a contract.</strong>
      It is published so that you can read the terms an engagement with WorkRoute is normally made
      on <em>before</em> you decide whether to accept an offer. Nothing here binds you or us. If you
      accept an offer, your own agreement is drawn up separately with your details, your agreed
      rate and your start date in it, and is sent to you to sign. Where this document shows
      <span class="fill">[SQUARE BRACKETS]</span>, those details are completed individually.
      Please take your time with it and ask us about anything that is unclear.
    </div>

    <h2>Parties</h2>
    <div class="parties">
      <p>
        <strong>(1) The Company.</strong> <span class="fill">[REGISTERED COMPANY NAME]</span>, a
        company registered in <span class="fill">[COUNTRY]</span> under company number
        <span class="fill">[COMPANY NUMBER]</span>, whose registered office is at
        <span class="fill">[REGISTERED ADDRESS]</span> (&ldquo;the Company&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;).
      </p>
      <p>
        <strong>(2) The Contractor.</strong> <span class="fill">[FULL LEGAL NAME]</span> of
        <span class="fill">[ADDRESS]</span>, or, where the Contractor engages through a company,
        <span class="fill">[COMPANY NAME AND REGISTRATION NUMBER]</span> (&ldquo;the
        Contractor&rdquo;, &ldquo;you&rdquo;).
      </p>
      <p>
        This agreement begins on <span class="fill">[START DATE]</span> and continues until ended
        under clause 13.
      </p>
    </div>

    <h2>Schedule of key terms</h2>
    <table class="terms">
      <tr><th>Services</th><td><span class="fill">[ROLE, e.g. customer support by email, live chat and telephone]</span></td></tr>
      <tr><th>Fee</th><td><span class="fill">[RATE]</span> per hour worked, in <span class="fill">[CURRENCY]</span></td></tr>
      <tr><th>Expected hours</th><td><span class="fill">[HOURS]</span> per week, within <span class="fill">[AGREED WORKING WINDOW AND TIME ZONE]</span></td></tr>
      <tr><th>Invoicing</th><td>Monthly in arrears</td></tr>
      <tr><th>Payment</th><td>Within <span class="fill">[N]</span> working days of a correct invoice, by bank transfer</td></tr>
      <tr><th>Notice</th><td><span class="fill">[N]</span> days, by either party, in writing</td></tr>
      <tr><th>Governing law</th><td><span class="fill">[JURISDICTION]</span></td></tr>
    </table>

${clause(1, 'What this agreement is', `
    <p>
      This agreement sets out the terms on which you provide services to us as an independent
      contractor. It replaces anything said or written before it about the same subject, including
      any offer email, except that the fee, hours and start date agreed in your offer are carried
      into the schedule above.
    </p>
    <p>
      It is written in plain English on purpose. If any part of it is unclear to you, ask us before
      you sign. We would rather answer a question now than have a misunderstanding later.
    </p>`)}

${clause(2, 'The services', `
    <p>
      You agree to provide the services described in the schedule, with reasonable skill and care,
      and to the quality standards we tell you about from time to time. Those standards will relate
      to the work — response times, accuracy, tone with customers — and not to how you organise your
      own day.
    </p>
    <p>
      We may ask you to support a particular client account. Where we do, you will be told who the
      client is, what they sell and what kind of enquiries to expect, and you will be given the
      access and training needed to do the work.
    </p>`)}

${clause(3, 'Your status: independent contractor', `
    <p>
      You are an independent contractor. You are not our employee, worker, agent or partner, and
      nothing in this agreement creates an employment relationship between us.
    </p>
    <ol class="sub-list">
      <li>You are responsible for your own income tax, social security and any other contributions
          arising from what we pay you, in the country where you are resident. We do not deduct
          them.</li>
      <li>You are not entitled to paid holiday, sick pay, pension contributions, notice pay or any
          other employment benefit from us.</li>
      <li>You are free to work for other clients, including in the same industry, provided you keep
          to your confidentiality obligations in clause 9 and there is no conflict of interest you
          have not told us about.</li>
      <li>We do not guarantee you any minimum amount of work. The hours in the schedule are what we
          expect and plan around, not a commitment to provide them.</li>
      <li>You decide how you carry out the services, subject to the quality standards and the agreed
          working window.</li>
    </ol>`)}

${clause(4, 'Your legal right to work in this way', `
    <p>
      You confirm that you are legally permitted, in the country where you live, to provide services
      on a self-employed or independent basis, and that doing so is compatible with any immigration
      permission or residence permit you hold.
    </p>
    <p>
      We raise this because it matters more to you than to us. In some countries a residence permit
      allows employment but not self-employed activity, and accepting a contractor engagement
      without the right permission could put your immigration status at risk. If you are in any
      doubt, please check with the relevant authority before signing. Tell us if your position
      changes.
    </p>`)}

${clause(5, 'Where and how you work', `
    <p>
      You provide the services from your own premises, using your own computer, headset and internet
      connection. You are responsible for their cost, maintenance and security. We will tell you the
      minimum technical requirements before you start.
    </p>
    <p>
      Any software, systems or accounts we give you access to remain ours or our client&rsquo;s. You
      may use them only for the services, and your access ends when this agreement does.
    </p>`)}

${clause(6, 'Fees, invoicing and payment', `
    <ol class="sub-list">
      <li>We pay you the fee in the schedule for each hour actually worked.</li>
      <li>You invoice us monthly in arrears, for the previous month, showing the hours worked and
          your own tax or registration number where your country requires one.</li>
      <li>We pay a correct invoice within the number of working days shown in the schedule, by bank
          transfer to the account you tell us, in the currency shown.</li>
      <li>Bank charges applied by your own bank, and any currency conversion carried out by it, are
          yours. Tell us if you would prefer to be paid in a different currency and we will see
          whether we can arrange it.</li>
      <li>If we dispute part of an invoice we will tell you promptly and pay the undisputed part on
          time.</li>
    </ol>`)}

${clause(7, 'What you never pay us', `
    <p>
      <strong>We will never ask you for money.</strong> There is no fee of any kind payable by you
      to us or to anyone acting for us — not for training, equipment, software, onboarding,
      administration, a background check, or anything else. We will never ask you for a bank card,
      a password, or a payment to release your earnings.
    </p>
    <p>
      If you ever receive a request for payment that appears to come from us, it does not come from
      us. Please do not pay it, and tell us so that we can warn others.
    </p>`)}

${clause(8, 'Expenses', `
    <p>
      You meet your own ordinary costs of working, including equipment, internet and electricity. We
      reimburse only expenses we have agreed in writing in advance, on production of a receipt.
    </p>`)}

${clause(9, 'Confidentiality', `
    <p>
      In doing this work you will see information that is confidential to us, to our clients and to
      their customers. You agree to keep it confidential, to use it only for the services, and not
      to disclose it to anyone else, during the engagement and after it ends.
    </p>
    <p>
      This does not apply to information that is already public through no fault of yours, or that
      you are required by law to disclose — in which case, tell us first if you are allowed to.
    </p>`)}

${clause(10, 'Personal data', `
    <p>
      You will handle personal data belonging to our clients&rsquo; customers. That carries specific
      obligations, and they are not optional.
    </p>
    <ol class="sub-list">
      <li>You process that data only on our documented instructions, and only as far as the services
          require.</li>
      <li>You keep it secure: a password-protected device, a screen no one else can read, no copying
          of customer data to personal storage, personal email or messaging apps, and no working on
          shared or public computers.</li>
      <li>You do not transfer it to anyone else, or to another country, without our written
          instruction.</li>
      <li>You tell us <strong>immediately</strong> — and in any event within 24 hours — if you
          suspect any loss, theft or unauthorised access, including a lost or stolen device. Telling
          us quickly is what limits the harm; you will not be penalised for reporting promptly and
          honestly.</li>
      <li>When this agreement ends, you delete any personal data you still hold and confirm to us
          that you have done so.</li>
    </ol>`)}

${clause(11, 'Intellectual property', `
    <p>
      Anything you create in providing the services — written material, procedures, recordings,
      translations — belongs to us as soon as it is created, and you assign it to us. This does not
      affect anything you owned before this agreement or created independently of it.
    </p>`)}

${clause(12, 'Substitution', `
    <p>
      You may propose that a suitably qualified substitute performs the services in your place. We
      will not withhold agreement unreasonably, but because the work involves access to client and
      customer data we must approve the substitute in advance, and they must accept the same
      obligations under clauses 9 and 10. You remain responsible for their work and for paying
      them.
    </p>`)}

${clause(13, 'Term and ending this agreement', `
    <ol class="sub-list">
      <li>Either of us may end this agreement at any time by giving the other written notice of the
          period shown in the schedule. No reason is needed.</li>
      <li>Either of us may end it immediately if the other commits a serious breach that cannot be
          put right, or does not put right a breach within 14 days of being asked to.</li>
      <li>On ending, we pay you for all hours worked up to that date, on your final invoice.</li>
      <li>Clauses 9, 10 and 11 continue to apply after the agreement ends.</li>
    </ol>`)}

${clause(14, 'Your assurances to us', `
    <p>
      You confirm that the information you gave us during recruitment is true, that you have the
      experience and any qualifications you told us about, and that you are not prevented by any
      other agreement from providing these services.
    </p>`)}

${clause(15, 'Liability', `
    <p>
      Neither of us excludes liability for death or personal injury caused by negligence, for fraud,
      or for anything else that cannot lawfully be excluded. Subject to that, our total liability to
      you under this agreement is limited to the fees paid to you in the twelve months before the
      claim arose.
    </p>`)}

${clause(16, 'General', `
    <ol class="sub-list">
      <li>Neither of us may transfer this agreement to anyone else without the other&rsquo;s written
          consent, except that we may transfer it to a company in the same group.</li>
      <li>Any change to this agreement must be in writing and agreed by both of us.</li>
      <li>If any part of this agreement is found to be unenforceable, the rest continues to apply.</li>
      <li>Notices under this agreement may be given by email to the addresses we each use for
          day-to-day contact.</li>
      <li>No one other than the two of us has any right to enforce this agreement.</li>
    </ol>`)}

${clause(17, 'Governing law', `
    <p>
      This agreement is governed by the law shown in the schedule, and the courts of that
      jurisdiction have exclusive jurisdiction over any dispute arising from it. Nothing in this
      clause removes any protection that the law of the country where you live gives you and that
      cannot be contracted out of.
    </p>`)}

    <div class="sig">
      <h2><span class="num">18.</span>Signatures</h2>
      <p>
        On the individual agreement — not on this specimen, which nobody signs — each party signs
        below.
      </p>
      <table>
        <tr>
          <td>
            <div class="line"></div>
            <div class="lab">For and on behalf of the Company</div>
            <div class="lab">Name: <span class="fill">[NAME]</span> &nbsp;·&nbsp; Date: <span class="fill">[DATE]</span></div>
          </td>
          <td>
            <div class="line"></div>
            <div class="lab">The Contractor</div>
            <div class="lab">Name: <span class="fill">[NAME]</span> &nbsp;·&nbsp; Date: <span class="fill">[DATE]</span></div>
          </td>
        </tr>
      </table>
    </div>

    <p class="end">
      End of specimen · This document is an example only and creates no rights or obligations.<br>
      Questions? Write to <strong>[RECRUITMENT EMAIL]</strong>.
    </p>
  </div>
</body></html>`;

const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
);
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="width:100%;padding:0 18mm;font:400 7.5pt Helvetica,Arial,sans-serif;color:#7373a0;
                display:flex;justify-content:space-between;">
      <span>SPECIMEN — example only, not a contract · Version ${VERSION}</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`,
  margin: { top: '18mm', bottom: '20mm', left: '18mm', right: '18mm' },
});
await browser.close();
console.log(`wrote ${OUT}`);
