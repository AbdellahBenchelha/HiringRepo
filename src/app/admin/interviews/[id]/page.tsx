import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { getCandidate } from "@/lib/store";
import { interviewQuestions, sections, scoreAnswers } from "@/config/interviewQuestions";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Interview Results", robots: { index: false, follow: false } };

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function recommendation(p: number): { label: string; cls: string } {
  if (p >= 80) return { label: "Strong candidate — recommended for next stage", cls: "bg-green-50 text-green-700 border-green-200" };
  if (p >= 60) return { label: "Good candidate — worth considering", cls: "bg-teal-50 text-teal-700 border-teal-200" };
  if (p >= 40) return { label: "Average — review written answers carefully", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Below threshold — likely not a fit", cls: "bg-red-50 text-red-700 border-red-200" };
}

export default async function InterviewResultPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const candidate = await getCandidate(id);

  if (!candidate || !candidate.interview) {
    return (
      <AdminShell>
        <div className="card text-center">
          <h1 className="text-xl font-bold text-navy-900">No interview results</h1>
          <p className="mt-2 text-sm text-navy-500">This candidate has not completed the interview yet.</p>
          <Link href="/admin/interviews" className="btn-secondary mt-6 inline-flex">← Back to interviews</Link>
        </div>
      </AdminShell>
    );
  }

  const answers = candidate.interview.answers || {};
  const { correct, total } = scoreAnswers(answers);
  const p = total > 0 ? Math.round((correct / total) * 100) : 0;
  const rec = recommendation(p);

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/interviews" className="text-sm font-medium text-brand-700 hover:text-brand-800">← Interviews</Link>
          <h1 className="mt-1 text-2xl font-bold text-navy-900 sm:text-3xl">{candidate.fullName}</h1>
          <p className="mt-1 text-sm text-navy-500">Completed {fmt(candidate.interview.completedAt)}</p>
        </div>
        <StatusBadge status={candidate.status} />
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="text-sm text-navy-500">Total score</p>
          <p className="mt-1 text-3xl font-bold text-navy-900">{correct}<span className="text-lg text-navy-400">/{total}</span></p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-navy-500">Percentage</p>
          <p className={`mt-1 text-3xl font-bold ${p >= 60 ? "text-green-600" : p >= 40 ? "text-amber-600" : "text-red-600"}`}>{p}%</p>
        </div>
        <div className="card flex items-center justify-center text-center">
          <p className={`rounded-lg border px-3 py-2 text-sm font-semibold ${rec.cls}`}>{rec.label}</p>
        </div>
      </div>

      {/* Questions by section */}
      <div className="mt-6 space-y-6">
        {sections.map((section) => {
          const qs = interviewQuestions.filter((q) => q.section === section.id);
          if (!qs.length) return null;
          return (
            <section key={section.id} className="card">
              <h2 className="text-lg font-semibold text-navy-900">{section.title}</h2>
              <div className="mt-4 space-y-4">
                {qs.map((q) => {
                  const raw = answers[q.id] ?? "";
                  if (q.type === "choice") {
                    const answered = raw !== "";
                    const chosen = answered ? Number(raw) : -1;
                    const isCorrect = chosen === q.correct;
                    const tone = !answered
                      ? "border-navy-200 bg-navy-50/50"
                      : isCorrect
                        ? "border-green-200 bg-green-50/60"
                        : "border-red-200 bg-red-50/60";
                    return (
                      <div key={q.id} className={`rounded-xl border p-4 ${tone}`}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-navy-900">{q.question}</p>
                          <span className="shrink-0 text-xs font-bold text-navy-600">{isCorrect ? 1 : 0}/1</span>
                        </div>
                        <p className="mt-2 flex items-center gap-2 text-sm">
                          {!answered ? (
                            <span className="font-medium text-navy-500">Not answered</span>
                          ) : isCorrect ? (
                            <><Icon name="checkCircle" className="h-4 w-4 text-green-600" /><span className="text-green-700">{q.options[chosen]}</span></>
                          ) : (
                            <><Icon name="close" className="h-4 w-4 text-red-600" /><span className="text-red-700">{q.options[chosen]}</span></>
                          )}
                        </p>
                        {!isCorrect ? (
                          <p className="mt-1 text-sm text-navy-600">
                            <span className="font-medium">Correct answer:</span> {q.options[q.correct]}
                          </p>
                        ) : null}
                      </div>
                    );
                  }
                  // text question
                  const answered = raw.trim() !== "";
                  return (
                    <div key={q.id} className={`rounded-xl border p-4 ${answered ? "border-navy-200 bg-white" : "border-navy-200 bg-navy-50/50"}`}>
                      <p className="text-sm font-medium text-navy-900">{q.question}</p>
                      <p className={`mt-2 whitespace-pre-wrap text-sm ${answered ? "text-navy-700" : "text-navy-400"}`}>
                        {answered ? raw : "Not answered"}
                      </p>
                      <p className="mt-1 text-xs text-navy-400">Open-ended — not scored</p>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </AdminShell>
  );
}
