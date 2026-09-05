# Job offer email — template

The email that carries the offer. It links to the specimen contract so the
candidate can read the terms **before** they accept.

Replace every `[PLACEHOLDER]`. Keep the sample-contract paragraph: it is the
part that gives the candidate a real chance to read the terms in advance.

- Link (recommended): `https://[YOUR DOMAIN]/sample-contract`
- Attachment (optional, for candidates with poor connectivity): attach
  `public/documents/sample-employment-contract-specimen-v2026-01.pdf`

A link is preferred over an attachment alone: the document can be corrected or
re-versioned without re-sending offers, and large attachments are more likely to
be blocked or truncated by mail providers.

---

**Subject:** Your job offer from NexaCare Support Solutions — [JOB TITLE]

Dear [FIRST NAME],

Thank you for the time you have given us throughout the process. We are pleased
to offer you the position of **[JOB TITLE]** at NexaCare Support Solutions.

The main terms of the offer are:

- **Position:** [JOB TITLE], reporting to [MANAGER NAME / ROLE]
- **Start date:** [START DATE]
- **Place of work:** [SITE / ON-SITE, HYBRID OR REMOTE]
- **Working hours:** [HOURS PER WEEK], [SHIFT PATTERN]
- **Gross pay:** [AMOUNT AND CURRENCY] per [MONTH / HOUR / YEAR]
- **Contract type:** [PERMANENT / FIXED-TERM], with a [LENGTH] probationary period

**Read our contract before you decide.** So that nothing in the paperwork comes
as a surprise, you can read a sample of our employment contract here:

  https://[YOUR DOMAIN]/sample-contract

It is an example document: personal details such as your salary and start date
are left blank, and it is not itself an offer or an agreement. This letter and
the contract you are given to sign are the documents that count. If the sample
and this letter differ on any point, this letter is correct — and please tell us,
so we can fix the sample.

Please let us know your decision by **[DEADLINE DATE]**. If you need more time,
just ask.

If anything in the contract or in this offer is unclear, reply to this email or
contact me directly at [RECRUITER EMAIL] / [RECRUITER PHONE]. Questions are
welcome and will not affect the offer in any way.

We would be very glad to have you on the team.

Kind regards,

[RECRUITER NAME]
[POSITION], NexaCare Support Solutions
[EMAIL] · [PHONE]

---

## Notes for recruiters

1. **Never edit the PDF by hand.** The text lives in
   `docs/contracts/sample-employment-contract.md`. Edit it, run
   `npm run build:contract`, and the PDF is rebuilt with the version and date in
   its footer.
2. **Bump the version** in `src/config/contract-document.json` whenever the text
   changes, so candidates and recruiters can tell two copies apart.
3. **Send the template that matches the offer.** The current specimen covers
   permanent full-time roles. A fixed-term or part-time offer needs its own
   specimen — do not send this one with a note explaining the differences.
4. **Do not publish the link** on the website, in job adverts, or on social
   media. The page is unlisted and excluded from search engines on purpose.
5. **Log the questions candidates ask.** Recurring questions usually mean a
   clause is unclear and should be reworded in the source document.
