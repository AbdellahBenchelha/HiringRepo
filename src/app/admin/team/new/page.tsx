import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { getCandidate } from "@/lib/store";
import { getMemberByCandidate, listMembers } from "@/lib/teamStore";
import { teamMailDomain } from "@/lib/teamHost";
import { effectiveOffer } from "@/lib/offer";
import { COMPANY_TIME_ZONE, MAX_HOURS_PER_DAY, REQUIRED_DAYS } from "@/lib/availability";
import { defaultBanksFor, emailLocalPart, uniqueAddress } from "@/lib/teamShared";
import { localDate } from "@/lib/teamHours";
import { AdminShell } from "@/components/admin/AdminShell";
import { MemberForm, type MemberFormValues } from "@/components/admin/team/MemberForm";

export const metadata: Metadata = { title: "Add team member", robots: { index: false, follow: false } };

/**
 * Add someone to the team. From the Accepted tab this arrives with
 * ?candidate=, and everything the offer settled is filled in: their schedule
 * and timezone, the hours (weekly hours spread over their five days), the
 * rate if it was hourly in dollars, and the start date.
 */
export default async function AdminTeamNewPage({
  searchParams,
}: {
  searchParams: Promise<{ candidate?: string; from?: string }>;
}) {
  await requireAdmin();
  const { candidate: candidateId, from } = await searchParams;
  const c = candidateId ? await getCandidate(candidateId) : null;
  if (c) {
    const existing = await getMemberByCandidate(c.id);
    if (existing) redirect(`/admin/team/${existing.id}`);
  }

  const offer = c?.offer ? effectiveOffer(c.offer) : undefined;
  const d = c?.confirmedDetails;
  const country = d?.country || c?.country || "";
  const days = c?.availability?.days?.length ? c.availability.days : (["Mon", "Tue", "Wed", "Thu", "Fri"] as MemberFormValues["days"]);
  const perDay = offer?.hoursPerWeek ? Math.min(MAX_HOURS_PER_DAY, Math.round((offer.hoursPerWeek / (days.length || REQUIRED_DAYS)) * 4) / 4) : MAX_HOURS_PER_DAY;
  const hourlyUsd = offer && offer.unit === "HOUR" && offer.currency === "USD" ? offer.rate : 0;
  const timeZone = c?.availability?.timeZone || COMPANY_TIME_ZONE;

  // firstname.lastname@workroute.team, with a number added if it is taken.
  const first = d?.firstName ?? c?.firstName ?? "";
  const last = d?.lastName ?? c?.lastName ?? "";
  const local = c ? emailLocalPart(first, last) : null;
  const taken = (await listMembers()).map((m) => m.workEmail ?? "").filter(Boolean);
  const workEmail = local ? uniqueAddress(local, teamMailDomain(), taken) : "";

  const initial: MemberFormValues = {
    candidateId: c?.id,
    fullName: c ? `${d?.firstName ?? c.firstName ?? ""} ${d?.lastName ?? c.lastName ?? ""}`.trim() || c.fullName : "",
    loginEmail: c?.email ?? "",
    personalPhone: d?.phone || c?.phone || "",
    country,
    position: offer?.position || c?.position || "",
    workEmail,
    phoneNumber: "",
    days,
    startTime: c?.availability?.startTime || "09:00",
    timeZone,
    hoursPerDay: perDay,
    rate: hourlyUsd,
    // The agreement's start date, when one was set for it, is the one they signed.
    firstWorkDay: c?.agreementStartDate || offer?.startDate || localDate(timeZone),
    checkInRequired: false,
    allowedBanks: defaultBanksFor(country),
    notes: "",
  };

  return (
    <AdminShell>
      <header className="mb-6">
        <p className="text-sm">
          <Link href="/admin/team" className="font-semibold text-navy-500 hover:text-navy-900">
            ← Team
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">Add to the team</h1>
        <p className="mt-1 text-sm text-navy-500">
          {c
            ? "Filled in from their accepted offer. Check it, add their work email and number if you have them, and save."
            : "Someone who is not in the Candidates list. Fill in their details."}
        </p>
        {offer && !hourlyUsd ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Their offer is not an hourly rate in US dollars, so the rate is not filled in. Enter the hourly rate in dollars.
          </p>
        ) : null}
      </header>
      <div className="card">
        <MemberForm mode="new" initial={initial} fromChat={from === "chat"} />
      </div>
    </AdminShell>
  );
}
