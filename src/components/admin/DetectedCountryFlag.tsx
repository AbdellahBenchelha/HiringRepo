import { Icon } from "@/components/Icon";
import { countryMatch } from "@/lib/countryCheck";

/**
 * Shown where a candidate applied from somewhere other than the country they
 * selected on the form.
 *
 * The country comes from the address the server saw when the application
 * arrived, so unlike the dropdown it is not something the candidate types. It
 * is still only a prompt to look closer: a VPN defeats it outright, and
 * expats, travellers and corporate networks produce honest mismatches every
 * day. Never grounds for a decision on its own — the identity photographs are.
 *
 * Renders nothing when the two agree, and nothing when either is missing. An
 * incomplete record is not a contradiction.
 */
export function DetectedCountryFlag({
  country,
  detectedCountryName,
}: {
  country?: string;
  detectedCountryName?: string;
}) {
  if (countryMatch({ country, detectedCountryName }) !== "mismatch") return null;

  return (
    <span
      title={`This application was sent from ${detectedCountryName}, not ${country}. A VPN or a trip abroad explains it just as well as anything else — check, don't assume.`}
      className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
    >
      <Icon name="globe" className="h-3 w-3" />
      Sent from {detectedCountryName}
    </span>
  );
}
