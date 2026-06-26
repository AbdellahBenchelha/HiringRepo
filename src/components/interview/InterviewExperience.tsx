"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import type { PublicQuestion } from "@/config/interviewQuestions";

interface Props {
  fullName: string;
  token: string;
  questions: PublicQuestion[];
}

type Phase = "intro" | "questions" | "done";

const firstNameOf = (full: string) => full.trim().split(/\s+/)[0] || full;

export function InterviewExperience({ fullName, token, questions }: Props) {
  const storageKey = `wr-interview:${token}`;

  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [saved, setSaved] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Restore any saved progress for this exact link.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw) as { answers?: Record<string, string>; step?: number };
        if (data.answers) setAnswers(data.answers);
        if (typeof data.step === "number") setStep(Math.min(Math.max(data.step, 0), questions.length - 1));
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save progress.
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ answers, step }));
    } catch {
      /* ignore */
    }
  }, [answers, step, storageKey]);

  const answeredCount = useMemo(
    () => questions.filter((q) => (answers[q.id] ?? "").trim() !== "").length,
    [answers, questions],
  );
  const progress = Math.round((answeredCount / questions.length) * 100);

  const current = questions[step];
  const isLast = step === questions.length - 1;
  const currentAnswered = (answers[current?.id] ?? "").trim() !== "";

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function scrollTop() {
    window.setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function go(next: number) {
    setStep(Math.min(Math.max(next, 0), questions.length - 1));
    scrollTop();
  }

  function saveForLater() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ answers, step }));
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
        body: JSON.stringify({ token, answers }),
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

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-brand-50/50 to-white">
      <div ref={topRef} />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {/* Brand bar */}
        <div className="mb-6 flex items-center justify-center">
          <Logo className="h-9 w-auto" />
        </div>

        {/* ---------------- INTRO ---------------- */}
        {phase === "intro" ? (
          <div className="card text-center">
            <span className="eyebrow">Candidate Assessment</span>
            <h1 className="mt-2 text-3xl font-bold text-navy-900">
              Hello, {fullName} 👋
            </h1>
            <p className="mx-auto mt-4 max-w-prose leading-relaxed text-navy-600">
              Thank you for applying to {siteConfig.company.name}. This short assessment helps us get
              to know how you think and communicate with customers. There are{" "}
              <strong>{questions.length} questions</strong> — a mix of quick multiple-choice and a
              few short written answers.
            </p>

            <ul className="mx-auto mt-6 max-w-sm space-y-3 text-left text-sm text-navy-700">
              {[
                "Takes about 10–15 minutes",
                "Your progress is saved automatically",
                "Answer in your own words — be yourself",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <Icon name="checkCircle" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <button type="button" onClick={() => { setPhase("questions"); scrollTop(); }} className="btn-primary mt-8 sm:px-10">
              Start Assessment <Icon name="arrowRight" className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {/* ---------------- QUESTIONS ---------------- */}
        {phase === "questions" && current ? (
          <div className="card">
            {/* progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-brand-700">
                  Question {step + 1} of {questions.length}
                </span>
                <span className="text-navy-500">{progress}% complete</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-navy-100">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* question */}
            <h2 className="text-lg font-semibold leading-snug text-navy-900">{current.question}</h2>

            <div className="mt-5">
              {current.type === "choice" ? (
                <div className="space-y-3">
                  {current.options.map((opt, i) => {
                    const selected = answers[current.id] === String(i);
                    return (
                      <label
                        key={i}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm transition ${
                          selected
                            ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                            : "border-navy-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name={current.id}
                          checked={selected}
                          onChange={() => setAnswer(current.id, String(i))}
                          className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-navy-800">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={answers[current.id] ?? ""}
                  onChange={(e) => setAnswer(current.id, e.target.value)}
                  placeholder={current.placeholder}
                  className="textarea min-h-[10rem]"
                />
              )}
            </div>

            {status === "error" ? (
              <p role="alert" className="mt-4 text-sm font-medium text-red-600">
                Something went wrong submitting your answers. Please try again.
              </p>
            ) : null}

            {/* nav */}
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-navy-100 pt-6">
              <button
                type="button"
                onClick={() => go(step - 1)}
                disabled={step === 0}
                className={`btn-secondary ${step === 0 ? "invisible" : ""}`}
              >
                <Icon name="arrowRight" className="h-4 w-4 rotate-180" /> Back
              </button>

              <button
                type="button"
                onClick={saveForLater}
                className="hidden text-sm font-medium text-navy-500 hover:text-brand-700 sm:block"
              >
                {saved ? "Saved ✓" : "Save & continue later"}
              </button>

              {isLast ? (
                <button
                  type="button"
                  onClick={submit}
                  disabled={status === "submitting"}
                  className="btn-primary sm:px-8"
                >
                  {status === "submitting" ? "Submitting…" : "Submit Answers"}
                  {status !== "submitting" ? <Icon name="check" className="h-4 w-4" /> : null}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go(step + 1)}
                  disabled={current.type === "choice" && !currentAnswered}
                  className="btn-primary sm:px-8"
                >
                  Next <Icon name="arrowRight" className="h-4 w-4" />
                </button>
              )}
            </div>

            <p className="mt-4 text-center text-xs text-navy-400">
              Your progress is saved automatically — you can close this page and return using the
              same link.
            </p>
          </div>
        ) : null}

        {/* ---------------- DONE ---------------- */}
        {phase === "done" ? (
          <div className="card text-center" role="status" aria-live="polite">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Icon name="checkCircle" className="h-9 w-9 text-green-600" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-navy-900">
              Thank you, {firstNameOf(fullName)}!
            </h1>
            <p className="mx-auto mt-4 max-w-prose leading-relaxed text-navy-600">
              Your answers have been submitted successfully. Our recruitment team will review them
              and contact you about the next steps. We appreciate the time you took to complete this
              assessment.
            </p>
            <p className="mt-6 text-sm text-navy-400">— The {siteConfig.company.name} team</p>
          </div>
        ) : null}

        <p className="mt-8 text-center text-xs text-navy-400">
          © {new Date().getFullYear()} {siteConfig.company.name}
        </p>
      </div>
    </div>
  );
}
