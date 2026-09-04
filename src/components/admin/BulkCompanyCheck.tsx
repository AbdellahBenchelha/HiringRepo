"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { activeAppointments, classifyCheck, type CompanyCheck } from "@/lib/companyCheck";
import type { CandidateView } from "@/lib/candidateView";

/**
 * Checks everyone currently on screen against the UK register of company
 * officers, in one go.
 *
 * Scoped to the visible rows and nothing else. Running the whole list would
 * spend hundreds of requests on people nobody is looking at, and Companies
 * House allows roughly six hundred every five minutes — a page at a time keeps
 * a scan well inside that and keeps the cost of pressing the button
 * predictable, which is why the count is printed on it.
 *
 * It drives the single-candidate endpoint rather than a bulk one. That
 * endpoint already exists, already stores its result and is already tested;
 * calling it once per row also means progress is real rather than a spinner,
 * and that a page of fifty is not one long request for a proxy to cut in half
 * with nothing to show for it.
 */

/** Polite to the register, and fast enough that nobody goes to make tea. */
const CONCURRENCY = 3;

interface CheckReply {
  ok?: boolean;
  error?: string;
  check?: CompanyCheck;
}

interface Row {
  candidate: CandidateView;
  check?: CompanyCheck;
  /** True when this came from a previous check rather than a fresh lookup. */
  cached?: boolean;
  /** Set when this row was never asked about — no name to search with. */
  skipped?: boolean;
  /**
   * Why this row has no answer, in the words the server used.
   *
   * Recorded rather than folded into a bare count: "could not be checked"
   * without a reason is the one message a reviewer can do nothing with, and
   * the reasons want different responses — a throttle wants a wait, a 401
   * wants the key looking at.
   */
  failure?: string;
}

/**
 * Returns the control and the results panel separately.
 *
 * They belong in different places: the button sits on the toolbar line beside
 * the export, and the results are a full-width block beneath it. Returned as
 * one component they would have to be either squeezed into the toolbar or
 * dragged out of it, and each of the three tables that use this lays its
 * toolbar out slightly differently.
 */
export function useBulkCompanyCheck(
  /** Exactly the rows on screen: this page, after filters and sorting. */
  candidates: CandidateView[],
  /** Reported per row so the table's own copy stays in step. */
  onResult: (id: string, check: CompanyCheck) => void,
): { control: React.ReactNode; panel: React.ReactNode } {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [fatal, setFatal] = useState("");
  const cancel = useRef(false);

  async function run() {
    if (running) return;
    cancel.current = false;
    setRunning(true);
    setStopped(false);
    setFatal("");
    setDone(0);

    const list = [...candidates];
    const results: Row[] = [];
    // A result already on file answers the question without spending a
    // request. The register moves, but not so fast that asking again about
    // everyone every time is worth the quota.
    const toFetch: CandidateView[] = [];
    for (const c of list) {
      if (c.companyCheck && !c.companyCheck.error) {
        results.push({ candidate: c, check: c.companyCheck, cached: true });
      } else {
        toFetch.push(c);
      }
    }
    setRows([...results]);
    setDone(results.length);

    let index = 0;
    let aborted = false;

    async function worker() {
      while (!cancel.current && !aborted) {
        const c = toFetch[index++];
        if (!c) return;
        try {
          const res = await adminPost(`/api/admin/candidates/${c.id}/company-check`, {});
          let data: CheckReply | null = null;
          try {
            data = (await res.json()) as CheckReply;
          } catch {
            // A response that is not JSON at all — a proxy error page, or the
            // login screen after a session expired mid-scan.
          }

          if (data?.ok && data.check) {
            // No key configured is not a per-candidate result, it is the end
            // of the run — carrying on would repeat the same failure once per
            // row and bury the reason.
            if (data.check.error === "not_configured") {
              aborted = true;
              setFatal(
                "No Companies House API key is set on the server, so nothing could be checked.",
              );
              return;
            }
            results.push({ candidate: c, check: data.check });
            onResult(c.id, data.check);
          } else if (data?.error === "no_name") {
            results.push({ candidate: c, skipped: true });
          } else {
            results.push({
              candidate: c,
              failure: data?.error ? `${data.error} (${res.status})` : `HTTP ${res.status}`,
            });
          }
        } catch {
          results.push({ candidate: c, failure: "the request did not complete" });
        }
        setRows([...results]);
        setDone(results.length);
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    if (cancel.current) setStopped(true);
    setRows([...results]);
    setRunning(false);
  }

  const total = candidates.length;
  const groups = group(rows ?? []);

  const control = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => (running ? ((cancel.current = true), undefined) : void run())}
        disabled={total === 0}
        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-navy-200 px-4 py-2 text-xs font-bold text-navy-700 transition hover:bg-navy-50 disabled:opacity-40"
      >
        <Icon name={running ? "close" : "search"} className="h-4 w-4" />
        {running ? "Stop" : `Check ${total} for UK companies`}
      </button>

      {running ? (
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-navy-100">
            <span
              className="block h-full rounded-full bg-brand-500 transition-[width] duration-300"
              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
            />
          </span>
          <span className="text-xs font-semibold text-navy-500">
            {done} of {total}
          </span>
        </span>
      ) : null}
    </div>
  );

  const panel =
    fatal || (rows && !running) ? (
      <div className="mb-4">
        {fatal ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {fatal}
          </p>
        ) : (
          <Results groups={groups} total={total} stopped={stopped} />
        )}
      </div>
    ) : null;

  return { control, panel };
}

interface Groups {
  confirmed: Row[];
  nameOnly: Row[];
  none: number;
  failed: number;
  /** Distinct reasons the failures gave, so the panel can say what went wrong. */
  reasons: string[];
  skipped: number;
  cached: number;
}

function group(rows: Row[]): Groups {
  const out: Groups = {
    confirmed: [], nameOnly: [], none: 0, failed: 0, reasons: [], skipped: 0, cached: 0,
  };
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.cached) out.cached += 1;
    if (r.skipped) {
      out.skipped += 1;
      continue;
    }
    const note = (reason: string) => {
      out.failed += 1;
      if (!seen.has(reason)) {
        seen.add(reason);
        out.reasons.push(reason);
      }
    };
    switch (classifyCheck(r.check)) {
      case "confirmed":
        out.confirmed.push(r);
        break;
      case "name-only":
        out.nameOnly.push(r);
        break;
      case "none":
        out.none += 1;
        break;
      case "failed":
        note(r.check?.error ?? "the register did not answer");
        break;
      default:
        note(r.failure ?? "the request did not complete");
    }
  }
  return out;
}

function Results({ groups, total, stopped }: { groups: Groups; total: number; stopped: boolean }) {
  const { confirmed, nameOnly, none, failed, reasons, skipped, cached } = groups;

  return (
    <div className="rounded-xl border border-navy-100 bg-white p-4">
      <p className="text-sm font-semibold text-navy-800">
        {confirmed.length} confirmed
        {nameOnly.length > 0 ? ` · ${nameOnly.length} name only` : ""}
        {` · ${none} no match`}
        {failed > 0 ? ` · ${failed} could not be checked` : ""}
        {skipped > 0 ? ` · ${skipped} skipped` : ""}
        <span className="ml-1 font-normal text-navy-400">of {total} on this page</span>
      </p>
      {failed > 0 ? (
        <p className="mt-1 text-xs font-semibold text-amber-700">
          {failed} could not be checked ({reasons.join(", ")}) — they are not &ldquo;no
          match&rdquo;, they are unanswered. Run it again to retry just those.
        </p>
      ) : null}
      {cached > 0 ? (
        <p className="mt-1 text-xs text-navy-400">
          {cached} of these came from a check already on file, so no new lookup was made for them.
        </p>
      ) : null}
      {stopped ? (
        <p className="mt-1 text-xs font-semibold text-amber-700">
          Stopped early — the rest of this page was not checked.
        </p>
      ) : null}

      {confirmed.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-navy-500">
            Has a UK company — name and birth month/year both match
          </p>
          <ul className="mt-2 space-y-2">
            {confirmed.map((r) => (
              <PersonRow key={r.candidate.id} row={r} />
            ))}
          </ul>
        </div>
      ) : null}

      {nameOnly.length > 0 ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
            Name matches only — not confirmed
          </p>
          {/* Kept apart from the count above deliberately. Across a whole page,
              a shared name will produce these steadily, and folded together
              they would read as findings rather than as things to check. */}
          <p className="mt-1 text-xs leading-relaxed text-amber-900">
            No date of birth on file for these, so the register cannot tell them from anyone else
            with the same name. Open the register before treating any of it as true.
          </p>
          <ul className="mt-2 space-y-2">
            {nameOnly.map((r) => (
              <PersonRow key={r.candidate.id} row={r} />
            ))}
          </ul>
        </div>
      ) : null}

      {confirmed.length === 0 && nameOnly.length === 0 ? (
        <p className="mt-3 text-sm text-navy-600">
          Nobody on this page appears on the UK register of company officers. That rules out a UK
          company only — it says nothing about companies registered anywhere else.
        </p>
      ) : null}
    </div>
  );
}

function PersonRow({ row }: { row: Row }) {
  const matches = row.check?.matches ?? [];
  const active = matches.flatMap(activeAppointments);
  const all = matches.flatMap((m) => m.appointments);

  return (
    <li className="text-sm">
      <span className="font-semibold text-navy-900">{row.candidate.fullName || "Unnamed"}</span>
      <span className="ml-2 text-xs text-navy-400">
        {active.length} active of {all.length} appointment{all.length === 1 ? "" : "s"}
      </span>
      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {all.map((a) => (
          <a
            key={`${row.candidate.id}-${a.companyNumber}-${a.appointedOn ?? ""}`}
            href={`https://find-and-update.company-information.service.gov.uk/company/${a.companyNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs underline ${
              a.companyStatus === "active" && !a.resignedOn
                ? "font-semibold text-brand-700"
                : "text-navy-400"
            }`}
            title={`${a.companyNumber} · ${a.companyStatus}${a.resignedOn ? " · resigned" : ""}`}
          >
            {a.companyName}
          </a>
        ))}
      </span>
    </li>
  );
}
