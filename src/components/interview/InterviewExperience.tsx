"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import type { Difficulty, PublicQuestion, Section } from "@/config/interviewQuestions";

interface Props {
  fullName: string;
  /** Short-link candidate id (preferred). */
  candidateId?: string;
  /** Legacy signed token (used when there's no candidateId). */
  token?: string;
  questions: PublicQuestion[];
  sections: Section[];
}

type Phase = "intro" | "assess" | "review" | "done";

const firstNameOf = (full: string) => full.trim().split(/\s+/)[0] || full;

function initials(full: string) {
  const parts = full.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  Easy: "bg-green-50 text-green-700 border-green-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Advanced: "bg-rose-50 text-rose-700 border-rose-200",
};

export function InterviewExperience({ fullName, candidateId, token, questions, sections }: Props) {
  const storageKey = `wr-interview:${candidateId || token}`;

  // Group questions by section (preserving section + question order).
  const groups = useMemo(
    () =>
      sections
        .map((s) => ({ section: s, items: questions.filter((q) => q.section === s.id) }))
        .filter((g) => g.items.length > 0),
    [sections, questions],
  );

  const totalChoice = useMemo(
    () => questions.filter((q) => q.type === "choice").length,
    [questions],
  );

  const [phase, setPhase] = useState<Phase>("intro");
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [saved, setSaved] = useState(false);
  const [hint, setHint] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Restore saved progress.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw) as { answers?: Record<string, string>; sectionIdx?: number };
        if (data.answers) setAnswers(data.answers);
        if (typeof data.sectionIdx === "number") {
          setSectionIdx(Math.min(Math.max(data.sectionIdx, 0), groups.length - 1));
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save.
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ answers, sectionIdx }));
    } catch {
      /* ignore */
    }
  }, [answers, sectionIdx, storageKey]);

  const answeredTotal = useMemo(
    () => questions.filter((q) => (answers[q.id] ?? "").trim() !== "").length,
    [answers, questions],
  );
  const progress = Math.round((answeredTotal / questions.length) * 100);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setHint(false);
  }

  function scrollTop() {
    window.setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  const group = groups[sectionIdx];
  const sectionAllAnswered =
    group?.items.every((q) => (answers[q.id] ?? "").trim() !== "") ?? true;

  function goSection(i: number) {
    if (i < 0 || i > groups.length - 1) return;
    setSectionIdx(i);
    setHint(false);
    scrollTop();
  }

  function next() {
    if (!sectionAllAnswered) {
      setHint(true);
      scrollTop();
      return;
    }
    if (sectionIdx === groups.length - 1) {
      setPhase("review");
      scrollTop();
    } else {
      goSection(sectionIdx + 1);
    }
  }

  function saveForLater() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ answers, sectionIdx }));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      /* ignore */
    }
  }

  async function submit() {
    if (status === "submitting") return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidateId ? { id: candidateId, answers } : { token, answers }),
      });
      if (!res.ok) throw new Error("failed");
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      setPhase("done");
      scrollTop();
    } catch {
      setStatus("error");
    }
  }

  // Running question number across the whole assessment.
  function questionNumber(qid: string) {
    return questions.findIndex((q) => q.id === qid) + 1;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-50 via-brand-50/30 to-white">
      <div ref={topRef} />

      {/* ---------- Top bar ---------- */}
      <header className="border-b border-navy-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo className="h-8 w-auto" />
          <div className="flex items-center gap-2.5">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-navy-400">Candidate</p>
              <p className="text-sm font-semibold text-navy-900">{fullName}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {initials(fullName)}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* ---------------- INTRO ---------------- */}
        {phase === "intro" ? (
          <div className="card">
            <span className="eyebrow">Candidate Assessment</span>
            <h1 className="mt-2 text-3xl font-bold text-navy-900 sm:text-4xl">Hello, {fullName} 👋</h1>
            <p className="mt-4 max-w-prose leading-relaxed text-navy-600">
              Welcome to the {siteConfig.company.name} candidate assessment. This professional
              evaluation helps us understand your customer-service skills, communication, and how
              you handle real workplace situations. Please answer honestly and in your own words.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <Stat label="Sections" value={String(groups.length)} icon="ladder" />
              <Stat label="Questions" value={String(questions.length)} icon="chat" />
              <Stat label="Time" value="20–30 min" icon="clock" />
            </div>

            <div className="mt-7">
              <p className="mb-3 text-sm font-semibold text-navy-800">What you'll cover</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {groups.map((g, i) => (
                  <div key={g.section.id} className="flex items-start gap-3 rounded-xl border border-navy-100 bg-white p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-navy-900">{g.section.title}</p>
                      <p className="text-xs text-navy-500">{g.items.length} questions</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-navy-700">
              <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <p>
                All questions are required. Once you continue to the next section you cannot go back,
                so please answer carefully. Your progress is saved automatically — you can close this
                page and return later using the same link.
              </p>
            </div>

            <button type="button" onClick={() => { setPhase("assess"); scrollTop(); }} className="btn-primary mt-7 sm:px-10">
              Start Assessment <Icon name="arrowRight" className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {/* ---------------- ASSESSMENT ---------------- */}
        {phase === "assess" && group ? (
          <div>
            {/* Section stepper */}
            <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
              {groups.map((g, i) => {
                const state = i < sectionIdx ? "done" : i === sectionIdx ? "current" : "todo";
                return (
                  <span
                    key={g.section.id}
                    title={g.section.title}
                    className={`flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${
                      state === "current"
                        ? "bg-brand-600 text-white"
                        : state === "done"
                          ? "bg-brand-100 text-brand-700"
                          : "bg-navy-100 text-navy-400"
                    }`}
                  >
                    {state === "done" ? <Icon name="check" className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                  </span>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-brand-700">
                  Section {sectionIdx + 1} of {groups.length}
                </span>
                <span className="text-navy-500">{answeredTotal}/{questions.length} answered · {progress}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-navy-100">
                <div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Section header */}
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-navy-900">{group.section.title}</h2>
              <p className="mt-1 text-sm text-navy-500">{group.section.description}</p>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              {group.items.map((q) => (
                <div key={q.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold leading-snug text-navy-900">
                      <span className="mr-2 text-brand-600">Q{questionNumber(q.id)}.</span>
                      {q.question}
                    </h3>
                    {q.type === "choice" ? (
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${DIFFICULTY_STYLES[q.difficulty]}`}>
                        {q.difficulty}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    {q.type === "choice" ? (
                      <div className="space-y-2.5">
                        {q.options.map((opt, i) => {
                          const selected = answers[q.id] === String(i);
                          return (
                            <label
                              key={i}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm transition ${
                                selected
                                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                                  : "border-navy-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                checked={selected}
                                onChange={() => setAnswer(q.id, String(i))}
                                className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                              />
                              <span className="text-navy-800">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        placeholder={q.placeholder}
                        rows={6}
                        className="textarea min-h-[11rem]"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {hint && !sectionAllAnswered ? (
              <p role="alert" className="mt-4 text-sm font-medium text-red-600">
                Please answer all questions in this section before continuing. Once you continue you
                cannot return to this section.
              </p>
            ) : null}

            {/* Nav — forward only, no going back */}
            <div className="mt-6 flex items-center gap-3">
              <button type="button" onClick={saveForLater} className="hidden text-sm font-medium text-navy-500 hover:text-brand-700 sm:block">
                {saved ? "Saved ✓" : "Save & continue later"}
              </button>

              <button type="button" onClick={next} className="btn-primary ml-auto sm:px-8">
                {sectionIdx === groups.length - 1 ? "Review Answers" : "Next Section"}
                <Icon name="arrowRight" className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {/* ---------------- REVIEW ---------------- */}
        {phase === "review" ? (
          <div>
            <div className="mb-6 text-center">
              <span className="eyebrow">Almost done</span>
              <h2 className="mt-2 text-3xl font-bold text-navy-900">Review your answers</h2>
              <p className="mx-auto mt-3 max-w-prose text-navy-600">
                Please review your responses below, then submit your assessment. You have answered all{" "}
                <strong>{questions.length}</strong> questions.
              </p>
            </div>

            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.section.id} className="card">
                  <h3 className="text-lg font-semibold text-navy-900">{g.section.title}</h3>
                  <dl className="mt-3 space-y-3">
                    {g.items.map((q) => {
                      const a = answers[q.id] ?? "";
                      const display =
                        q.type === "choice"
                          ? a !== "" ? q.options[Number(a)] : ""
                          : a.trim();
                      return (
                        <div key={q.id} className="border-t border-navy-100 pt-3 first:border-t-0 first:pt-0">
                          <dt className="text-sm font-medium text-navy-700">
                            Q{questionNumber(q.id)}. {q.question}
                          </dt>
                          <dd className={`mt-1 text-sm ${display ? "text-navy-900" : "text-red-500"}`}>
                            {display || "Not answered"}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              ))}
            </div>

            {status === "error" ? (
              <p role="alert" className="mt-4 text-center text-sm font-medium text-red-600">
                Something went wrong submitting your answers. Please try again.
              </p>
            ) : null}

            <div className="mt-6 flex justify-center">
              <button type="button" onClick={submit} disabled={status === "submitting"} className="btn-primary sm:px-12">
                {status === "submitting" ? "Submitting…" : "Submit Assessment"}
                {status !== "submitting" ? <Icon name="check" className="h-4 w-4" /> : null}
              </button>
            </div>
          </div>
        ) : null}

        {/* ---------------- DONE ---------------- */}
        {phase === "done" ? (
          <div className="card text-center" role="status" aria-live="polite">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Icon name="checkCircle" className="h-9 w-9 text-green-600" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-navy-900 sm:text-3xl">
              Assessment received — thank you, {firstNameOf(fullName)}!
            </h1>
            <p className="mx-auto mt-4 max-w-prose leading-relaxed text-navy-600">
              Your assessment has been successfully submitted to our recruitment team. We will
              carefully review your answers and contact you regarding the next steps. We truly
              appreciate the time and effort you put into completing this assessment.
            </p>
            <div className="mx-auto mt-6 max-w-sm rounded-xl border border-navy-100 bg-navy-50/50 p-4 text-sm text-navy-600">
              <p>You can now close this page. There is no need to submit again.</p>
            </div>
            <p className="mt-6 text-sm text-navy-400">— The {siteConfig.company.name} Recruitment Team</p>
          </div>
        ) : null}

        <p className="mt-8 text-center text-xs text-navy-400">
          © {new Date().getFullYear()} {siteConfig.company.name}. Confidential candidate assessment.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white p-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <p className="text-lg font-bold leading-none text-navy-900">{value}</p>
        <p className="mt-1 text-xs text-navy-500">{label}</p>
      </div>
    </div>
  );
}
