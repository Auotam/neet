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
  /** Booklet / hall paper feel — open exam with `?paper=1` (good on iPad) */
  paperMode?: boolean;
};

export function ExamRunner({
  paper,
  singleSessionHint,
  interactionMode = "tap",
  paperMode = false,
}: Props) {
  const searchParams = useSearchParams();

  const effectiveInteraction = paperMode ? "tap" : interactionMode;

  useEffect(() => {
    if (!paperMode) return;
    const root = document.documentElement;
    const body = document.body;
    root.classList.add("paper-exam");
    body.classList.add("paper-exam");
    return () => {
      root.classList.remove("paper-exam");
      body.classList.remove("paper-exam");
    };
  }, [paperMode]);

  const examHref = useCallback(
    (mode: ExamInteractionMode) => {
      const q = new URLSearchParams(searchParams?.toString() ?? "");
      if (mode === "voice") q.set("interaction", "voice");
      else q.delete("interaction");
      if (paperMode) q.set("paper", "1");
      const s = q.toString();
      return `/exam/${paper.slug}${s ? `?${s}` : ""}`;
    },
    [paper.slug, searchParams, paperMode],
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
  const pendingScrollIndexRef = useRef<number | null>(null);
  const questionRefs = useRef<Record<number, HTMLElement | null>>({});

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

  useEffect(() => {
    if (!paperMode) return;
    const target = pendingScrollIndexRef.current;
    if (target === null || target === undefined) return;
    const el = questionRefs.current[target];
    if (!el) return;
    pendingScrollIndexRef.current = null;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [index, paperMode]);

  const q = paper.questions[index];
  const labels = ["A", "B", "C", "D"] as const;

  function select(questionIndex: number, opt: 0 | 1 | 2 | 3) {
    if (attemptClosed) return;
    if (questionIndex !== index) {
      setIndex(questionIndex);
    }
    setAnswers((prev) => {
      const prevAns = prev[questionIndex];
      if (
        prevAns !== undefined &&
        prevAns !== null &&
        prevAns !== opt
      ) {
        optionChangesRef.current[questionIndex] =
          (optionChangesRef.current[questionIndex] || 0) + 1;
      }
      return { ...prev, [questionIndex]: opt };
    });
  }

  function goTo(i: number) {
    const next = Math.max(0, Math.min(paper.questions.length - 1, i));
    if (paperMode) pendingScrollIndexRef.current = next;
    setIndex(next);
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const warnSoon = !attemptClosed && secondsLeft > 0 && secondsLeft <= 600;

  const timerClassName = paperMode
    ? `flex min-h-11 shrink-0 items-center rounded-sm border-2 px-3 py-2 text-xs font-medium tabular-nums sm:text-sm ${
        warnSoon
          ? "border-amber-700 bg-amber-100 text-amber-950"
          : secondsLeft === 0 && !attemptClosed
            ? "border-rose-700 bg-rose-100 text-rose-950"
            : "border-stone-600 bg-[#fffef9] text-stone-900"
      }`
    : `flex min-h-11 shrink-0 items-center rounded-2xl border px-3 py-2 text-xs font-medium tabular-nums sm:text-sm ${
        warnSoon
          ? "border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-500/60 dark:bg-amber-950/40 dark:text-amber-50"
          : secondsLeft === 0 && !attemptClosed
            ? "border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-500/60 dark:bg-rose-950/40 dark:text-rose-100"
            : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
      }`;

  return (
    <div
      className={
        paperMode
          ? "mx-auto max-w-6xl px-4 pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(6.5rem,calc(5.5rem+env(safe-area-inset-bottom,0px)))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] text-stone-900"
          : "mx-auto max-w-6xl px-4 pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(6.5rem,calc(5.5rem+env(safe-area-inset-bottom,0px)))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] text-zinc-900 dark:text-zinc-100"
      }
    >
      <header
        className={
          (paperMode
            ? "exam-top-header mb-6 w-full min-w-0 border-b border-stone-400 pb-5"
            : "exam-top-header mb-8 w-full min-w-0 border-b border-zinc-200 pb-6 dark:border-zinc-800")
        }
      >
        <div className="w-full min-w-0">
          <p
            className={
              paperMode
                ? "text-xs font-semibold uppercase tracking-widest text-stone-600"
                : "text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-300"
            }
          >
            {paperMode
              ? "NEET UG · booklet view (paper-style)"
              : "NEET UG · full paper practice"}
          </p>
          <h1
            className={
              paperMode
                ? "mt-1 font-serif text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl"
                : "mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
            }
          >
            {paper.title}
          </h1>
          {singleSessionHint && !attemptClosed && (
            <p
              className={
                paperMode
                  ? "mt-2 rounded-lg border border-stone-400 bg-[#fffef9] px-3 py-2 text-sm text-stone-900"
                  : "mt-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100"
              }
            >
              One full paper: work through all 180. When you finish, tap{" "}
              <span className="font-semibold">Submit</span> in the bar at the
              bottom for your score and tips.
            </p>
          )}
          {!paperMode && (
            <>
              <p className="mt-2 w-full max-w-none text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {paper.blurb}
              </p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                Marking: +{NEET_MARKS.correct} each correct ·{" "}
                {NEET_MARKS.incorrect} each wrong · {NEET_MARKS.unattempted}{" "}
                unattempted · max {NEET_MARKS.maxScore}.
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
            </>
          )}
          {paperMode && !attemptClosed && (
            <p className="mt-3 text-sm leading-relaxed text-stone-700">
              Tap circles (A-D) directly in the subject section below. All 45
              questions for the selected subject are shown together for
              continuous solving.
            </p>
          )}
        </div>
      </header>

      <nav
        className={
          paperMode
            ? "exam-subject-nav sticky top-0 z-20 -mx-4 mb-6 border-b border-stone-400 bg-[#ebe6dc]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[#ebe6dc]/90"
            : "sticky top-0 z-20 -mx-4 mb-6 border-b border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/95 dark:supports-[backdrop-filter]:bg-zinc-950/80"
        }
        aria-label="Jump to subject section"
      >
        <p
          className={
            paperMode
              ? "mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-stone-600"
              : "mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400"
          }
        >
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
                  paperMode
                    ? active
                      ? "border-stone-800 bg-stone-800 text-[#fffef9] shadow-sm"
                      : "border-stone-400 bg-[#fffef9] text-stone-900 hover:border-stone-600 hover:bg-stone-100"
                    : active
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600"
                      : "border-zinc-300 bg-white text-zinc-800 hover:border-emerald-400 hover:bg-emerald-50/80 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40",
                ].join(" ")}
              >
                <span className="block font-semibold">{block.subject}</span>
                <span
                  className={
                    paperMode
                      ? active
                        ? "block text-[10px] text-stone-200 sm:text-xs"
                        : "block text-[10px] text-stone-600 sm:text-xs"
                      : active
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

      {effectiveInteraction === "voice" && (
        <div className="mb-6">
          <VoiceExamPanel
            question={q}
            questionIndex={index}
            totalQuestions={paper.questions.length}
            attemptClosed={attemptClosed}
            onAnswer={(opt) => select(index, opt)}
            onNext={() =>
              goTo(Math.min(paper.questions.length - 1, index + 1))
            }
            onPrev={() => goTo(Math.max(0, index - 1))}
          />
        </div>
      )}

      {attemptClosed && insightsReport && (
        <div
          className={
            paperMode
              ? "mb-6 rounded-lg border border-stone-500 bg-[#fffef9] p-4 text-sm text-stone-900"
              : "mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/40"
          }
        >
          <p
            className={
              paperMode
                ? "font-medium text-stone-900"
                : "font-medium text-emerald-950 dark:text-emerald-100"
            }
          >
            NEET-style score · {insightsReport.score} / {NEET_MARKS.maxScore} ·
            correct {insightsReport.correct} · wrong {insightsReport.wrong} ·
            unattempted {insightsReport.unattempted}
          </p>
          <p
            className={
              paperMode
                ? "mt-1 text-stone-700"
                : "mt-1 text-emerald-900/80 dark:text-emerald-100/80"
            }
          >
            Review questions below, then scroll to the bottom for your full
            improvement plan (timing, behaviour, topics).
          </p>
        </div>
      )}

      {!attemptClosed && (
        <div
          className={
            paperMode
              ? "mb-6 rounded-lg border border-dashed border-stone-500 bg-[#f5f0e8]/80 p-3 text-xs text-stone-700"
              : "mb-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400"
          }
        >
          Your clicks and time on each question are recorded only in this
          browser until you submit — nothing is sent to a server.
        </div>
      )}

      <div
        className={
          paperMode
            ? "grid gap-6"
            : "grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] md:gap-8"
        }
      >
        <article
          className={
            paperMode
              ? "rounded-sm border-2 border-stone-400 bg-[#fffef9] p-5 shadow-[0_2px_8px_rgba(28,25,23,0.08),0_12px_28px_rgba(28,25,23,0.06)] sm:p-7"
              : "rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-950"
          }
        >
          {!paperMode && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-zinc-100 px-3 py-1 font-semibold dark:bg-zinc-900">
                  Q{index + 1} / {paper.questions.length}
                </span>
                <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-900">
                  {q.subject}
                </span>
                <span
                  className={`rounded-sm px-3 py-1 font-semibold ${
                    q.section === "A"
                      ? "rounded-full bg-sky-100 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100"
                      : "rounded-full bg-violet-100 text-violet-950 dark:bg-violet-950/50 dark:text-violet-100"
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
                        onClick={() => select(index, i as 0 | 1 | 2 | 3)}
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
            </>
          )}

          {paperMode && (
            <div className="paper-screen-only space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-sm border border-stone-500 bg-stone-200/80 px-2 py-1 font-semibold text-stone-900">
                  {subjectBlocks[activeSubjectTab]?.subject}
                </span>
                <span className="rounded-sm border border-stone-400 bg-stone-100 px-2 py-1 text-stone-800">
                  Q{subjectBlocks[activeSubjectTab]?.start + 1}-
                  {subjectBlocks[activeSubjectTab]?.end + 1}
                </span>
              </div>
              {paper.questions
                .map((question, qi) => ({ question, qi }))
                .filter(
                  ({ qi }) =>
                    qi >= subjectBlocks[activeSubjectTab].start &&
                    qi <= subjectBlocks[activeSubjectTab].end,
                )
                .map(({ question, qi }) => (
                  <section
                    key={question.id}
                    ref={(el) => {
                      questionRefs.current[qi] = el;
                    }}
                    className="scroll-mt-28 border-b border-stone-300 pb-4 last:border-0"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-sm border border-stone-500 bg-stone-200/80 px-2 py-1 font-semibold text-stone-900">
                        Q{qi + 1} / {paper.questions.length}
                      </span>
                      <span
                        className={`rounded-sm border px-2 py-1 font-semibold ${
                          question.section === "A"
                            ? "border-sky-700 bg-sky-100 text-sky-950"
                            : "border-violet-700 bg-violet-100 text-violet-950"
                        }`}
                      >
                        Sec {question.section}
                      </span>
                      <span className="rounded-sm border border-stone-400 bg-[#f5f0e8] px-2 py-1 text-stone-800">
                        {question.topic}
                      </span>
                    </div>
                    <p className="mt-3 font-serif text-[1rem] leading-[1.55] text-stone-900">
                      {question.stem}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {question.options.map((opt, i) => {
                        const picked = answers[qi] === i;
                        const isCorrect = i === question.answerIndex;
                        const show = revealAnswers && attemptClosed;
                        const omrBase =
                          "flex min-h-[2.5rem] w-full touch-manipulation items-start gap-2 rounded-md border bg-[#fffef9] px-2.5 py-2 text-left text-sm transition";
                        const omrIdle =
                          "border-stone-400 hover:border-stone-600 hover:bg-stone-50";
                        const omrPick =
                          "border-stone-900 bg-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]";
                        const omrCorrect =
                          "border-emerald-700 bg-emerald-50 text-stone-900";
                        const omrWrong =
                          "border-rose-600 bg-rose-50 text-stone-900";
                        let omrCls = omrBase + " " + omrIdle;
                        if (!show && picked) omrCls = omrBase + " " + omrPick;
                        if (show && isCorrect) omrCls = omrBase + " " + omrCorrect;
                        if (show && picked && !isCorrect) omrCls = omrBase + " " + omrWrong;
                        const circleIdle =
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-stone-800 bg-white font-serif text-xs font-bold text-stone-900";
                        const circlePick =
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-stone-900 bg-stone-900 font-serif text-xs font-bold text-[#fffef9]";
                        const circleCorrect =
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-700 bg-emerald-700 font-serif text-xs font-bold text-white";
                        const circleWrong =
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-rose-600 bg-rose-600 font-serif text-xs font-bold text-white";
                        let circle = circleIdle;
                        if (!show && picked) circle = circlePick;
                        if (show && isCorrect) circle = circleCorrect;
                        if (show && picked && !isCorrect) circle = circleWrong;
                        return (
                          <li key={i}>
                            <button
                              type="button"
                              disabled={attemptClosed}
                              onClick={() => select(qi, i as 0 | 1 | 2 | 3)}
                              className={
                                omrCls + (attemptClosed ? " cursor-default opacity-95" : "")
                              }
                            >
                              <span className={circle}>{labels[i]}</span>
                              <span className="font-serif leading-snug text-stone-900">
                                {opt}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
            </div>
          )}

          {paperMode && (
            <div className="paper-print-only">
              <header className="mb-6 border-b border-stone-400 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-700">
                  NEET UG Question Paper
                </p>
                <h2 className="mt-1 font-serif text-xl font-semibold text-stone-950">
                  {paper.title}
                </h2>
                <p className="mt-1 text-xs text-stone-700">
                  Total questions: {paper.questions.length} · Duration:{" "}
                  {paper.durationMinutes} minutes
                </p>
              </header>
              <div className="space-y-5">
                {paper.questions.map((question, qi) => {
                  const isSubjectStart =
                    qi === 0 || paper.questions[qi - 1].subject !== question.subject;
                  return (
                    <section key={`${question.id}-print`} className="break-inside-avoid-page">
                      {isSubjectStart && (
                        <p className="mb-2 border-b border-stone-300 pb-1 font-serif text-sm font-semibold uppercase tracking-wide text-stone-900">
                          {question.subject}
                        </p>
                      )}
                      <p className="text-sm font-medium leading-relaxed text-stone-900">
                        Q{qi + 1}. {question.stem}
                      </p>
                      <ol className="mt-2 space-y-1.5 pl-5 text-sm text-stone-800">
                        {question.options.map((opt, i) => (
                          <li key={i} className="list-[lower-alpha] leading-relaxed">
                            {opt}
                          </li>
                        ))}
                      </ol>
                    </section>
                  );
                })}
              </div>
            </div>
          )}

          {!paperMode && <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
              className={
                paperMode
                  ? "min-h-11 touch-manipulation rounded-sm border-2 border-stone-600 bg-[#fffef9] px-5 py-2.5 text-sm font-medium text-stone-900 disabled:opacity-40 sm:min-h-0 sm:px-4 sm:py-2"
                  : "min-h-11 touch-manipulation rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium disabled:opacity-40 dark:border-zinc-700 sm:min-h-0 sm:px-4 sm:py-2"
              }
            >
              Previous
            </button>
            <button
              type="button"
              disabled={index === paper.questions.length - 1}
              onClick={() => goTo(index + 1)}
              className={
                paperMode
                  ? "min-h-11 touch-manipulation rounded-sm border-2 border-stone-900 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-[#fffef9] disabled:opacity-40 active:bg-stone-800 sm:min-h-0 sm:px-4 sm:py-2"
                  : "min-h-11 touch-manipulation rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 active:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:active:bg-zinc-200 sm:min-h-0 sm:px-4 sm:py-2"
              }
            >
              Next
            </button>
          </div>}
        </article>

        {!paperMode && (
        <aside
          className={
            paperMode
              ? "flex max-h-[min(28rem,55dvh)] flex-col rounded-sm border-2 border-stone-400 bg-[#f0ebe3] p-3 sm:p-4 md:sticky md:top-4 md:max-h-[calc(100dvh-5rem)]"
              : "flex max-h-[min(28rem,55dvh)] flex-col rounded-3xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-4 md:sticky md:top-4 md:max-h-[calc(100dvh-5rem)]"
          }
        >
          <p
            className={
              paperMode
                ? "text-xs font-semibold uppercase tracking-wider text-stone-600"
                : "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
            }
          >
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
                      paperMode
                        ? active
                          ? "border-2 border-stone-900 bg-stone-900 text-[#fffef9]"
                          : done
                            ? "border border-stone-600 bg-stone-300 text-stone-900"
                            : item.section === "B"
                              ? "border border-violet-700 bg-[#fffef9] text-violet-900"
                              : "border border-stone-500 bg-white text-stone-800"
                        : active
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

          <div
            className={
              paperMode
                ? "mt-4 space-y-2 border-t border-stone-500 pt-4 text-xs text-stone-700"
                : "mt-4 space-y-2 border-t border-zinc-200 pt-4 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
            }
          >
            <p>
              <span
                className={
                  paperMode
                    ? "font-semibold text-stone-900"
                    : "font-semibold text-zinc-800 dark:text-zinc-200"
                }
              >
                Official pattern:
              </span>{" "}
              45 each: Physics, Chemistry, Botany, Zoology. Per subject: Section
              A (35) then Section B (10).
            </p>
            <p>
              <span
                className={
                  paperMode
                    ? "font-semibold text-stone-900"
                    : "font-semibold text-zinc-800 dark:text-zinc-200"
                }
              >
                Map:
              </span>{" "}
              {paperMode
                ? "violet outline = Section B · grey fill = answered."
                : "violet ring = Section B · green fill = answered."}
            </p>
          </div>
        </aside>
        )}
      </div>

      {!attemptClosed && (
        <p
          className={
            paperMode
              ? "mt-8 text-center text-xs text-stone-600"
              : "mt-8 text-center text-xs text-zinc-500 dark:text-zinc-500"
          }
        >
          Live draft score (not final until submit): {totals.score} /{" "}
          {NEET_MARKS.maxScore} · {totals.answered} answered
        </p>
      )}

      {attemptClosed && insightsReport && (
        <div
          className={
            paperMode
              ? "mt-12 border-t border-stone-400 pt-10"
              : "mt-12 border-t border-zinc-200 pt-10 dark:border-zinc-800"
          }
        >
          <h2
            className={
              paperMode
                ? "mb-6 text-center text-sm font-semibold uppercase tracking-[0.2em] text-stone-600"
                : "mb-6 text-center text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
            }
          >
            End of paper — your debrief
          </h2>
          <AttemptInsightsPanel report={insightsReport} />
        </div>
      )}

      <div
        className={
          paperMode
            ? "fixed inset-x-0 bottom-0 z-50 border-t-2 border-stone-500 bg-[#ebe6dc]/98 px-2 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-6px_20px_rgba(28,25,23,0.1)] backdrop-blur-md print:hidden"
            : "fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-950/95 dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)] print:hidden"
        }
        role="region"
        aria-label="Exam timer and actions"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3">
          <div className={timerClassName} aria-live="polite">
            {attemptClosed ? (
              <span
                className={
                  paperMode ? "text-stone-700" : "text-zinc-600 dark:text-zinc-400"
                }
              >
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
                className={
                  paperMode
                    ? "min-h-11 touch-manipulation rounded-sm border-2 border-stone-900 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-[#fffef9] shadow-sm active:bg-stone-800 hover:bg-stone-800"
                    : "min-h-11 touch-manipulation rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm active:bg-emerald-800 hover:bg-emerald-700"
                }
              >
                <span className="sm:hidden">Submit &amp; score</span>
                <span className="hidden sm:inline">Submit for score &amp; tips</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRevealAnswers((r) => !r)}
                className={
                  paperMode
                    ? "min-h-11 touch-manipulation rounded-sm border-2 border-stone-600 bg-[#fffef9] px-4 py-2.5 text-sm font-medium text-stone-900 shadow-sm active:bg-stone-200 hover:bg-stone-100"
                    : "min-h-11 touch-manipulation rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm active:bg-zinc-100 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:active:bg-zinc-800 dark:hover:bg-zinc-800"
                }
              >
                <span className="sm:hidden">
                  {revealAnswers ? "Hide key" : "Show key"}
                </span>
                <span className="hidden sm:inline">
                  {revealAnswers ? "Hide answer colours" : "Show answer colours"}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className={
                paperMode
                  ? "inline-flex min-h-11 items-center justify-center touch-manipulation rounded-sm border-2 border-stone-600 bg-[#fffef9] px-4 py-2.5 text-sm font-semibold text-stone-900 active:bg-stone-200 hover:bg-stone-100"
                  : "inline-flex min-h-11 items-center justify-center touch-manipulation rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold active:bg-zinc-100 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:active:bg-zinc-800 dark:hover:bg-zinc-800"
              }
            >
              Print / save PDF
            </button>
            <Link
              href="/"
              className={
                paperMode
                  ? "inline-flex min-h-11 items-center justify-center touch-manipulation rounded-sm border-2 border-stone-600 bg-[#fffef9] px-4 py-2.5 text-sm font-semibold text-stone-900 active:bg-stone-200 hover:bg-stone-100"
                  : "inline-flex min-h-11 items-center justify-center touch-manipulation rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold active:bg-zinc-100 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:active:bg-zinc-800 dark:hover:bg-zinc-800"
              }
            >
              All papers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
