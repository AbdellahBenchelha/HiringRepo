import Link from "next/link";
import { Icon } from "@/components/Icon";
import { formatLongDay } from "@/lib/teamShared";
import type { TeamMember } from "@/lib/teamStore";

/**
 * On every portal page until the account is active: bank details are needed
 * first, and when work starts. Says what it is waiting for — their details,
 * our check, or a corrected account after a refusal.
 */
export function ActivationBanner({ member, onBankPage }: { member: TeamMember; onBankPage?: boolean }) {
  if (member.status !== "active" || member.activatedAt) return null;
  const start = formatLongDay(member.firstWorkDay);
  const state = member.bankPending ? "checking" : member.bankRejected ? "refused" : "needed";

  return (
    <div
      role="status"
      data-activation-banner={state}
      className={`mb-6 flex flex-wrap items-center gap-4 rounded-2xl border-2 p-4 sm:p-5 ${
        state === "checking" ? "border-navy-200 bg-navy-50" : "border-amber-300 bg-amber-50"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          state === "checking" ? "bg-navy-100 text-navy-700" : "bg-amber-200 text-amber-900"
        }`}
      >
        <Icon name={state === "checking" ? "clock" : "wallet"} className="h-5 w-5" />
      </span>
      <div className="min-w-[13rem] flex-1 text-sm leading-relaxed text-navy-800">
        {state === "checking" ? (
          <>
            <p className="font-bold text-navy-900">Your bank details are being checked</p>
            <p>Your account becomes active as soon as we approve them. We will email you.</p>
          </>
        ) : state === "refused" ? (
          <>
            <p className="font-bold text-navy-900">Your bank details were not approved</p>
            <p>
              {member.bankRejected?.reason ? <>Reason: {member.bankRejected.reason}. </> : null}
              Please add them again — your account is activated once we approve them.
            </p>
          </>
        ) : (
          <>
            <p className="font-bold text-navy-900">Your account is not active yet</p>
            <p>
              Add your bank details to activate it. This is <strong>required</strong> before we can count your hours
              and pay you.
            </p>
          </>
        )}
        <p className="mt-1">
          Your work starts on <strong className="text-navy-900" data-start-date>{start}</strong>.
        </p>
      </div>
      {state !== "checking" && !onBankPage ? (
        <Link href="/bank" className="btn-primary w-full justify-center !px-5 !py-2.5 text-sm sm:w-auto" data-activation-add-bank>
          <Icon name="wallet" className="h-4 w-4" /> Add bank details
        </Link>
      ) : null}
    </div>
  );
}
