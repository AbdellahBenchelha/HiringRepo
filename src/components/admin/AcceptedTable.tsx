"use client";

import { panExpected } from "@/lib/pan";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { FULL_VERIFIED, REJECTED } from "@/lib/candidateStatus";
import { rowTone, stickyTone, rowEdge } from "@/components/admin/rowTone";
import { CandidateInfoButton } from "@/components/admin/CandidateInfoButton";
import { DeleteCandidateButton } from "@/components/admin/DeleteCandidateButton";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { VerificationBadge } from "@/components/admin/VerificationPanel";
import { CandidateProfileModal } from "@/components/admin/CandidateProfileModal";
import { DocumentViewer } from "@/components/admin/DocumentViewer";
import { useProfileNav } from "@/components/admin/useProfileNav";
import {
  HideCountryPicker,
  HiddenCountryChips,
  useHiddenCountries,
} from "@/components/admin/HiddenCountries";
import { useBulkCompanyCheck } from "@/components/admin/BulkCompanyCheck";
import { useBulkEmail } from "@/components/admin/BulkEmailBar";
import { ACCEPTED_ACTIONS } from "@/lib/bulkEmail";
import { Pagination, DEFAULT_PAGE_SIZE } from "@/components/admin/Pagination";
import { adminPost } from "@/lib/adminClient";
import { formatRate } from "@/lib/offer";
import type { CandidateDocument } from "@/lib/documents";
import type { CandidateStatus } from "@/lib/candidateStatus";
import type { CandidateView } from "@/lib/candidateView";

/**
 * Everyone who said yes.
 *
 * Both routes to an acceptance land here — the candidate confirming through
 * the link in their offer email, and the recruiter marking it by hand after a
 * call — because "who accepted" is one question, not two.
 *
 * The column that earns its place is "Details confirmed": an offer accepted
 * on a call still has whatever the candidate typed into the application form
 * behind it, and that is exactly the data you cannot write an agreement from.
 */

/** This tab's own hidden list — see HiddenCountries for why it is per tab. */
const HIDDEN_COUNTRIES_KEY = "wr.accepted.hiddenCountries";

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

export function AcceptedTable({ rows }: { rows: CandidateView[] }) {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const hiddenCountries = useHiddenCountries(HIDDEN_COUNTRIES_KEY);
  // Replaces the old "Details confirmed" filter: the question asked of this
  // list now is whether somebody is Full verified.
  const [verified, setVerified] = useState<"all" | "yes" | "no">("all");
  const [engagedAs, setEngagedAs] = useState<"all" | "Individual" | "Company">("all");
  // GSTIN is only asked of people in India, so "empty" means somebody in India
  // without one — the people a Request GSTIN email is for — not everyone else.
  const [gstin, setGstin] = useState<"all" | "yes" | "no">("all");
  // The final interview is the live chat: has its link been emailed yet?
  const [chatSent, setChatSent] = useState<"all" | "yes" | "notStarted" | "no">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const tableTop = useRef<HTMLDivElement>(null);

  // Edits made in the profile dialog, so a note or a status change is
  // reflected without a reload — same pattern as the Interviews tab.
  const [patches, setPatches] = useState<Record<string, Partial<CandidateView>>>({});
  /**
   * Rows deleted since this page was rendered.
   *
   * Kept beside the patches rather than by holding a copy of `rows`: the list
   * arrives as a prop from the server, and a second copy of it would go stale
   * against every other reason it changes. A deleted record is gone — a list
   * still showing it is lying.
   */
  const [deleted, setDeleted] = useState<string[]>([]);
  const live = useMemo(
    () =>
      rows
        .filter((r) => !deleted.includes(r.id))
        .map((r) => (patches[r.id] ? { ...r, ...patches[r.id] } : r)),
    [rows, patches, deleted],
  );

  const countries = useMemo(
    () => [...new Set(rows.map((r) => r.country).filter(Boolean))].sort(),
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
      if (q && ![c.fullName, c.email, c.phone, c.country, c.city, c.position].some((v) =>
        (v || "").toLowerCase().includes(q),
      )) return false;
      if (country !== "all" && c.country !== country) return false;
      if (verified === "yes" && c.status !== FULL_VERIFIED) return false;
      if (verified === "no" && c.status === FULL_VERIFIED) return false;
      if (engagedAs !== "all" && c.confirmedDetails?.engagedAs !== engagedAs) return false;
      if (gstin === "yes" && !c.gstin) return false;
      if (gstin === "no" && (c.gstin || !panExpected(c.confirmedDetails?.country ?? c.country))) return false;
      if (chatSent === "yes" && !c.chatLinkSentAt) return false;
      if (chatSent === "no" && c.chatLinkSentAt) return false;
      // The people the "start your chat" reminder is for.
      if (chatSent === "notStarted" && (!c.chatLinkSentAt || c.chatStarted)) return false;
      return true;
    });
  }, [live, search, country, hiddenCountries, verified, engagedAs, gstin, chatSent]);

  /** How many rows the hidden countries are keeping off the table. */
  const hiddenCount = useMemo(
    () => live.filter((c) => hiddenCountries.isHidden(c.country)).length,
    [live, hiddenCountries],
  );

  const pageCount = Math.max(1, Math.ceil(shown.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = useMemo(
    () => shown.slice((current - 1) * pageSize, current * pageSize),
    [shown, current, pageSize],
  );

  /**
   * Who is ticked, for a paced batch of chat reminders. Ids, kept across pages;
   * anything the filters drop falls out, so nobody unseen is emailed.
   */
  const [selected, setSelected] = useState<string[]>([]);
  const selectable = useMemo(() => new Set(shown.map((c) => c.id)), [shown]);
  const chosen = useMemo(() => selected.filter((id) => selectable.has(id)), [selected, selectable]);
  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const pageIds = visible.map((c) => c.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => chosen.includes(id));
  const togglePage = () =>
    setSelected((prev) =>
      allOnPage ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])],
    );
  const bulkEmail = useBulkEmail(shown, chosen, () => setSelected([]), ACCEPTED_ACTIONS);

  const { profile, open: openProfile, close: closeProfile, nav } = useProfileNav(
    live,
    shown,
    pageSize,
    setPage,
  );
  const [viewing, setViewing] = useState<CandidateDocument | null>(null);

  function dropRow(id: string) {
    setDeleted((prev) => [...prev, id]);
    if (profile?.id === id) closeProfile();
  }

  const patch = (id: string, p: Partial<CandidateView>) =>
    setPatches((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));

  async function changeStatus(id: string, next: CandidateStatus) {
    patch(id, { status: next });
    try {
      await adminPost(`/api/admin/candidates/${id}/status`, { status: next });
    } catch {
      /* optimistic; the table reloads with the truth */
    }
  }

  // Scoped to the current page, not to everyone the filters left.
  const companyCheck = useBulkCompanyCheck(visible, (id, check) =>
    patch(id, { companyCheck: check }),
    openProfile,
  );

  // A document reader belongs to the candidate it was opened from, so stepping
  // to the next one closes it rather than leaving someone else's CV on screen.
  useEffect(() => {
    setViewing(null);
  }, [profile?.id]);

  useEffect(() => {
    setPage(1);
  }, [search, country, hiddenCountries.hidden, verified, engagedAs, gstin, chatSent, pageSize]);

  function goToPage(next: number) {
    setPage(next);
    tableTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const waiting = live.filter((c) => !c.confirmedDetails).length;
  /**
   * Accepted, and we still cannot draw up their agreement.
   *
   * The group that stalls silently: accepting feels like the finish, so
   * nobody who closed the tab afterwards has anything telling them a step is
   * outstanding — and from their side it looks as though we went quiet.
   */
  const needingId = live.filter((c) => c.identityNeeded).length;
  // The other thing that stops an agreement: somebody contracting through a
  // company we have only been told about.
  const needingCompany = live.filter((c) => c.companyNeeded).length;

  return (
    <>
      <div ref={tableTop} className="card mb-5 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
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
            <span className="label">Status</span>
            <select
              id="verified"
              className="select"
              value={verified}
              onChange={(e) => setVerified(e.target.value as typeof verified)}
            >
              <option value="all">All</option>
              <option value="yes">Full verified</option>
              <option value="no">Not full verified</option>
            </select>
          </label>

          <label className="block">
            <span className="label">Engaged as</span>
            <select
              id="engaged"
              className="select"
              value={engagedAs}
              onChange={(e) => setEngagedAs(e.target.value as typeof engagedAs)}
            >
              <option value="all">All</option>
              <option value="Individual">Individual</option>
              <option value="Company">Company</option>
            </select>
          </label>

          <label className="block">
            <span className="label">GSTIN</span>
            <select
              id="gstin"
              className="select"
              value={gstin}
              onChange={(e) => setGstin(e.target.value as typeof gstin)}
            >
              <option value="all">All</option>
              <option value="yes">Provided</option>
              <option value="no">Empty (India)</option>
            </select>
          </label>

          <label className="block">
            <span className="label">Live interview</span>
            <select
              id="chatSent"
              className="select"
              value={chatSent}
              onChange={(e) => setChatSent(e.target.value as typeof chatSent)}
            >
              <option value="all">All</option>
              <option value="yes">Chat link sent</option>
              <option value="notStarted">Sent — not started</option>
              <option value="no">Not sent</option>
            </select>
          </label>

          <label className="block">
            <span className="label">Country</span>
            <select id="country" className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="all">All countries</option>
              {countries
                .filter((c) => !hiddenCountries.isHidden(c))
                .map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
            </select>
          </label>

          <HideCountryPicker
            countries={countries}
            hidden={hiddenCountries.hidden}
            onHide={hideCountry}
          />
        </div>

        <HiddenCountryChips
          hidden={hiddenCountries.hidden}
          count={hiddenCount}
          noun="person"
          plural="people"
          onShow={hiddenCountries.show}
          onShowAll={hiddenCountries.showAll}
        />

        {shown.length !== rows.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-navy-100 pt-3">
            <p className="text-sm text-navy-500">
              <strong className="text-navy-800">{shown.length}</strong> of {rows.length} match
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCountry("all");
                setVerified("all");
                setEngagedAs("all");
                setGstin("all");
                setChatSent("all");
              }}
              className="rounded-full px-3 py-1 text-xs font-semibold text-navy-600 transition hover:bg-navy-100"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>

      {needingId > 0 ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>
              {needingId} {needingId === 1 ? "person has" : "people have"} accepted but not sent
              identity documents.
            </strong>{" "}
            No agreement can be issued until they do. Open{" "}
            <span className="font-semibold">View info</span> on their row to see what has been
            sent and to chase them.
          </span>
        </p>
      ) : null}

      {needingCompany > 0 ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <Icon name="briefcase" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>
              {needingCompany} {needingCompany === 1 ? "person is" : "people are"} contracting
              through a company that is not confirmed.
            </strong>{" "}
            The agreement is made with the company, so none can be issued until its details and
            paperwork are on file. Open <span className="font-semibold">View info</span> on their
            row to request them.
          </span>
        </p>
      ) : null}

      {waiting > 0 ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Icon name="shield" className="h-4 w-4 shrink-0" />
          {waiting} {waiting === 1 ? "person has" : "people have"} accepted without confirming their
          details — their agreement would be drawn from what they typed on the application form.
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-navy-500">
          <span className="font-semibold text-navy-900">{visible.length}</span> on this page
        </p>
        <RefreshButton
          onRefreshed={() => {
            setPatches({});
            setDeleted([]);
          }}
        />
        {companyCheck.control}
      </div>

      {companyCheck.panel}
      {bulkEmail.bar}
      {bulkEmail.panel}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[1150px] text-left text-sm">
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
              <th className="px-4 py-3 font-semibold">Position</th>
              <th className="px-4 py-3 font-semibold">Agreed pay</th>
              <th className="px-4 py-3 font-semibold">Start date</th>
              <th className="px-4 py-3 font-semibold">Accepted</th>
              <th className="px-4 py-3 font-semibold">Details</th>
              {/* Whether we may draw up an agreement at all: everyone is asked
                  for identity documents at the offer, whatever their country. */}
              <th className="px-4 py-3 font-semibold">ID check</th>
              <th className="sticky right-0 whitespace-nowrap bg-navy-50 px-4 py-3 font-semibold shadow-[-8px_0_8px_-8px_rgba(15,16,53,0.12)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-navy-400">
                  {rows.length === 0
                    ? "Nobody has accepted an offer yet."
                    : "No accepted candidates match your filters."}
                </td>
              </tr>
            ) : (
              visible.map((c) => {
                const d = c.confirmedDetails;
                return (
                  <tr
                    key={c.id}
                    data-full-verified={c.status === FULL_VERIFIED ? "true" : undefined}
                    data-rejected={c.status === REJECTED ? "true" : undefined}
                    // Green for Full verified: the final interview is done and
                    // every check passed — the ones ready to go, at a glance.
                    // Red for Rejected.
                    className={`align-top ${
                      rowTone(c.status, { selected: chosen.includes(c.id), greenVerified: true }) || "hover:bg-navy-50/40"
                    }`}
                  >
                    <td className={`px-3 py-3 ${rowEdge(c.status, true)}`}>
                      <input
                        type="checkbox"
                        checked={chosen.includes(c.id)}
                        onChange={() => toggleOne(c.id)}
                        aria-label={`Select ${c.fullName || c.email || c.id}`}
                        className="mt-0.5 h-4 w-4 rounded border-navy-300 text-brand-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-900">
                        {d ? `${d.firstName} ${d.lastName}`.trim() : c.fullName || "—"}
                      </p>
                      <p className="text-xs text-navy-500">{c.email || "—"}</p>
                      {c.status === FULL_VERIFIED ? (
                        <span className="mt-1 mr-1 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                          <Icon name="checkCircle" className="h-3 w-3" />
                          Full verified
                        </span>
                      ) : null}
                      {d?.engagedAs === "Company" ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-navy-100 px-2 py-0.5 text-[11px] font-semibold text-navy-700">
                          <Icon name="briefcase" className="h-3 w-3" />
                          {d.companyName}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-800">{d?.country || c.country || "—"}</p>
                      {d?.city || c.city ? (
                        <p className="text-xs text-navy-500">{d?.city || c.city}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-navy-700">{c.offer?.position || c.position || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-navy-900">
                      {c.offer ? formatRate(c.offer) : "—"}
                    </td>
                    <td className="px-4 py-3 text-navy-600">{fmtDate(c.offer?.startDate)}</td>
                    <td className="px-4 py-3 text-navy-500">{fmt(c.offerAcceptedAt)}</td>
                    <td className="px-4 py-3">
                      {d ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                          <Icon name="checkCircle" className="h-3 w-3" />
                          Confirmed
                        </span>
                      ) : (
                        <span
                          title="They accepted, but have not re-confirmed their details through the offer link."
                          className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                        >
                          Still waiting
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <VerificationBadge
                        status={c.verificationStatus}
                        requestedAt={c.verificationRequestedAt}
                        onOpenPhotos={() => openProfile(c)}
                      />
                    </td>
                    <td
                      className={`sticky right-0 px-4 py-3 shadow-[-8px_0_8px_-8px_rgba(15,16,53,0.12)] ${stickyTone(
                        c.status,
                        true,
                      )}`}
                    >
                      <div className="flex items-center gap-2">
                        <CandidateInfoButton onOpen={() => openProfile(c)} />
                        <DeleteCandidateButton candidate={c} onDeleted={dropRow} />
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
        total={shown.length}
        pageSize={pageSize}
        noun="accepted candidate"
        onPage={goToPage}
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
          showOffer
          nav={nav}
          onClose={closeProfile}
          onOpenDocument={setViewing}
          onStatusChange={changeStatus}
          onChange={(p) => patch(profile.id, p)}
        />
      ) : null}

      {bulkEmail.dialog}

      {viewing && profile ? (
        <DocumentViewer
          candidateId={profile.id}
          candidateName={profile.fullName}
          document={viewing}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </>
  );
}
