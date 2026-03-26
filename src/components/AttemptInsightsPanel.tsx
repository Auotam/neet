import type { ImprovementReport, ReadinessParameter } from "@/lib/attempt-analysis";
import type { Subject } from "@/lib/exam-types";
import { NEET_MARKS } from "@/lib/exam-types";

type Props = { report: ImprovementReport };

const SUBJECT_ORDER: Subject[] = [
  "Physics",
  "Chemistry",
  "Botany",
  "Zoology",
];

function gradeStyles(grade: ReadinessParameter["grade"]) {
  if (grade === "strong") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-50";
  }
  if (grade === "ok") {
    return "border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
  }
  return "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900/50 dark:bg-rose-950/35 dark:text-rose-50";
}

function gradeLabel(grade: ReadinessParameter["grade"]) {
  if (grade === "strong") return "On track";
  if (grade === "ok") return "Fair";
  return "Focus here";
}

export function AttemptInsightsPanel({ report }: Props) {
  const { meta, examSession, timeManagement, readinessParameters } = report;
  const minsUsed = examSession.timeUsedSeconds / 60;
  const minsAlloc = examSession.timeAllocatedSeconds / 60;

  const submittedLabel = new Date(examSession.submittedAtMs).toLocaleString(
    undefined,
    { dateStyle: "medium", timeStyle: "short" },
  );

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-white p-6 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-zinc-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800 dark:text-emerald-200">
              Exam completed
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {examSession.paperTitle}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Submitted · {submittedLabel}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Timer · {minsUsed.toFixed(1)} / {minsAlloc.toFixed(0)} min (
              {examSession.percentTimeUsed}% of window used)
              {examSession.marksPerMinute != null
                ? ` · ~${examSession.marksPerMinute} marks/min while seated`
                : null}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200/80 bg-white/80 px-5 py-4 text-right dark:border-emerald-900/50 dark:bg-zinc-950/60">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Score
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {report.score}
              <span className="text-lg font-normal text-zinc-500">
                {" "}
                / {NEET_MARKS.maxScore}
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {report.correct} ok · {report.wrong} miss · {report.unattempted}{" "}
              blank
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">
          Result drivers
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Quick read on time, stamina, balance, and habits — not a prediction,
          just how this attempt looked on the key levers.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {readinessParameters.map((p) => (
            <li
              key={p.id}
              className={`rounded-2xl border p-4 text-sm ${gradeStyles(p.grade)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold leading-snug">{p.title}</span>
                <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:bg-zinc-950/50">
                  {gradeLabel(p.grade)}
                </span>
              </div>
              <p className="mt-2 leading-relaxed opacity-95">{p.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold tracking-tight">
          Time & pacing
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Share of focus time by subject (from active screen time), accuracy
          in each third of the paper (attempted items only), and behaviour
          flags.
        </p>

        <div className="mt-5 space-y-3">
          {SUBJECT_ORDER.map((sub) => {
            const pct = timeManagement.subjectTimePercent[sub];
            return (
              <div key={sub}>
                <div className="mb-1 flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {sub}
                  </span>
                  <span className="tabular-nums">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-emerald-500/80 dark:bg-emerald-500/70"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-900/50">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Thirds (accuracy, attempts only)
            </dt>
            <dd className="mt-1 font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
              Start {timeManagement.firstSegmentAccuracyPct ?? "—"}% · Mid{" "}
              {timeManagement.midSegmentAccuracyPct ?? "—"}% · End{" "}
              {timeManagement.lastSegmentAccuracyPct ?? "—"}%
            </dd>
          </div>
          <div className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-900/50">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Target pace (180 Q)
            </dt>
            <dd className="mt-1 font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
              ~{timeManagement.idealSecPerQuestion}s per question if flat
            </dd>
          </div>
          <div className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-900/50">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Rush vs stuck (wrongs)
            </dt>
            <dd className="mt-1 text-zinc-800 dark:text-zinc-100">
              &lt;8s: {timeManagement.fastWrongCount} · 90s+:{" "}
              {timeManagement.overthinkWrongCount}
            </dd>
          </div>
          <div className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-900/50">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Visited but blank
            </dt>
            <dd className="mt-1 font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
              {timeManagement.unattemptedButVisitedCount}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold tracking-tight">
          What to improve next
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Built from how you moved through the paper (time per question,
          jumps, and answer changes), not just the score.
        </p>
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
          {report.insights.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Behaviour snapshot
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              Avg time per question visited ·{" "}
              <span className="font-medium tabular-nums">
                {meta.avgSecPerQuestionOverall.toFixed(1)} s
              </span>
            </li>
            <li>
              Avg time when correct ·{" "}
              <span className="font-medium tabular-nums">
                {meta.avgSecWhenCorrect != null
                  ? `${meta.avgSecWhenCorrect.toFixed(1)} s`
                  : "—"}
              </span>
            </li>
            <li>
              Avg time when wrong ·{" "}
              <span className="font-medium tabular-nums">
                {meta.avgSecWhenWrong != null
                  ? `${meta.avgSecWhenWrong.toFixed(1)} s`
                  : "—"}
              </span>
            </li>
            <li>
              Option changes ·{" "}
              <span className="font-medium">{meta.totalOptionChanges}</span>
            </li>
            <li>
              Extra revisits to questions ·{" "}
              <span className="font-medium">{meta.totalRevisitExtra}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Marking recap
          </h3>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Scheme: +{NEET_MARKS.correct} correct · {NEET_MARKS.incorrect}{" "}
            wrong · 0 blank
          </p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Accuracy</th>
              <th className="px-4 py-3">Avg time (attempted)</th>
              <th className="px-4 py-3">Sec A (ok / tried)</th>
              <th className="px-4 py-3">Sec B (ok / tried)</th>
            </tr>
          </thead>
          <tbody>
            {report.subjectRows.map((row) => (
              <tr
                key={row.subject}
                className="border-b border-zinc-100 dark:border-zinc-800"
              >
                <td className="px-4 py-3 font-medium">{row.subject}</td>
                <td className="px-4 py-3 tabular-nums">{row.accuracyPct}%</td>
                <td className="px-4 py-3 tabular-nums">
                  {row.avgTimeSecOnAttempted != null
                    ? `${row.avgTimeSecOnAttempted.toFixed(1)} s`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {row.sectionA.correct}/{row.sectionA.attempted}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {row.sectionB.correct}/{row.sectionB.attempted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {report.weakTopics.length > 0 && (
        <section className="rounded-3xl border border-amber-200/80 bg-amber-50/60 p-5 dark:border-amber-900/50 dark:bg-amber-950/25">
          <h3 className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            Topics tied to misses or skips
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {report.weakTopics.map((t, i) => (
              <li
                key={`${t.subject}-${t.topic}-${i}`}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-950 ring-1 ring-amber-200 dark:bg-zinc-950 dark:text-amber-50 dark:ring-amber-900"
              >
                {t.topic} · {t.subject} · ×{t.missCount}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
