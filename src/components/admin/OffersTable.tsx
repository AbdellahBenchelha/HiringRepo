"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { VerificationBadge } from "@/components/admin/VerificationPanel";
import { CandidateProfileModal } from "@/components/admin/CandidateProfileModal";
import { DocumentViewer } from "@/components/admin/DocumentViewer";
import { DeleteCandidateButton } from "@/components/admin/DeleteCandidateButton";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { useProfileNav } from "@/components/admin/useProfileNav";
import { PhoneCountryFlag } from "@/components/admin/PhoneCountryFlag";
import { Pagination, DEFAULT_PAGE_SIZE } from "@/components/admin/Pagination";
import {
  HideCountryPicker,
  HiddenCountryChips,
  useHiddenCountries,
} from "@/components/admin/HiddenCountries";
import { adminPost } from "@/lib/adminClient";
import { offerAwaitingReply, replyOverdue } from "@/lib/offerReminder";
import { useBulkEmail } from "@/components/admin/BulkEmailBar";
import { OFFER_ACTIONS } from "@/lib/bulkEmail";
import type { CandidateDocument } from "@/lib/documents";
import type { CandidateStatus } from "@/lib/candidateStatus";
import type { CandidateView } from "@/lib/candidateView";

/**
 * Offers that did not become a hire: no answer yet, or a no.
 *
 * Kept apart from the Interviews tab, which is where an offer is decided on
 * and sent, because this is the question afterwards — who has not replied, and
 * who has been chased about it. On a tab holding everybody past an interview
 * those rows are a handful among many, and the ones going quietly cold are
 * exactly the rows that get scrolled past.
 *
 * Silence and a decline sit together on purpose. They are the same question
 * answered and unanswered, and a decline is worth having beside the silence
 * rather than filed somewhere else — it is often the answer to "why did we
 * stop chasing this one".
 */

const HIDDEN_COUNTRIES_KEY = "wr.offers.hiddenCountries";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function daysSince(iso?: string, now: number = Date.now()): number {
  if (!iso) return 0;
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.floor((now - at) / 86400_000));
}

type Answer = "all" | "waiting" | "declined";
type Chased = "all" | "yes" | "no";

export function OffersTable({ rows }: { rows: CandidateView[] }) {
  const [search, setSearch] = useState("");
  const [answer, setAnswer] = useState<Answer>("all");
  const [chased, setChased] = useState<Chased>("all");
  const [country, setCountry] = useState("all");
  const hiddenCountries = useHiddenCountries(HIDDEN_COUNTRIES_KEY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const tableTop = useRef<HTMLDivElement>(null);

  const [patches, setPatches] = useState<Record<string, Partial<CandidateView>>>({});
  const [deleted, setDeleted] = useState<string[]>([]);
  const [viewing, setViewing] = useState<CandidateDocument | null>(null);

  const patch = (id: string, p: Partial<CandidateView>) =>
    setPatches((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));

  const live = useMemo(
    () =>
      rows
        .filter((c) => !deleted.includes(c.id))
        .map((c) => (patches[c.id] ? { ...c, ...patches[c.id] } : c))
        // Accepting is the way off this tab. Somebody who says yes while it is
        // open belongs on Accepted, and a row that stayed would be this tab
        // contradicting its own heading.
        .filter((c) => !c.offerAcceptedAt),
    [rows, patches, deleted],
  );

  const countries = useMemo(
    () => [...new Set(rows.map((c) => c.country).filter(Boolean))].sort(),
    [rows],
  );

  function hideCountry(name: string) {
    if (!name) return;
    hiddenCountries.hide(name);
    setCountry((prev) => (prev === name ? "all" : prev));
  }

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return live.filter((c) => {
      if (hiddenCountries.isHidden(c.country)) return false;
      if (
        q &&
        ![c.fullName, c.email, c.phone, c.country, c.city, c.position].some((v) =>
          (v || "").toLowerCase().includes(q),
        )
      ) {
        return false;
      }
      if (country !== "all" && c.country !== country) return false;
      if (answer === "waiting" && !offerAwaitingReply(c)) return false;
      if (answer === "declined" && !c.offerDeclinedAt) return false;
      const reminders = c.offerReminderCount ?? 0;
      if (chased === "yes" && reminders === 0) return false;
      if (chased === "no" && reminders > 0) return false;
      return true;
    });
  }, [live, search, country, hiddenCountries, answer, chased]);

  const hiddenCount = useMemo(
    () => live.filter((c) => hiddenCountries.isHidden(c.country)).length,
    [live, hiddenCountries],
  );

  /**
   * Still waiting first, oldest offer at the top; the declines after them.
   *
   * The rows worth doing something about lead, and within them the one sent
   * longest ago — the one most likely to have been forgotten. A decline needs
   * nothing done, so it sits below whatever does.
   */
  const sorted = useMemo(
    () =>
      [...shown].sort((a, b) => {
        const aWaiting = offerAwaitingReply(a) ? 0 : 1;
        const bWaiting = offerAwaitingReply(b) ? 0 : 1;
        if (aWaiting !== bWaiting) return aWaiting - bWaiting;
        if (aWaiting === 0) return (a.offerSentAt || "").localeCompare(b.offerSentAt || "");
        return (b.offerDeclinedAt || "").localeCompare(a.offerDeclinedAt || "");
      }),
    [shown],
  );

  const waiting = useMemo(() => sorted.filter((c) => offerAwaitingReply(c)).length, [sorted]);
  const overdue = useMemo(() => sorted.filter((c) => replyOverdue(c)).length, [sorted]);
  const unchased = useMemo(
    () => sorted.filter((c) => offerAwaitingReply(c) && !(c.offerReminderCount ?? 0)).length,
    [sorted],
  );

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = useMemo(
    () => sorted.slice((current - 1) * pageSize, current * pageSize),
    [sorted, current, pageSize],
  );

  /**
   * Who is ticked, for a paced batch of reminders.
   *
   * Ids rather than rows, and kept across pages. Anything the filters drop
   * falls out of the selection, because acting on a row nobody can see is how
   * the wrong person gets emailed.
   */
  const [selected, setSelected] = useState<string[]>([]);
  const selectable = useMemo(() => new Set(sorted.map((c) => c.id)), [sorted]);
  const chosen = useMemo(() => selected.filter((id) => selectable.has(id)), [selected, selectable]);
  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const pageIds = visible.map((c) => c.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => chosen.includes(id));
  const togglePage = () =>
    setSelected((prev) =>
      allOnPage ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])],
    );

  const bulkEmail = useBulkEmail(sorted, chosen, () => setSelected([]), OFFER_ACTIONS);

  const { profile, open: openProfile, close: closeProfile, nav } = useProfileNav(
    live,
    sorted,
    pageSize,
    setPage,
  );

  async function changeStatus(id: string, status: CandidateStatus) {
    patch(id, { status });
    try {
      await adminPost(`/api/admin/candidates/${id}/status`, { status });
    } catch {
      /* the next load will tell the truth */
    }
  }

  return (
    <>
      <div ref={tableTop} className="card mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="label">Search</span>
          <input
            id="search"
            className="input"
            placeholder="Name, email or position"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="label">Answer</span>
          <select
            id="answer"
            className="select"
            value={answer}
            onChange={(e) => setAnswer(e.target.value as Answer)}
          >
            <option value="all">All</option>
            <option value="waiting">Offer sent</option>
            <option value="declined">Rejected</option>
          </select>
        </label>

        <label className="block">
          <span className="label">Reminder</span>
          <select
            id="chased"
            className="select"
            value={chased}
            onChange={(e) => setChased(e.target.value as Chased)}
          >
            <option value="all">All</option>
            <option value="no">Never reminded</option>
            <option value="yes">Already reminded</option>
          </select>
        </label>

        <label className="block">
          <span className="label">Country</span>
          <select
            id="country"
            className="select"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="all">All countries</option>
            {countries
              .filter((c) => !hiddenCountries.isHidden(c))
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
        </label>

        <HideCountryPicker
          countries={countries}
          hidden={hiddenCountries.hidden}
          onHide={hideCountry}
        />

        <div className="sm:col-span-2 lg:col-span-4">
          <HiddenCountryChips
            hidden={hiddenCountries.hidden}
            count={hiddenCount}
            noun="offer"
            onShow={hiddenCountries.show}
            onShowAll={hiddenCountries.showAll}
          />
        </div>
      </div>

      {/* Two prompts, both about the same thing: an offer nobody has answered
          is a role held open for somebody who may have taken another job. */}
      {overdue > 0 ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>
              {overdue} {overdue === 1 ? "person was" : "people were"} given a deadline to answer
              and did not.
            </strong>{" "}
            Nothing has been deleted — open <span className="font-semibold">View info</span> to
            decide.
          </span>
        </p>
      ) : null}
      {unchased > 0 ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>
              {unchased} {unchased === 1 ? "offer has" : "offers have"} had no answer and no
              reminder.
            </strong>{" "}
            Open <span className="font-semibold">View info</span> to ask them to answer either way.
          </span>
        </p>
      ) : null}

      {bulkEmail.bar}
      {bulkEmail.panel}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-navy-500">
          <span className="font-semibold text-navy-900">{sorted.length}</span> offer
          {sorted.length === 1 ? "" : "s"}
          {waiting > 0 ? `, ${waiting} still waiting on an answer` : ""}
        </p>
        <RefreshButton
          onRefreshed={() => {
            setPatches({});
            setDeleted([]);
          }}
        />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/50 text-xs uppercase tracking-wide text-navy-500">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allOnPage}
                  onChange={togglePage}
                  aria-label={allOnPage ? "Unselect this page" : "Select this page"}
                  title={allOnPage ? "Unselect this page" : "Select this page"}
                  className="h-4 w-4 rounded border-navy-300 text-brand-600"
                />
              </th>
              <th className="px-4 py-3 font-semibold">Candidate</th>
              <th className="px-4 py-3 font-semibold">Country</th>
              <th className="px-4 py-3 font-semibold">Offer sent</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">ID check</th>
              <th className="px-4 py-3 font-semibold">Offer reminder</th>
              <th className="px-4 py-3 font-semibold">Results</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-navy-400">
                  {live.length === 0
                    ? "No offers are outstanding. Everyone who was sent one has accepted."
                    : "No offers match your filters."}
                </td>
              </tr>
            ) : (
              visible.map((c) => {
                const reminders = c.offerReminderCount ?? c.offerReminders?.length ?? 0;
                const last = c.offerReminders?.[c.offerReminders.length - 1] ?? c.offerReminderSentAt;
                const late = replyOverdue(c);
                const declined = !!c.offerDeclinedAt;
                const days = daysSince(c.offerSentAt);
                return (
                  <tr
                    key={c.id}
                    className={`align-top hover:bg-navy-50/40 ${
                      chosen.includes(c.id) ? "bg-brand-50/60" : ""
                    }`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={chosen.includes(c.id)}
                        onChange={() => toggleOne(c.id)}
                        aria-label={`Select ${c.fullName || c.email || c.id}`}
                        className="mt-0.5 h-4 w-4 rounded border-navy-300 text-brand-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-900">{c.fullName || "—"}</p>
                      <p className="text-xs text-navy-500">{c.email || "no email"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-800">{c.country || "—"}</p>
                      <PhoneCountryFlag country={c.country} phone={c.phone} />
                    </td>
                    <td className="px-4 py-3 text-navy-600">
                      {fmtDate(c.offerSentAt)}
                      {!declined ? (
                        <span className="mt-0.5 block text-xs text-navy-400">
                          {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {/* The status and nothing beside it. Every row here is an
                          offer that was sent, so a second chip saying "no
                          answer yet" repeated the heading of the tab on every
                          line without narrowing anything down. */}
                      <StatusBadge status={c.status} />
                      {declined ? (
                        <p className="mt-1 text-xs text-navy-500">
                          Declined {fmtDate(c.offerDeclinedAt)}
                        </p>
                      ) : null}
                      {/* Their own words, where they gave any. It is usually the
                          answer to "should we have offered more". */}
                      {c.offerDeclineReason ? (
                        <p className="mt-1 max-w-[16rem] text-xs italic text-navy-500">
                          &ldquo;{c.offerDeclineReason}&rdquo;
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <VerificationBadge
                        status={c.verificationStatus}
                        requestedAt={c.verificationRequestedAt}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {reminders === 0 ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-navy-200 bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-500">
                          Never reminded
                        </span>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                            {reminders} reminder{reminders === 1 ? "" : "s"}
                          </span>
                          <span className="mt-1 block text-xs text-navy-500">
                            Last {fmtDate(last)}
                          </span>
                        </>
                      )}
                      {/* The deadline the last reminder set, once it has gone. */}
                      {late ? (
                        <span className="mt-1 block text-xs font-semibold text-red-700">
                          Deadline passed {fmtDate(c.offerReplyDeadline)}
                        </span>
                      ) : c.offerReplyDeadline && !declined ? (
                        <span className="mt-1 block text-xs text-navy-500">
                          Answer by {fmtDate(c.offerReplyDeadline)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openProfile(c)}
                          className="rounded-lg border border-navy-200 px-3 py-1.5 text-xs font-bold text-navy-700 transition hover:bg-navy-50"
                        >
                          View info
                        </button>
                        <DeleteCandidateButton
                          candidate={c}
                          onDeleted={(id) => setDeleted((prev) => [...prev, id])}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={current}
        pageCount={pageCount}
        total={sorted.length}
        pageSize={pageSize}
        noun="offer"
        onPage={(next) => {
          setPage(next);
          tableTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onPageSize={setPageSize}
      />

      {profile ? (
        <CandidateProfileModal
          key={profile.id}
          candidate={profile}
          // The row's own checkbox, reachable from inside the dialog.
          selection={{
            selected: chosen.includes(profile.id),
            onToggle: () => toggleOne(profile.id),
            count: chosen.length,
          }}
          /* The reminder and the revised offer both live in the profile, and
             this is the tab they are wanted from. */
          showOffer
          nav={nav}
          onClose={closeProfile}
          onOpenDocument={setViewing}
          onStatusChange={changeStatus}
          onChange={(p) => patch(profile.id, p)}
        />
      ) : null}

      {viewing && profile ? (
        <DocumentViewer
          candidateId={profile.id}
          candidateName={profile.fullName}
          document={viewing}
          onClose={() => setViewing(null)}
        />
      ) : null}

      {bulkEmail.dialog}
    </>
  );
}
