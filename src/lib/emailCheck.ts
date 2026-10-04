/**
 * Email addresses that can never reach a real candidate.
 *
 * People testing the form type "test@example.com", and every email sent to an
 * address like that bounces. Bounces are what a mail provider judges a sender
 * by, so a handful of them costs every real candidate a little of their inbox.
 *
 * Pure module — no node built-ins — so the application form can say so while
 * the person is still typing, and the server can refuse the same addresses.
 * Whether the domain actually receives mail is a DNS question, asked on the
 * server only: see emailMx.ts.
 */

export type EmailProblem = "test" | "disposable" | "no_mail";

/** Said to the candidate, on the email field. */
export const EMAIL_PROBLEM_MESSAGE: Record<EmailProblem, string> = {
  test: "This looks like a test email. Please use your real one.",
  disposable: "Temporary emails can't be used. Please use your real one.",
  no_mail: "This email can't receive mail. Please check it.",
};

/**
 * Reserved for documentation and testing (RFC 2606 and RFC 6761): no mail is
 * ever delivered to them. Subdomains count too — "mail.example.com".
 */
const EXAMPLE_DOMAINS = ["example.com", "example.net", "example.org", "example.edu"];
const TEST_DOMAINS = ["test.com", "test.org", "test.net", "testing.com", "email.test"];
const TEST_TLDS = ["test", "example", "invalid", "localhost", "local"];

/**
 * Throwaway inboxes. They accept the mail, so nothing bounces — but nobody
 * applying for a job they want reads one a week later, and they are the usual
 * choice of somebody who only wants to see what the form does.
 */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "mailinator.net", "mailinator.org",
  "yopmail.com", "yopmail.fr", "yopmail.net",
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz",
  "guerrillamail.de", "guerrillamailblock.com", "sharklasers.com", "grr.la", "pokemail.net", "spam4.me",
  "10minutemail.com", "10minutemail.net", "10minutemail.co.uk", "10minemail.com",
  "temp-mail.org", "temp-mail.io", "tempmail.com", "tempmail.net", "tempmailo.com", "tempail.com",
  "tempr.email", "tempinbox.com", "tempmailaddress.com", "mytemp.email", "tmpmail.org", "tmpmail.net",
  "throwawaymail.com", "trashmail.com", "trashmail.de", "trashmail.net",
  "getnada.com", "nada.email", "maildrop.cc", "mailnesia.com", "mintemail.com", "mohmal.com",
  "dispostable.com", "discard.email", "fakeinbox.com", "fakemail.net", "emailfake.com", "generator.email",
  "emailondeck.com", "getairmail.com", "mailcatch.com", "moakt.com", "burnermail.io", "spambox.us",
  "mailpoof.com", "inboxkitten.com", "1secmail.com", "1secmail.org", "1secmail.net", "dropmail.me",
  "minuteinbox.com", "spamgourmet.com", "harakirimail.com", "crazymailing.com", "mailforspam.com",
  "jetable.org", "mail-temp.com", "linshiyouxiang.net", "emailtemp.org", "tempmail.plus",
]);

function domainOf(email: string): string {
  const at = email.trim().lastIndexOf("@");
  return at < 0 ? "" : email.trim().slice(at + 1).toLowerCase().replace(/\.$/, "");
}

const isOrUnder = (domain: string, root: string) => domain === root || domain.endsWith(`.${root}`);

/** True for example.com and its siblings — the domains the test suites write with. */
export function isExampleDomain(email: string): boolean {
  const domain = domainOf(email);
  return EXAMPLE_DOMAINS.some((d) => isOrUnder(domain, d));
}

/**
 * What is wrong with this address, judged from its domain alone.
 *
 * `allowExample` lets example.com through and nothing else. It exists for the
 * test environment, where every invented candidate lives at example.com and
 * mail goes to a stub rather than anywhere it could bounce.
 */
export function emailAddressProblem(
  email: string,
  opts: { allowExample?: boolean } = {},
): Exclude<EmailProblem, "no_mail"> | null {
  const domain = domainOf(email);
  if (!domain) return null;
  if (EXAMPLE_DOMAINS.some((d) => isOrUnder(domain, d))) return opts.allowExample ? null : "test";
  if (TEST_DOMAINS.some((d) => isOrUnder(domain, d))) return "test";
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  if (!domain.includes(".") || TEST_TLDS.includes(tld)) return "test";
  if ([...DISPOSABLE_DOMAINS].some((d) => isOrUnder(domain, d))) return "disposable";
  return null;
}

export { domainOf as emailDomain };
