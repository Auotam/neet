"use client";

import { AttemptInsightsPanel } from "@/components/AttemptInsightsPanel";
import {
  type AnswerMap,
  buildImprovementReport,
  type ImprovementReport,
  type NavigationEvent,
} from "@/lib/attempt-analysis";
import { appendAttemptHistory } from "@/lib/attempt-history";
import type { ExamPaper, Subject } from "@/lib/exam-types";
import { NEET_MARKS } from "@/lib/exam-types";
import { VoiceExamPanel } from "@/components/VoiceExamPanel";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ExamInteractionMode = "tap" | "voice";

type Props = {
  paper: ExamPaper;
  /** Cousin / single-focus mode: shorter header copy */
  singleSessionHint?: boolean;
  /** Tap MCQs vs listen with device voice + speak answer */
  interactionMode?: ExamInteractionMode;
};

export function ExamRunner({
  paper,
  singleSessionHint,
  interactionMode = "tap",
}: Props) {
  const searchParams = useSearchParams();

  const examHref = useCallback(
    (mode: ExamInteractionMode) => {
      const q = new URLSearchParams(searchParams?.toString() ?? "");
      if (mode === "voice") q.set("interaction", "voice");
      else q.delete("interaction");
      const s = q.toString();
      return `/exam/${paper.slug}${s ? `?${s}` : ""}`;
    },
    [paper.slug, searchParams],
  );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [revealAnswers, setRevealAnswers] = useState(false);
  const [attemptClosed, setAttemptClosed] = useState(false);
  const [insightsReport, setInsightsReport] =
    useState<ImprovementReport | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(paper.durationMinutes * 60);

  const secondsLeftRef = useRef(secondsLeft);
  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const sessionStartRef = useRef(Date.now());
  const prevIndexRef = useRef<number | null>(null);
  const blockStartRef = useRef(Date.now());
  const timeAccumRef = useRef<Record<number, number>>({});
  const navigationsRef = useRef<NavigationEvent[]>([]);
  const landingsRef = useRef<Record<number, number>>({});
  const optionChangesRef = useRef<Record<number, number>>({});
  const finishOnceRef = useRef(false);

  useEffect(() => {
    if (attemptClosed) return;
    const now = Date.now();
    const prev = prevIndexRef.current;
    if (prev !== null) {
      const dt = now - blockStartRef.current;
      timeAccumRef.current[prev] =
        (timeAccumRef.current[prev] || 0) + dt;
      if (prev !== index) {
        navigationsRef.current.push({
          from: prev,
          to: index,
          atMs: now,
        });
      }
    } else {
      navigationsRef.current.push({ from: null, to: index, atMs: now });
    }
    landingsRef.current[index] = (landingsRef.current[index] || 0) + 1;
    prevIndexRef.current = index;
    blockStartRef.current = now;
  }, [index, attemptClosed]);

  useEffect(() => {
    if (attemptClosed) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [attemptClosed]);

  const totals = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let answered = 0;
    paper.questions.forEach((q, i) => {
      const a = answers[i];
      if (a === null || a === undefined) return;
      answered += 1;
      if (a === q.answerIndex) correct += 1;
      else wrong += 1;
    });
    const unattempted = paper.questions.length - answered;
    const score =
      correct * NEET_MARKS.correct + wrong * NEET_MARKS.incorrect;
    return {
      correct,
      wrong,
      answered,
      unattempted,
      total: paper.questions.length,
      score,
    };
  }, [answers, paper.questions]);

  const subjectBlocks = useMemo(() => {
    const blocks: { subject: Subject; start: number; end: number }[] = [];
    for (let i = 0; i < paper.questions.length; i++) {
      const sub = paper.questions[i].subject;
      const prevSub = i > 0 ? paper.questions[i - 1].subject : null;
      if (i === 0 || sub !== prevSub) {
        blocks.push({ subject: sub, start: i, end: i });
      } else {
        blocks[blocks.length - 1].end = i;
      }
    }
    return blocks;
  }, [paper.questions]);

  const activeSubjectTab = useMemo(() => {
    for (let b = subjectBlocks.length - 1; b >= 0; b--) {
      if (index >= subjectBlocks[b].start) return b;
    }
    return 0;
  }, [index, subjectBlocks]);

  const commitAttempt = useCallback(() => {
    if (finishOnceRef.current) return;
    finishOnceRef.current = true;
    const now = Date.now();
    const prev = prevIndexRef.current;
    if (prev !== null) {
      const dt = now - blockStartRef.current;
      timeAccumRef.current[prev] =
        (timeAccumRef.current[prev] || 0) + dt;
      blockStartRef.current = now;
    }
    const telemetry = {
      startedAtMs: sessionStartRef.current,
      submittedAtMs: now,
      durationSecondsAllocated: paper.durationMinutes * 60,
      timeRemainingSecondsAtSubmit: secondsLeftRef.current,
      navigations: navigationsRef.current.map((n) => ({ ...n })),
      timePerQuestionMs: { ...timeAccumRef.current },
      optionChangeCountPerQuestion: { ...optionChangesRef.current },
      landingsPerQuestion: { ...landingsRef.current },
    };
    const report = buildImprovementReport(
      paper,
      answersRef.current,
      telemetry,
    );
    setInsightsReport(report);
    appendAttemptHistory({
      paperSlug: report.examSession.paperSlug,
      paperTitle: report.examSession.paperTitle,
      submittedAtMs: report.examSession.submittedAtMs,
      score: report.score,
      maxScore: NEET_MARKS.maxScore,
      correct: report.correct,
      wrong: report.wrong,
      unattempted: report.unattempted,
      totalQuestions: report.examSession.questionsTotal,
      timeUsedSeconds: report.examSession.timeUsedSeconds,
      timeAllocatedSeconds: report.examSession.timeAllocatedSeconds,
    });
    setAttemptClosed(true);
    setRevealAnswers(true);
  }, [paper]);

  useEffect(() => {
    if (attemptClosed || secondsLeft > 0) return;
    commitAttempt();
  }, [secondsLeft, attemptClosed, commitAttempt]);

  const q = paper.questions[index];
  const labels = ["A", "B", "C", "D"] as const;

  function select(opt: 0 | 1 | 2 | 3) {
    if (attemptClosed) return;
    setAnswers((prev) => {
      const prevAns = prev[index];
      if (
        prevAns !== undefined &&
        prevAns !== null &&
        prevAns !== opt
      ) {
        optionChangesRef.current[index] =
          (optionChangesRef.current[index] || 0) + 1;
      }
      return { ...prev, [index]: opt };
    });
  }

  function goTo(i: number) {
    setIndex(() => Math.max(0, Math.min(paper.questions.length - 1, i)));
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const warnSoon = !attemptClosed && secondsLeft > 0 && secondsLeft <= 600;

  const timerClassName = `flex min-h-11 shrink-0 items-center rounded-2xl border px-3 py-2 text-xs font-medium tabular-nums sm:text-sm ${
    warnSoon
      ? "border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-500/60 dark:bg-amber-950/40 dark:text-amber-50"
      : secondsLeft === 0 && !attemptClosed
        ? "border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-500/60 dark:bg-rose-950/40 dark:text-rose-100"
        : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
  }`;

  return (
    <div
      className="mx-auto max-w-6xl px-4 pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(6.5rem,calc(5.5rem+env(safe-area-inset-bottom,0px)))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] text-zinc-900 dark:text-zinc-100"
    >
      <header className="mb-8 w-full min-w-0 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div className="w-full min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
            NEET UG · full paper practice
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {paper.title}
          </h1>
          {singleSessionHint && !attemptClosed && (
            <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
              One full paper: work through all 180. When you finish, tap{" "}
              <span className="font-semibold">Submit</span> in the bar at the
              bottom for your score and tips.
            </p>
          )}
          <p className="mt-2 w-full max-w-none text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {paper.blurb}
          </p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            Marking: +{NEET_MARKS.correct} each correct · {NEET_MARKS.incorrect}{" "}
            each wrong · {NEET_MARKS.unattempted} unattempted · max{" "}
            {NEET_MARKS.maxScore}.
          </p>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
            Timer and submit stay fixed at the bottom while you scroll.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={examHref("tap")}
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                interactionMode === "tap"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-zinc-300 bg-white text-zinc-800 hover:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              }`}
            >
              Standard mock (tap answers)
            </Link>
            <Link
              href={examHref("voice")}
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                interactionMode === "voice"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-zinc-300 bg-white text-zinc-800 hover:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              }`}
            >
              Listen &amp; speak answers
            </Link>
          </div>
        </div>
      </header>

      <nav
        className="sticky top-0 z-20 -mx-4 mb-6 border-b border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/95 dark:supports-[backdrop-filter]:bg-zinc-950/80"
        aria-label="Jump to subject section"
      >
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Sections (45 Q each)
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {subjectBlocks.map((block, bi) => {
            const active = bi === activeSubjectTab;
            const qFrom = block.start + 1;
            const qTo = block.end + 1;
            let answeredInBlock = 0;
            for (let j = block.start; j <= block.end; j++) {
              const a = answers[j];
              if (a !== null && a !== undefined) answeredInBlock += 1;
            }
            return (
              <button
                key={block.subject}
                type="button"
                onClick={() => goTo(block.start)}
                className={[
                  "min-h-12 min-w-[7.5rem] touch-manipulation rounded-2xl border px-3 py-2 text-left text-xs transition active:opacity-90 sm:min-h-0 sm:min-w-0 sm:text-sm",
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600"
                    : "border-zinc-300 bg-white text-zinc-800 hover:border-emerald-400 hover:bg-emerald-50/80 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40",
                ].join(" ")}
              >
                <span className="block font-semibold">{block.subject}</span>
                <span
                  className={
                    active
                      ? "block text-[10px] text-emerald-100 sm:text-xs"
                      : "block text-[10px] text-zinc-500 dark:text-zinc-400 sm:text-xs"
                  }
                >
                  Q{qFrom}–{qTo} · {answeredInBlock}/{qTo - qFrom + 1}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {interactionMode === "voice" && (
        <div className="mb-6">
          <VoiceExamPanel
            question={q}
            questionIndex={index}
            totalQuestions={paper.questions.length}
            attemptClosed={attemptClosed}
            onAnswer={select}
            onNext={() =>
              goTo(Math.min(paper.questions.length - 1, index + 1))
            }
            onPrev={() => goTo(Math.max(0, index - 1))}
          />
        </div>
      )}

      {attemptClosed && insightsReport && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/40">
          <p className="font-medium text-emerald-950 dark:text-emerald-100">
            NEET-style score · {insightsReport.score} / {NEET_MARKS.maxScore} ·
            correct {insightsReport.correct} · wrong {insightsReport.wrong} ·
            unattempted {insightsReport.unattempted}
          </p>
          <p className="mt-1 text-emerald-900/80 dark:text-emerald-100/80">
            Review questions below, then scroll to the bottom for your full
            improvement plan (timing, behaviour, topics).
          </p>
        </div>
      )}

      {!attemptClosed && (
        <div className="mb-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400">
          Your clicks and time on each question are recorded only in this
          browser until you submit — nothing is sent to a server.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] md:gap-8">
        <article className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-zinc-100 px-3 py-1 font-semibold dark:bg-zinc-900">
              Q{index + 1} / {paper.questions.length}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-900">
              {q.subject}
            </span>
            <span
              className={`rounded-full px-3 py-1 font-semibold ${
                q.section === "A"
                  ? "bg-sky-100 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100"
                  : "bg-violet-100 text-violet-950 dark:bg-violet-950/50 dark:text-violet-100"
              }`}
            >
              Sec {q.section}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-900">
              {q.topic}
            </span>
            <span className="rounded-full border border-dashed border-zinc-300 px-3 py-1 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              {q.flavor.replace("-", " ")}
            </span>
          </div>
          <p className="mt-5 text-base leading-relaxed">{q.stem}</p>
          <ul className="mt-6 space-y-3">
            {q.options.map((opt, i) => {
              const picked = answers[index] === i;
              const isCorrect = i === q.answerIndex;
              const show = revealAnswers && attemptClosed;
              const base =
                "flex min-h-[3rem] w-full touch-manipulation items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition sm:min-h-0";
              const idle =
                "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900";
              const selected =
                "border-emerald-500 bg-emerald-50 dark:border-emerald-500/70 dark:bg-emerald-950/30";
              const correct =
                "border-emerald-600 bg-emerald-50 dark:border-emerald-600/60 dark:bg-emerald-950/40";
              const wrong =
                "border-rose-400 bg-rose-50 dark:border-rose-500/60 dark:bg-rose-950/30";
              let cls = base + " " + idle;
              if (!show && picked) cls = base + " " + selected;
              if (show && isCorrect) cls = base + " " + correct;
              if (show && picked && !isCorrect) cls = base + " " + wrong;
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={attemptClosed}
                    onClick={() => select(i as 0 | 1 | 2 | 3)}
                    className={
                      cls +
                      (attemptClosed ? " cursor-default opacity-90" : "")
                    }
                  >
                    <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                      {labels[i]}
                    </span>
                    <span className="leading-relaxed">{opt}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
              className="min-h-11 touch-manipulation rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium disabled:opacity-40 dark:border-zinc-700 sm:min-h-0 sm:px-4 sm:py-2"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={index === paper.questions.length - 1}
              onClick={() => goTo(index + 1)}
              className="min-h-11 touch-manipulation rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 active:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:active:bg-zinc-200 sm:min-h-0 sm:px-4 sm:py-2"
            >
              Next
            </button>
          </div>
        </article>

        <aside className="flex max-h-[min(28rem,55dvh)] flex-col rounded-3xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-4 md:sticky md:top-4 md:max-h-[calc(100dvh-5rem)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Question map (180)
          </p>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]">
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-6">
              {paper.questions.map((item, i) => {
                const a = answers[i];
                const done = a !== null && a !== undefined;
                const active = i === index;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={`${item.subject} · Sec ${item.section}`}
                    onClick={() => goTo(i)}
                    className={[
                      "h-9 min-h-[2.25rem] touch-manipulation rounded-lg text-[11px] font-semibold tabular-nums transition active:scale-95 sm:h-8 sm:min-h-0",
                      active
                        ? "bg-emerald-600 text-white"
                        : done
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                          : item.section === "B"
                            ? "bg-white text-violet-800 ring-1 ring-violet-200 dark:bg-zinc-950 dark:text-violet-200 dark:ring-violet-900"
                            : "bg-white text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-200 dark:ring-zinc-800",
                    ].join(" ")}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            <p>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Official pattern:
              </span>{" "}
              45 each: Physics, Chemistry, Botany, Zoology. Per subject: Section
              A (35) then Section B (10).
            </p>
            <p>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Map:
              </span>{" "}
              violet ring = Section B · green fill = answered.
            </p>
          </div>
        </aside>
      </div>

      {!attemptClosed && (
        <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-500">
          Live draft score (not final until submit): {totals.score} /{" "}
          {NEET_MARKS.maxScore} · {totals.answered} answered
        </p>
      )}

      {attemptClosed && insightsReport && (
        <div className="mt-12 border-t border-zinc-200 pt-10 dark:border-zinc-800">
          <h2 className="mb-6 text-center text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            End of paper — your debrief
          </h2>
          <AttemptInsightsPanel report={insightsReport} />
        </div>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-950/95 dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)]"
        role="region"
        aria-label="Exam timer and actions"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3">
          <div className={timerClassName} aria-live="polite">
            {attemptClosed ? (
              <span className="text-zinc-600 dark:text-zinc-400">
                Timer stopped · submitted
              </span>
            ) : (
              <>
                <span className="hidden sm:inline">Timer · </span>
                <span className="sm:hidden">⏱ </span>
                {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")} /{" "}
                {paper.durationMinutes} min
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-3">
            {!attemptClosed ? (
              <button
                type="button"
                onClick={commitAttempt}
                className="min-h-11 touch-manipulation rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm active:bg-emerald-800 hover:bg-emerald-700"
              >
                <span className="sm:hidden">Submit &amp; score</span>
                <span className="hidden sm:inline">Submit for score &amp; tips</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRevealAnswers((r) => !r)}
                className="min-h-11 touch-manipulation rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm active:bg-zinc-100 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:active:bg-zinc-800 dark:hover:bg-zinc-800"
              >
                <span className="sm:hidden">
                  {revealAnswers ? "Hide key" : "Show key"}
                </span>
                <span className="hidden sm:inline">
                  {revealAnswers ? "Hide answer colours" : "Show answer colours"}
                </span>
              </button>
            )}
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center touch-manipulation rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold active:bg-zinc-100 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:active:bg-zinc-800 dark:hover:bg-zinc-800"
            >
              All papers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
