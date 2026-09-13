/**
 * The Social Security Number a US applicant gives on the application form.
 *
 * The most sensitive single field this system holds. It is collected because
 * US engagements need it, and it is treated differently from everything else
 * here on purpose:
 *
 *   * it is never put into a candidate's view object, so it does not travel to
 *     the browser with every row of a table that happens to list them;
 *   * it is fetched one candidate at a time, by a person who asked to see it;
 *   * it is not in the CSV export, and it is not in any list;
 *   * the Admin Panel shows it hidden until somebody presses Show, so it is
 *     not sitting on screen during a shared call or over a shoulder.
 *
 * Pure module — no filesystem, no node built-ins — so the route, the view and
 * the panel agree on what counts as having one.
 */

/** "123-45-6789". The application form formats as it is typed. */
export function isValidSsn(value: string): boolean {
  return /^\d{3}-\d{2}-\d{4}$/.test((value ?? "").trim());
}

/**
 * The SSN on a raw application snapshot, if there is one.
 *
 * The snapshot is `Record<string, unknown>` — whatever the form posted on the
 * day — so this is the one place that knows the key and checks the shape.
 */
export function ssnOf(application: Record<string, unknown> | undefined): string | undefined {
  const raw = application?.ssn;
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  return value ? value : undefined;
}

export function hasSsn(application: Record<string, unknown> | undefined): boolean {
  return !!ssnOf(application);
}

/**
 * Is this somebody the SSN question was asked of?
 *
 * The form asks US applicants only. The panel uses this to decide whether the
 * absence of a number is worth saying out loud — "not provided" is useful
 * about an American applicant and noise about anybody else.
 */
export function ssnExpected(country: string | undefined): boolean {
  return (country ?? "").trim().toLowerCase() === "united states";
}
