/**
 * The Social Security Number a US candidate gives when they accept an offer.
 *
 * The most sensitive single field this system holds, and the reason it is
 * asked as late as it is: an application is a stranger filling in a form, and
 * asking a stranger for their SSN to be considered for a job is both a thing
 * that costs real applicants — the careful ones walk away — and a liability
 * for every application that never goes anywhere. By the time an offer has
 * been made and accepted there is a reason to hold one.
 *
 * It is treated differently from everything else here on purpose:
 *
 *   * it is never put into a candidate's view object, so it does not travel to
 *     the browser with every row of a table that happens to list them;
 *   * it is fetched one candidate at a time, by a person who asked to see it;
 *   * it is not in the CSV export, it is not in any list, and it is not in the
 *     Telegram notifications;
 *   * the Admin Panel shows it hidden until somebody presses Show, so it is
 *     not sitting on screen during a shared call or over a shoulder.
 *
 * Pure module — no filesystem, no node built-ins — so the route, the view and
 * the panel agree on what counts as having one.
 */

/** "123-45-6789". Both forms that ask format as it is typed. */
export function isValidSsn(value: string): boolean {
  return /^\d{3}-\d{2}-\d{4}$/.test((value ?? "").trim());
}

/**
 * Anything that might carry one.
 *
 * Two places, because of when the question moved. It is now a field on the
 * candidate, written when they accept their offer. It used to be a field on
 * the application form, so it sits inside the application snapshot — a
 * `Record<string, unknown>` of whatever the form posted that day — for
 * everybody who applied before the change. Both are read, because the people
 * who already gave one should not have to give it again.
 */
export interface SsnCarrier {
  ssn?: string;
  application?: Record<string, unknown>;
}

function clean(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  return value ? value : undefined;
}

/** The SSN on a candidate, from wherever it was stored. */
export function ssnOf(candidate: SsnCarrier | undefined): string | undefined {
  return clean(candidate?.ssn) ?? clean(candidate?.application?.ssn);
}

export function hasSsn(candidate: SsnCarrier | undefined): boolean {
  return !!ssnOf(candidate);
}

/**
 * Is this somebody the SSN question applies to?
 *
 * US only. The panel uses this to decide whether the absence of a number is
 * worth saying out loud — it is useful about an American candidate and noise
 * about anybody else.
 *
 * Note this reads the country on the application, which is where the panel
 * has it. Someone who applies from one country and confirms another on
 * accepting will be asked based on what they confirm, which is the country the
 * agreement is drawn up for; the panel may briefly disagree, and the number
 * itself — present or absent — is the thing that settles it.
 */
export function ssnExpected(country: string | undefined): boolean {
  return (country ?? "").trim().toLowerCase() === "united states";
}
