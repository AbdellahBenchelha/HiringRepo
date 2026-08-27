import { Icon } from "@/components/Icon";
import { phoneCountryMismatch } from "@/lib/phoneCountry";

/**
 * Shown where a candidate's number belongs to a country other than the one
 * they selected.
 *
 * This is the signal the whole phone check exists for: a form says United
 * Kingdom while the number begins +234. It is worth a recruiter's attention
 * and nothing more — plenty of people live abroad on their old mobile, so it
 * is never grounds for a decision on its own. The identity photographs are.
 *
 * Renders nothing when the two agree, when there is no number, or when no
 * country has been stated — an incomplete record is not a contradiction.
 */
export function PhoneCountryFlag({
  country,
  phone,
}: {
  country?: string;
  phone?: string;
}) {
  const fromPhone = phoneCountryMismatch(country, phone);
  if (fromPhone.length === 0) return null;

  return (
    <span
      title={`This number's dialling code belongs to ${fromPhone.join(" or ")}, not ${country}`}
      className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
    >
      <Icon name="phone" className="h-3 w-3" />
      Phone: {fromPhone.join(" / ")}
    </span>
  );
}
