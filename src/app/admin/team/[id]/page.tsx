import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  accrueMember,
  currentRate,
  getMember,
  getTeamSettings,
  getWork,
  listPhoneMessages,
  listTickets,
  ticketUnread,
} from "@/lib/teamStore";
import { localDate, totals } from "@/lib/teamHours";
import { bankView, onboardingState } from "@/lib/teamView";
import {
  BANKS,
  MEMBER_STATUSES,
  MEMBER_STATUS_LABEL,
  ONBOARDING_LABEL,
  ONBOARDING_STEPS,
  formatDateTime,
  formatDay,
  formatUsd,
} from "@/lib/teamShared";
import { formatAvailability, windowInCompanyTime } from "@/lib/availability";
import { teamPortalUrl } from "@/lib/teamHost";
import { siteConfig } from "@/config/site";
import { bankCryptoReady } from "@/lib/teamCrypto";
import { MemberForm } from "@/components/admin/team/MemberForm";
import { AdminAction, AdminDelete, AdminForm } from "@/components/admin/team/AdminAction";
import { BankReveal } from "@/components/admin/team/BankReveal";
import { PasswordReveal } from "@/components/admin/team/PasswordReveal";
import { EntryRow } from "@/components/admin/team/EntryRow";
import { DocumentUpload } from "@/components/admin/team/DocumentUpload";
import { TicketForm } from "@/components/team/TicketForm";
import { MailList } from "@/components/team/MailList";
import { listMail } from "@/lib/teamMail";
import { Empty, PriorityLabel, Section, Stat, TicketStatusPill } from "@/components/team/ui";

export const metadata: Metadata = { title: "Team member", robots: { index: false, follow: false } };

const TABS = [
  { id: "profile", label: "Profile & access" },
  { id: "hours", label: "Hours & pay" },
  { id: "bank", label: "Bank" },
  { id: "phone", label: "Phone" },
  { id: "tickets", label: "Tickets" },
  { id: "documents", label: "Documents" },
  { id: "mail", label: "Mail" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default async function AdminTeamMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : "profile";
  await accrueMember(id);
  const m = await getMember(id);
  if (!m) notFound();

  const [work, settings, tickets, phone, mail] = await Promise.all([
    getWork(id),
    getTeamSettings(),
    listTickets({ memberId: id }),
    listPhoneMessages(id),
    listMail(id),
  ]);
  const t = totals(work.entries, work.adjustments, work.payments);
  const today = localDate(m.schedule.timeZone);
  const steps = onboardingState(m, settings);
  const current = bankView(m.bank);
  const pending = bankView(m.bankPending);
  const unread = tickets.filter((x) => ticketUnread(x, "admin")).length;
  const api = `/api/admin/team/members/${id}`;
  const hiringAdmin = (process.env.PUBLIC_BASE_URL || siteConfig.url).replace(/\/$/, "");

  return (
    <AdminShell>
      <header className="mb-6">
        <p className="text-sm">
          <Link href="/admin/team" className="font-semibold text-navy-500 hover:text-navy-900">
            ← Team
          </Link>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">{m.fullName}</h1>
          <span
            data-member-status={m.status}
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              m.status === "active" ? "bg-green-100 text-green-800" : m.status === "paused" ? "bg-amber-100 text-amber-900" : "bg-navy-100 text-navy-600"
            }`}
          >
            {MEMBER_STATUS_LABEL[m.status]}
          </span>
          {m.candidateId ? (
            <a href={`${hiringAdmin}/admin/accepted`} className="text-xs font-semibold text-navy-500 hover:underline">
              From Accepted (hiring panel)
            </a>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-navy-500">
          {m.loginEmail} · {m.position || "No position"} · {formatAvailability(m.schedule)} (UK {windowInCompanyTime(m.schedule)})
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Rate" value={`${formatUsd(currentRate(m))}/h`} hint={`${m.hoursPerDay} h per work day`} />
        <Stat label="Hours" value={`${t.hours} h`} />
        <Stat label="Earned" value={formatUsd(t.earned + t.adjustments)} hint={t.adjustments ? `incl. ${formatUsd(t.adjustments)} bonus/deduction` : undefined} />
        <Stat label="Paid" value={formatUsd(t.paid)} />
        <Stat label="Balance" value={formatUsd(t.balance)} strong />
      </div>

      <nav className="mb-6 flex flex-wrap gap-1 border-b border-navy-100" aria-label="Member sections">
        {TABS.map((x) => (
          <Link
            key={x.id}
            href={`/admin/team/${id}?tab=${x.id}`}
            aria-current={x.id === tab ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${
              x.id === tab ? "border-brand-500 text-navy-900" : "border-transparent text-navy-500 hover:text-navy-900"
            }`}
          >
            {x.label}
            {x.id === "bank" && pending ? <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">!</span> : null}
            {x.id === "tickets" && unread ? <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{unread}</span> : null}
          </Link>
        ))}
      </nav>

      {tab === "profile" ? (
        <div className="space-y-6">
          <Section title="Access">
            <div className="flex flex-wrap items-center gap-2">
              {MEMBER_STATUSES.filter((s) => s !== m.status).map((s) => (
                <AdminAction
                  key={s}
                  url={api}
                  body={{ action: "status", status: s }}
                  confirm={
                    s === "left"
                      ? "Mark as left? They lose access to the portal at once and no more days are added."
                      : s === "paused"
                        ? "Pause? No work days are added while paused."
                        : "Make active again? Days are counted from today."
                  }
                >
                  {s === "active" ? "Make active" : s === "paused" ? "Pause" : "Mark as left"}
                </AdminAction>
              ))}
              <AdminAction
                url={api}
                body={{ action: "invite" }}
                confirm={`Send login details (a new temporary password) to ${m.loginEmail}?`}
              >
                {m.invitedAt ? "Send login details again" : "Send login details"}
              </AdminAction>
              <AdminAction url={api} body={{ action: "signout" }} confirm="Sign them out of every device?">
                Sign out of every device
              </AdminAction>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-navy-400">Invitation</dt>
                <dd>{m.invitedAt ? `${formatDateTime(m.invitedAt)} (${m.inviteCount ?? 1}×)` : "Not sent"}</dd>
              </div>
              <div>
                <dt className="text-navy-400">First sign-in</dt>
                <dd>{m.firstSignInAt ? formatDateTime(m.firstSignInAt) : "Never"}</dd>
              </div>
              <div>
                <dt className="text-navy-400">Portal</dt>
                <dd>
                  <a href={teamPortalUrl()} className="link" target="_blank" rel="noopener noreferrer">
                    {teamPortalUrl().replace(/^https?:\/\//, "")}
                  </a>
                </dd>
              </div>
            </dl>
          </Section>

          <Section title="Password">
            {m.workEmail ? (
              m.password ? (
                <>
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-navy-400">Sign-in email</dt>
                      <dd className="font-semibold text-navy-900">{m.workEmail}</dd>
                    </div>
                    <div>
                      <dt className="text-navy-400">Password</dt>
                      <dd>
                        <PasswordReveal memberId={id} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-navy-400">State</dt>
                      <dd className="font-semibold text-navy-900">
                        {m.mustChangePassword ? "Temporary — not yet changed" : "Chosen by the member"}
                      </dd>
                    </div>
                  </dl>
                  {(m.passwordViews ?? []).length ? (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer font-semibold text-navy-600">
                        Password viewed {m.passwordViews!.length}×
                      </summary>
                      <ul className="mt-2 space-y-1 text-navy-500" data-password-views>
                        {m.passwordViews!.slice(0, 20).map((v) => (
                          <li key={`${v.at}-${v.by}`}>
                            {formatDateTime(v.at)} — {v.by}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  <p className="mt-3 text-xs text-navy-400">
                    If the member forgets their password, press Show and send it to them. Press “Send login details
                    again” above to give them a new temporary one instead.
                  </p>
                </>
              ) : (
                <p className="text-sm text-navy-500">
                  No password yet. Press <strong>Send login details</strong> above to email them their email and a
                  temporary password.
                </p>
              )
            ) : (
              <p className="text-sm text-navy-500">
                Add a professional email in <strong>Details</strong> below, then send their login details.
              </p>
            )}
          </Section>

          <Section title="Getting started">
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {ONBOARDING_STEPS.filter((s) => steps[s] !== "skip").map((s) => (
                <li key={s} className="flex items-center gap-2" data-admin-step={s} data-state={steps[s]}>
                  <span className={`h-2.5 w-2.5 rounded-full ${steps[s] === "done" ? "bg-green-600" : steps[s] === "waiting" ? "bg-navy-200" : "bg-amber-500"}`} />
                  {ONBOARDING_LABEL[s]}
                  <span className="text-xs text-navy-400">
                    {steps[s] === "done" ? "done" : steps[s] === "waiting" ? "add their work email first" : "not yet"}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Details">
            <MemberForm
              mode="edit"
              memberId={id}
              initial={{
                fullName: m.fullName,
                loginEmail: m.loginEmail,
                personalPhone: m.personalPhone ?? "",
                country: m.country ?? "",
                position: m.position ?? "",
                workEmail: m.workEmail ?? "",
                phoneNumber: m.phoneNumber ?? "",
                days: m.schedule.days,
                startTime: m.schedule.startTime,
                timeZone: m.schedule.timeZone,
                hoursPerDay: m.hoursPerDay,
                rate: currentRate(m),
                firstWorkDay: m.firstWorkDay,
                checkInRequired: m.checkInRequired,
                allowedBanks: m.allowedBanks,
                notes: m.notes ?? "",
              }}
            />
          </Section>

          <Section title="Sign-ins">
            {(m.signIns ?? []).length ? (
              <ul className="divide-y divide-navy-100 text-sm">
                {(m.signIns ?? []).map((s) => (
                  <li key={s.at} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>{s.device}</span>
                    <span className="text-navy-500">
                      {formatDateTime(s.at)} · IP {s.ip}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No sign-ins yet.</Empty>
            )}
          </Section>
        </div>
      ) : null}

      {tab === "hours" ? (
        <div className="space-y-6">
          <Section title="Rate">
            <p className="mb-3 text-sm text-navy-600">
              Rate history:{" "}
              {m.rates.map((r) => `${formatUsd(r.rate)}/h from ${formatDay(r.from)}`).join(" · ")}. A new rate applies from the day you choose; days before keep their rate.
            </p>
            <AdminForm
              url={api}
              body={{ action: "rate" }}
              submit="Set new rate"
              fields={[
                { name: "rate", label: "New rate (US$ / hour)", type: "number", step: "0.01" },
                { name: "from", label: "From", type: "date", defaultValue: today },
              ]}
            />
          </Section>

          <Section title="Work days">
            <p className="mb-3 text-xs text-navy-500">
              Added automatically when each work window ends{m.checkInRequired ? " (only with a check-in)" : ""}. Counted up to{" "}
              {m.accruedThrough ? formatDay(m.accruedThrough) : "— nothing yet"}.
            </p>
            {work.entries.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm" data-admin-entries>
                  <thead className="text-xs text-navy-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Hours</th>
                      <th className="px-3 py-2 text-right font-medium">Rate</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {work.entries.slice(0, 120).map((e) => (
                      <EntryRow key={e.id} e={e} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No work days yet. The first is added when the window ends on {formatDay(m.firstWorkDay)}.</Empty>
            )}
            <h3 className="mb-2 mt-6 text-sm font-bold text-navy-900">Add extra hours</h3>
            <AdminForm
              url="/api/admin/team/work"
              body={{ action: "add_entry", memberId: id }}
              submit="Add hours"
              fields={[
                { name: "date", label: "Day", type: "date", defaultValue: today },
                { name: "hours", label: "Hours", type: "number", step: "0.25" },
                { name: "note", label: "Note (shown to them)", placeholder: "e.g. weekend cover" },
              ]}
            />
          </Section>

          <Section title="Bonuses & deductions">
            {work.adjustments.length ? (
              <ul className="mb-4 divide-y divide-navy-100 text-sm">
                {work.adjustments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      {formatDay(a.date)} · {a.reason} <span className="text-xs text-navy-400">by {a.by}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <strong className={a.amount < 0 ? "text-red-700" : "text-green-700"}>{formatUsd(a.amount)}</strong>
                      <AdminAction
                        url="/api/admin/team/work"
                        body={{ action: "delete_adjustment", id: a.id }}
                        confirm="Delete this bonus/deduction?"
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Delete
                      </AdminAction>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <AdminForm
              url="/api/admin/team/work"
              body={{ action: "add_adjustment", memberId: id }}
              submit="Add"
              fields={[
                { name: "date", label: "Day", type: "date", defaultValue: today },
                { name: "amount", label: "Amount US$ (minus for a deduction)", type: "number", step: "0.01" },
                { name: "reason", label: "Reason (shown to them)", placeholder: "e.g. Great week" },
              ]}
            />
          </Section>

          <Section title="Payments">
            {work.payments.length ? (
              <ul className="mb-4 divide-y divide-navy-100 text-sm">
                {work.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      {formatDay(p.date)} · {[p.sentTo, p.reference].filter(Boolean).join(" · ") || "Payment"}{" "}
                      <span className="text-xs text-navy-400">by {p.by}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <strong>{formatUsd(p.amount)}</strong>
                      <AdminAction
                        url="/api/admin/team/work"
                        body={{ action: "delete_payment", id: p.id }}
                        confirm="Delete this payment record? (No email is sent.)"
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Delete
                      </AdminAction>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {!current ? <p className="mb-3 text-sm text-amber-800">No approved bank account yet.</p> : null}
            <AdminForm
              url="/api/admin/team/work"
              body={{ action: "add_payment", memberId: id }}
              submit="Record payment"
              done="Payment recorded."
              fields={[
                { name: "date", label: "Paid on", type: "date", defaultValue: today },
                { name: "amount", label: "Amount US$", type: "number", step: "0.01", defaultValue: t.balance > 0 ? t.balance : undefined },
                { name: "reference", label: "Reference (optional)" },
                { name: "email", label: "Email them that it was sent", type: "checkbox", defaultValue: true },
              ]}
            />
          </Section>

          <Section title="Days off">
            {work.dayOffs.length ? (
              <ul className="divide-y divide-navy-100 text-sm" data-admin-dayoffs>
                {work.dayOffs.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <strong>{formatDay(d.date)}</strong> {d.reason ? `· ${d.reason}` : ""}
                      <span className="block text-xs text-navy-400">Asked {formatDateTime(d.requestedAt)}</span>
                    </span>
                    {d.status === "pending" ? (
                      <span className="flex gap-2">
                        <AdminAction url="/api/admin/team/work" body={{ action: "decide_dayoff", id: d.id, approve: true }}>
                          Approve
                        </AdminAction>
                        <AdminAction url="/api/admin/team/work" body={{ action: "decide_dayoff", id: d.id, approve: false }} ask="A note for them (optional):" askField="note">
                          Refuse
                        </AdminAction>
                      </span>
                    ) : (
                      <span className={`text-xs font-semibold ${d.status === "approved" ? "text-green-700" : "text-red-700"}`}>
                        {d.status === "approved" ? "Approved" : "Refused"} by {d.decidedBy}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No day-off requests.</Empty>
            )}
          </Section>
        </div>
      ) : null}

      {tab === "bank" ? (
        <div className="space-y-6">
          {!bankCryptoReady() ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">TEAM_BANK_KEY is not set — bank details cannot be saved or read.</p>
          ) : null}
          <Section title="Allowed banks">
            <p className="text-sm text-navy-700">{m.allowedBanks.map((b) => BANKS[b].label).join(", ")} — change them under Profile & access → Details.</p>
          </Section>
          {pending ? (
            <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5" data-admin-bank-pending>
              <h2 className="font-display text-lg font-extrabold text-navy-900">Waiting for your approval</h2>
              <p className="mt-1 text-sm text-amber-900">
                Sent {formatDateTime(pending.submittedAt)}. {current ? "This replaces their approved account — check it with them before approving." : "Their first account."}
              </p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-navy-500">Bank</dt>
                  <dd className="font-semibold">{pending.bankLabel}</dd>
                </div>
                <div>
                  <dt className="text-navy-500">Holder</dt>
                  <dd className="font-semibold">{pending.holder}</dd>
                </div>
                <div>
                  <dt className="text-navy-500">IBAN</dt>
                  <dd>
                    <BankReveal memberId={id} which="pending" masked={pending.masked} />
                  </dd>
                </div>
                <div>
                  <dt className="text-navy-500">BIC</dt>
                  <dd className="font-mono font-semibold">{pending.bic}</dd>
                </div>
              </dl>
              {pending.holder.trim().toLowerCase() !== m.fullName.trim().toLowerCase() ? (
                <p className="mt-3 text-sm font-semibold text-amber-900">⚠ The holder name is not the same as the member&rsquo;s name ({m.fullName}).</p>
              ) : null}
              <div className="mt-4 flex gap-2">
                <AdminAction url={api} body={{ action: "bank_decide", approve: true }} className="btn-primary py-2" confirm="Approve this account? Payments will go to it.">
                  Approve
                </AdminAction>
                <AdminAction url={api} body={{ action: "bank_decide", approve: false }} ask="Why? The member will see this:" className="btn-secondary py-2">
                  Refuse
                </AdminAction>
              </div>
            </section>
          ) : null}
          <Section title="Account for payments">
            {current ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-4" data-admin-bank-current>
                <div>
                  <dt className="text-navy-400">Bank</dt>
                  <dd className="font-semibold">{current.bankLabel}</dd>
                </div>
                <div>
                  <dt className="text-navy-400">Holder</dt>
                  <dd className="font-semibold">{current.holder}</dd>
                </div>
                <div>
                  <dt className="text-navy-400">IBAN</dt>
                  <dd>
                    <BankReveal memberId={id} which="current" masked={current.masked} />
                  </dd>
                </div>
                <div>
                  <dt className="text-navy-400">BIC</dt>
                  <dd className="font-mono font-semibold">{current.bic}</dd>
                </div>
                <div className="sm:col-span-4 text-xs text-navy-400">
                  Approved {current.approvedAt ? formatDateTime(current.approvedAt) : ""} by {current.approvedBy}
                </div>
              </dl>
            ) : (
              <Empty>No approved account yet.</Empty>
            )}
            {m.bankRejected ? (
              <p className="mt-3 text-sm text-red-700">
                Last refused {formatDateTime(m.bankRejected.at)} by {m.bankRejected.by}: {m.bankRejected.reason}
              </p>
            ) : null}
          </Section>
          <Section title="Who has seen the full IBAN">
            {(m.bankViews ?? []).length ? (
              <ul className="text-sm text-navy-600">
                {(m.bankViews ?? []).slice(0, 20).map((v) => (
                  <li key={v.at}>
                    {formatDateTime(v.at)} — {v.by}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Nobody yet.</Empty>
            )}
          </Section>
        </div>
      ) : null}

      {tab === "phone" ? (
        <div className="space-y-6">
          <Section title={m.phoneNumber ? `Send a message to ${m.phoneNumber}` : "No work number yet"}>
            {m.phoneNumber ? (
              <AdminForm
                url="/api/admin/team/phone"
                body={{ memberId: id }}
                submit="Send to their inbox"
                done="Sent. They get an email that a message arrived."
                fields={[
                  { name: "sender", label: "From", placeholder: "e.g. Amazon, or +1 555…" },
                  { name: "body", label: "Message", type: "textarea" },
                ]}
              />
            ) : (
              <p className="text-sm text-navy-500">Add their work phone number under Profile & access → Details first.</p>
            )}
          </Section>
          <Section title="Messages sent">
            {phone.length ? (
              <ul className="divide-y divide-navy-100 text-sm" data-admin-phone>
                {phone.map((p) => (
                  <li key={p.id} className="py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{p.sender}</strong>
                      <span className="text-xs text-navy-400">
                        {formatDateTime(p.at)} · by {p.by} · {p.readAt ? `read ${formatDateTime(p.readAt)}` : "not read yet"}
                      </span>
                      <span className="ml-auto">
                        <AdminDelete url={`/api/admin/team/phone?id=${p.id}`} confirm="Delete this message from their inbox?" />
                      </span>
                    </div>
                    <p className="whitespace-pre-line text-navy-700">{p.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No messages yet.</Empty>
            )}
          </Section>
        </div>
      ) : null}

      {tab === "tickets" ? (
        <div className="space-y-6">
          <Section title="Their tickets">
            {tickets.length ? (
              <ul className="divide-y divide-navy-100 text-sm">
                {tickets.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-2 py-2">
                    <Link href={`/admin/team-tickets/${x.id}`} className="font-semibold text-navy-900 hover:underline">
                      #{x.number} {x.subject}
                    </Link>
                    <TicketStatusPill status={x.status} />
                    <PriorityLabel priority={x.priority} />
                    {ticketUnread(x, "admin") ? <span className="rounded-full bg-red-600 px-2 text-[11px] font-bold text-white">New reply</span> : null}
                    <span className="ml-auto text-xs text-navy-400">{formatDateTime(x.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No tickets yet.</Empty>
            )}
          </Section>
          <Section title="Send a new ticket">
            <TicketForm url="/api/admin/team/tickets" side="admin" mode="new" memberIds={[id]} after="/admin/team-tickets" />
          </Section>
        </div>
      ) : null}

      {tab === "mail" ? (
        <div className="space-y-6">
          <p className="rounded-xl border border-navy-100 bg-navy-50 p-3 text-sm text-navy-700">
            Read-only. Every email you open here is recorded below, with your name and the time.
            {m.workEmail ? (
              <>
                {" "}Address: <strong>{m.workEmail}</strong>.
              </>
            ) : (
              " This member has no professional email yet — add one under Profile & access → Details."
            )}
          </p>
          <Section title={`Inbox (${mail.filter((x) => x.folder === "inbox").length})`}>
            <MailList
              messages={mail.filter((x) => x.folder === "inbox").slice(0, 200)}
              hrefFor={(x) => `/admin/team/${id}/mail/${x.id}`}
              empty="No email received yet."
            />
          </Section>
          <Section title={`Sent (${mail.filter((x) => x.folder === "sent").length})`}>
            <MailList
              messages={mail.filter((x) => x.folder === "sent").slice(0, 200)}
              hrefFor={(x) => `/admin/team/${id}/mail/${x.id}`}
              empty="No email sent yet."
            />
          </Section>
          <Section title="Emails opened by the team admin">
            {(m.mailViews ?? []).length ? (
              <ul className="text-sm text-navy-600" data-mail-views>
                {(m.mailViews ?? []).slice(0, 50).map((v) => (
                  <li key={`${v.at}-${v.mailId}`}>
                    {formatDateTime(v.at)} — {v.by} opened “{v.subject}”
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>None yet.</Empty>
            )}
          </Section>
        </div>
      ) : null}

      {tab === "documents" ? (
        <div className="space-y-6">
          <Section title="Share a document">
            <DocumentUpload memberId={id} />
          </Section>
          <Section title="Shared documents">
            {(m.documents ?? []).length ? (
              <ul className="divide-y divide-navy-100 text-sm">
                {(m.documents ?? []).map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <a href={`/api/admin/team/files?key=${encodeURIComponent(d.key)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-navy-900 hover:underline">
                      {d.name}
                    </a>
                    <span className="flex items-center gap-3 text-xs text-navy-400">
                      {formatDateTime(d.at)} · {d.by}
                      <AdminDelete url={`${api}/documents?doc=${d.id}`} confirm="Remove this document from their portal?" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Nothing shared yet. Their monthly statements and offer summary are made automatically.</Empty>
            )}
          </Section>
        </div>
      ) : null}
    </AdminShell>
  );
}
