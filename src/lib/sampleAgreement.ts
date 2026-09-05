/**
 * The specimen contractor agreement, if one has been published.
 *
 * Pure, and shared by the offer page and the offer email so they cannot
 * disagree about whether there is a document or where it lives. Three
 * candidates in a row asked to see the terms before committing — one of them
 * declined to give her passport number until she had — so this exists to
 * answer that before it is asked.
 *
 * Returns null when nothing is configured, and every caller renders nothing in
 * that case. A link to a file that is not there would be worse than silence:
 * to someone weighing up whether a remote offer is genuine, a broken link is
 * evidence against you.
 */
import { siteConfig } from "@/config/site";

export interface SampleAgreement {
  /** Absolute URL, because it is used in email as well as on the page. */
  url: string;
  /** Printed beside the link, so it is clear which revision was read. */
  version: string;
}

export function sampleAgreement(baseUrl: string): SampleAgreement | null {
  const file = siteConfig.sampleAgreement.file.trim().replace(/^\/+/, "");
  if (!file) return null;
  return {
    url: `${baseUrl.replace(/\/$/, "")}/${file}`,
    version: siteConfig.sampleAgreement.version.trim(),
  };
}
