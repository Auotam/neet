import type { ExamPaper, Subject } from "@/lib/exam-types";
import { NEET_MARKS } from "@/lib/exam-types";

export interface NavigationEvent {
  from: number | null;
  to: number;
  atMs: number;
}

export interface AttemptTelemetry {
  startedAtMs: number;
  submittedAtMs: number;
  durationSecondsAllocated: number;
  timeRemainingSecondsAtSubmit: number;
  navigations: NavigationEvent[];
  /** Active screen time accumulated per question (ms). */
  timePerQuestionMs: Record<number, number>;
  optionChangeCountPerQuestion: Record<number, number>;
  /** How many times the student landed on each question index. */
  landingsPerQuestion: Record<number, number>;
}

export type AnswerMap = Record<number, 0 | 1 | 2 | 3 | null | undefined>;

export interface SubjectBreakdown {
  subject: Subject;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  accuracyPct: number;
  avgTimeSecOnAttempted: number | null;
  sectionA: { attempted: number; correct: number; wrong: number };
  sectionB: { attempted: number; correct: number; wrong: number };
}

export interface TopicWeakness {
  topic: string;
  subject: Subject;
  missCount: number;
}

export interface ExamSessionSummary {
  paperSlug: string;
  paperTitle: string;
  submittedAtMs: number;
  timeUsedSeconds: number;
  timeAllocatedSeconds: number;
  /** 0–100 */
  percentTimeUsed: number;
  questionsTotal: number;
  /** Score gained per minute of exam time used */
  marksPerMinute: number | null;
}

export interface TimeManagementDetail {
  /** Approximate share of on-screen time per subject (sums ~100). */
  subjectTimePercent: Record<Subject, number>;
  firstSegmentAccuracyPct: number | null;
  midSegmentAccuracyPct: number | null;
  lastSegmentAccuracyPct: number | null;
  /** Wrong but under ~8 s on question — possible guess or rush */
  fastWrongCount: number;
  /** Wrong but very long dwell — likely stuck or overthinking */
  overthinkWrongCount: number;
  /** Saw the item but never selected an option */
  unattemptedButVisitedCount: number;
  /** Target seconds per question if the full timer were spread across all items */
  idealSecPerQuestion: number;
}

export interface ReadinessParameter {
  id: string;
  title: string;
  detail: string;
  grade: "strong" | "ok" | "needs work";
}

export interface ImprovementReport {
  telemetry: AttemptTelemetry;
  examSession: ExamSessionSummary;
  timeManagement: TimeManagementDetail;
  readinessParameters: ReadinessParameter[];
  score: number;
  correct: number;
  wrong: number;
  unattempted: number;
  subjectRows: SubjectBreakdown[];
  weakTopics: TopicWeakness[];
  /** Plain-language coaching points, most important first. */
  insights: string[];
  /** Quick stats for the summary line. */
  meta: {
    totalOptionChanges: number;
    totalRevisitExtra: number;
    avgSecPerQuestionOverall: number;
    avgSecWhenCorrect: number | null;
    avgSecWhenWrong: number | null;
  };
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function segmentAccuracy(
  paper: ExamPaper,
  answers: AnswerMap,
  from: number,
  to: number,
): number | null {
  let att = 0;
  let cor = 0;
  for (let i = from; i <= to && i < paper.questions.length; i++) {
    const a = answers[i];
    if (a === null || a === undefined) continue;
    att++;
    if (a === paper.questions[i].answerIndex) cor++;
  }
  if (att === 0) return null;
  return Math.round((100 * cor) / att);
}

export function buildImprovementReport(
  paper: ExamPaper,
  answers: AnswerMap,
  telemetry: AttemptTelemetry,
): ImprovementReport {
  const n = paper.questions.length;
  let correct = 0;
  let wrong = 0;
  let answered = 0;
  const topicMiss = new Map<string, { subject: Subject; missCount: number }>();

  const subjectBuckets = new Map<
    Subject,
    {
      attempted: number;
      correct: number;
      wrong: number;
      unattempted: number;
      timeMs: number[];
      secA: { attempted: number; correct: number; wrong: number };
      secB: { attempted: number; correct: number; wrong: number };
    }
  >();

  for (const s of [
    "Physics",
    "Chemistry",
    "Botany",
    "Zoology",
  ] as Subject[]) {
    subjectBuckets.set(s, {
      attempted: 0,
      correct: 0,
      wrong: 0,
      unattempted: 0,
      timeMs: [],
      secA: { attempted: 0, correct: 0, wrong: 0 },
      secB: { attempted: 0, correct: 0, wrong: 0 },
    });
  }

  const secCorrect = { time: [] as number[] };
  const secWrong = { time: [] as number[] };

  for (let i = 0; i < n; i++) {
    const q = paper.questions[i];
    const a = answers[i];
    const bucket = subjectBuckets.get(q.subject)!;
    const tms = telemetry.timePerQuestionMs[i] ?? 0;
    const topicKey = `${q.subject}::${q.topic}`;

    if (a === null || a === undefined) {
      bucket.unattempted += 1;
      const cur = topicMiss.get(topicKey) ?? { subject: q.subject, missCount: 0 };
      cur.missCount += 1;
      topicMiss.set(topicKey, cur);
      continue;
    }
    answered += 1;
    bucket.attempted += 1;
    bucket.timeMs.push(tms / 1000);
    const secPart = q.section === "A" ? bucket.secA : bucket.secB;
    secPart.attempted += 1;
    if (a === q.answerIndex) {
      correct += 1;
      bucket.correct += 1;
      secPart.correct += 1;
      secCorrect.time.push(tms / 1000);
    } else {
      wrong += 1;
      bucket.wrong += 1;
      secPart.wrong += 1;
      secWrong.time.push(tms / 1000);
      const cur = topicMiss.get(topicKey) ?? { subject: q.subject, missCount: 0 };
      cur.missCount += 1;
      topicMiss.set(topicKey, cur);
    }
  }

  const score = correct * NEET_MARKS.correct + wrong * NEET_MARKS.incorrect;

  const subjectRows: SubjectBreakdown[] = (
    ["Physics", "Chemistry", "Botany", "Zoology"] as Subject[]
  ).map((subject) => {
    const b = subjectBuckets.get(subject)!;
    const acc =
      b.attempted > 0 ? Math.round((100 * b.correct) / b.attempted) : 0;
    return {
      subject,
      attempted: b.attempted,
      correct: b.correct,
      wrong: b.wrong,
      unattempted: b.unattempted,
      accuracyPct: acc,
      avgTimeSecOnAttempted:
        b.attempted > 0 ? mean(b.timeMs.map((x) => x)) : null,
      sectionA: { ...b.secA },
      sectionB: { ...b.secB },
    };
  });

  const weakTopics: TopicWeakness[] = [...topicMiss.entries()]
    .map(([key, v]) => ({
      topic: key.split("::")[1],
      subject: v.subject,
      missCount: v.missCount,
    }))
    .filter((r) => r.missCount > 0)
    .sort((a, b) => b.missCount - a.missCount)
    .slice(0, 12);

  const totalOptionChanges = Object.values(
    telemetry.optionChangeCountPerQuestion,
  ).reduce((a, b) => a + b, 0);

  const landings = telemetry.landingsPerQuestion;
  let totalRevisitExtra = 0;
  for (let i = 0; i < n; i++) {
    const c = landings[i] ?? 0;
    if (c > 1) totalRevisitExtra += c - 1;
  }

  const timesAll = Object.values(telemetry.timePerQuestionMs).filter(
    (t) => t > 0,
  );
  const avgSecPerQuestionOverall =
    timesAll.length > 0
      ? mean(timesAll.map((ms) => ms / 1000)) ?? 0
      : 0;

  const avgSecWhenCorrect = mean(secCorrect.time);
  const avgSecWhenWrong = mean(secWrong.time);

  const unattempted = n - answered;

  const timeUsedSeconds =
    telemetry.durationSecondsAllocated - telemetry.timeRemainingSecondsAtSubmit;
  const percentTimeUsed =
    telemetry.durationSecondsAllocated > 0
      ? Math.round(
          (100 * Math.min(timeUsedSeconds, telemetry.durationSecondsAllocated)) /
            telemetry.durationSecondsAllocated,
        )
      : 0;

  const marksPerMinute =
    timeUsedSeconds >= 30
      ? Math.round((score / timeUsedSeconds) * 600) / 10
      : null;

  const subjectTimeTotals: Record<Subject, number> = {
    Physics: 0,
    Chemistry: 0,
    Botany: 0,
    Zoology: 0,
  };
  let totalQuestionTimeMs = 0;
  for (let i = 0; i < n; i++) {
    const ms = telemetry.timePerQuestionMs[i] ?? 0;
    totalQuestionTimeMs += ms;
    subjectTimeTotals[paper.questions[i].subject] += ms;
  }
  const subjectTimePercent = {} as Record<Subject, number>;
  for (const s of [
    "Physics",
    "Chemistry",
    "Botany",
    "Zoology",
  ] as Subject[]) {
    subjectTimePercent[s] =
      totalQuestionTimeMs > 0
        ? Math.round((1000 * subjectTimeTotals[s]) / totalQuestionTimeMs) / 10
        : 25;
  }

  const third = Math.floor(n / 3);
  const firstSegmentAccuracyPct = segmentAccuracy(paper, answers, 0, third - 1);
  const midSegmentAccuracyPct = segmentAccuracy(
    paper,
    answers,
    third,
    2 * third - 1,
  );
  const lastSegmentAccuracyPct = segmentAccuracy(paper, answers, 2 * third, n - 1);

  const FAST_SEC = 8;
  const SLOW_SEC = 90;
  let fastWrongCount = 0;
  let overthinkWrongCount = 0;
  for (let i = 0; i < n; i++) {
    const a = answers[i];
    if (a === null || a === undefined) continue;
    if (a === paper.questions[i].answerIndex) continue;
    const sec = (telemetry.timePerQuestionMs[i] ?? 0) / 1000;
    if (sec < FAST_SEC) fastWrongCount++;
    if (sec > SLOW_SEC) overthinkWrongCount++;
  }

  let unattemptedButVisitedCount = 0;
  for (let i = 0; i < n; i++) {
    const a = answers[i];
    if (a !== null && a !== undefined) continue;
    if ((telemetry.landingsPerQuestion[i] ?? 0) >= 1) {
      unattemptedButVisitedCount++;
    }
  }

  const idealSecPerQuestion =
    telemetry.durationSecondsAllocated > 0 && n > 0
      ? Math.round((telemetry.durationSecondsAllocated / n) * 10) / 10
      : 0;

  const examSession: ExamSessionSummary = {
    paperSlug: paper.slug,
    paperTitle: paper.title,
    submittedAtMs: telemetry.submittedAtMs,
    timeUsedSeconds,
    timeAllocatedSeconds: telemetry.durationSecondsAllocated,
    percentTimeUsed,
    questionsTotal: n,
    marksPerMinute,
  };

  const timeManagement: TimeManagementDetail = {
    subjectTimePercent,
    firstSegmentAccuracyPct,
    midSegmentAccuracyPct,
    lastSegmentAccuracyPct,
    fastWrongCount,
    overthinkWrongCount,
    unattemptedButVisitedCount,
    idealSecPerQuestion,
  };

  const readinessParameters: ReadinessParameter[] = [];

  const timeGrade: ReadinessParameter["grade"] =
    unattempted >= 20
      ? "needs work"
      : percentTimeUsed < 85 && unattempted >= 8
        ? "needs work"
        : percentTimeUsed >= 92
          ? "ok"
          : "strong";
  readinessParameters.push({
    id: "time",
    title: "Time use & coverage",
    detail:
      unattempted >= 20
        ? `${unattempted} blanks — priority is touching every question once before deep work.`
        : percentTimeUsed < 80 && telemetry.timeRemainingSecondsAtSubmit > 180
          ? `Finished with ${Math.floor(telemetry.timeRemainingSecondsAtSubmit / 60)}+ minutes left while blanks remain — tighten a final sweep habit.`
          : `Used ~${percentTimeUsed}% of the window; ${unattempted} unanswered.`,
    grade: timeGrade,
  });

  let paceGrade: ReadinessParameter["grade"] = "ok";
  if (
    (avgSecWhenWrong !== null &&
      avgSecWhenCorrect !== null &&
      wrong >= 6 &&
      avgSecWhenWrong < avgSecWhenCorrect * 0.7) ||
    fastWrongCount >= 15 ||
    (totalOptionChanges > 70 && wrong >= 8) ||
    (overthinkWrongCount >= 12 && wrong >= 10)
  ) {
    paceGrade = "needs work";
  } else if (wrong < 22 && fastWrongCount < 10 && overthinkWrongCount < 14) {
    paceGrade = "strong";
  }
  readinessParameters.push({
    id: "pace",
    title: "Answering pace vs mistakes",
    detail:
      paceGrade === "needs work"
        ? `Wrong answers skewed fast or indecisive (${fastWrongCount} under ~8s; ${overthinkWrongCount} after 90s+). Use a quick stem scan, then either commit or flag for the final sweep.`
        : `Pace versus error pattern looks under control for this attempt.`,
    grade: paceGrade,
  });

  const segVals = [
    firstSegmentAccuracyPct,
    midSegmentAccuracyPct,
    lastSegmentAccuracyPct,
  ].filter((x): x is number => x !== null);
  const segSpread =
    segVals.length >= 2 ? Math.max(...segVals) - Math.min(...segVals) : 0;
  let staminaGrade: ReadinessParameter["grade"] = "ok";
  if (
    firstSegmentAccuracyPct !== null &&
    lastSegmentAccuracyPct !== null &&
    lastSegmentAccuracyPct + 18 < firstSegmentAccuracyPct &&
    answered > 100
  ) {
    staminaGrade = "needs work";
  } else if (segSpread >= 25 && answered > 100) {
    staminaGrade = "needs work";
  } else if (segSpread <= 14 && answered > 120) {
    staminaGrade = "strong";
  }
  readinessParameters.push({
    id: "stamina",
    title: "Stamina & thirds of the paper",
    detail:
      staminaGrade === "needs work"
        ? `Accuracy varied across the paper (spread ~${segSpread} pts between best and worst third). Build 3-hour endurance and a short reset after ~120 questions.`
        : `First / middle / last thirds (attempted only): ${firstSegmentAccuracyPct ?? "—"}% · ${midSegmentAccuracyPct ?? "—"}% · ${lastSegmentAccuracyPct ?? "—"}%.`,
    grade: staminaGrade,
  });

  const accs = subjectRows.map((r) => r.accuracyPct);
  const accSpread =
    accs.length >= 2 ? Math.max(...accs) - Math.min(...accs) : 0;
  const balanceGrade: ReadinessParameter["grade"] =
    accSpread <= 15 ? "strong" : accSpread <= 28 ? "ok" : "needs work";
  readinessParameters.push({
    id: "balance",
    title: "Subject balance",
    detail:
      accSpread >= 28
        ? `Largest gap between subjects is ~${accSpread} pts on accuracy — tilt revision + drills toward the weaker one this week.`
        : `Subjects are in a workable range — keep rotating so none drifts.`,
    grade: balanceGrade,
  });

  const decisionGrade: ReadinessParameter["grade"] =
    totalOptionChanges > 55 || totalRevisitExtra > 60
      ? "needs work"
      : totalOptionChanges < 28 && totalRevisitExtra < 28 && wrong < 32
        ? "strong"
        : "ok";
  readinessParameters.push({
    id: "decisions",
    title: "Decisions & navigation",
    detail: `${totalOptionChanges} option changes and ${totalRevisitExtra} extra revisits across the paper.`,
    grade: decisionGrade,
  });

  const coverageGrade: ReadinessParameter["grade"] =
    unattemptedButVisitedCount >= 25
      ? "needs work"
      : unattemptedButVisitedCount >= 12
        ? "ok"
        : "strong";
  readinessParameters.push({
    id: "coverage",
    title: "Visited but still blank",
    detail:
      unattemptedButVisitedCount > 0
        ? `${unattemptedButVisitedCount} items were opened but never marked — add a “first pass” guess so they are eligible for a final sweep.`
        : `No visited-and-left-blank pattern — strong.`,
    grade: coverageGrade,
  });

  const insights: string[] = [];

  const rankedSubjects = [...subjectRows].sort(
    (a, b) => a.accuracyPct - b.accuracyPct,
  );
  const weakest = rankedSubjects[0];
  const strongest = rankedSubjects[rankedSubjects.length - 1];

  if (weakest && weakest.attempted >= 8 && weakest.accuracyPct < 70) {
    insights.push(
      `Priority subject: ${weakest.subject}. You scored roughly ${weakest.accuracyPct}% on attempted items—re-read NCERT for this block and do a dedicated 45-question timed drill before the next full mock.`,
    );
  }

  if (strongest && strongest.attempted >= 8 && strongest.accuracyPct >= 85) {
    insights.push(
      `${strongest.subject} looks relatively strong (${strongest.accuracyPct}% on attempts). Maintain it with short revision so time can shift to weaker areas.`,
    );
  }

  for (const row of subjectRows) {
    const aAtt = row.sectionA.attempted;
    const bAtt = row.sectionB.attempted;
    if (aAtt < 5 || bAtt < 3) continue;
    const aAcc = row.sectionA.correct / row.sectionA.attempted;
    const bAcc = row.sectionB.correct / row.sectionB.attempted;
    if (bAcc + 0.12 < aAcc) {
      insights.push(
        `${row.subject}: Section B was weaker than Section A. Add mixed assertion-reason and multi-step problems for this subject until B feels as natural as A.`,
      );
    }
  }

  if (unattempted >= 25) {
    insights.push(
      `${unattempted} questions were left blank. On the next attempt, aim to mark a first pass choice on every question in the first 2.5 hours, then use leftover minutes only on unsure items.`,
    );
  } else if (unattempted >= 10 && telemetry.timeRemainingSecondsAtSubmit > 300) {
    insights.push(
      `You had several blanks but time still on the clock at submit. Build a habit: with ~20–25 minutes left, sweep only unattempted items once.`,
    );
  }

  if (
    avgSecWhenCorrect !== null &&
    avgSecWhenWrong !== null &&
    wrong >= 8 &&
    avgSecWhenWrong < avgSecWhenCorrect * 0.75
  ) {
    insights.push(
      `Wrong answers were answered faster on average than correct ones. Pause 5–10 seconds to re-check units and stem keywords before locking an option.`,
    );
  }

  if (
    avgSecWhenCorrect !== null &&
    avgSecWhenWrong !== null &&
    wrong >= 6 &&
    avgSecWhenWrong > avgSecWhenCorrect * 1.35
  ) {
    insights.push(
      `You lingered longer on items you still missed—those are likely concept gaps. Note the topics below and revise theory before attempting another full paper.`,
    );
  }

  if (totalRevisitExtra > 45) {
    insights.push(
      `Navigation was jumpy (${totalRevisitExtra} extra returns to questions). Try “one forward pass + one review pass” instead of hopping many times, which costs time and focus.`,
    );
  }

  if (totalOptionChanges > 55) {
    insights.push(
      `Many answer changes (${totalOptionChanges} total). Practice ruling out two options quickly, then decide; if still unsure, mark for the final sweep instead of cycling options repeatedly.`,
    );
  }

  if (weakTopics.length >= 3) {
    const top = weakTopics.slice(0, 5);
    insights.push(
      `Topic hotspots to revise next: ${top.map((t) => `${t.topic} (${t.subject})`).join(", ")}.`,
    );
  }

  if (fastWrongCount >= 10) {
    insights.push(
      `${fastWrongCount} wrongs came after very little time on the item — cut blind guesses; mark and return in the final pass instead.`,
    );
  }

  if (overthinkWrongCount >= 8) {
    insights.push(
      `${overthinkWrongCount} wrongs after long dwell (90s+) — set a mental cap, move on, and revise that topic in drills; the exam rarely rewards endless staring.`,
    );
  }

  if (
    firstSegmentAccuracyPct !== null &&
    lastSegmentAccuracyPct !== null &&
    lastSegmentAccuracyPct + 15 < firstSegmentAccuracyPct
  ) {
    insights.push(
      `Accuracy slipped in the last third versus the start. Schedule more contiguous 3-hour mocks and a short reset (stretch, water) after ~120 questions.`,
    );
  }

  if (unattemptedButVisitedCount >= 15) {
    insights.push(
      `${unattemptedButVisitedCount} questions were opened but never marked — on round one, put a provisional option whenever you can rule out even one choice.`,
    );
  }

  if (insights.length === 0) {
    insights.push(
      `Solid balanced attempt. Keep a weekly full-timer; log mistakes in a notebook by topic so patterns show up over multiple mocks.`,
    );
  }

  return {
    telemetry,
    examSession,
    timeManagement,
    readinessParameters,
    score,
    correct,
    wrong,
    unattempted,
    subjectRows,
    weakTopics,
    insights,
    meta: {
      totalOptionChanges,
      totalRevisitExtra,
      avgSecPerQuestionOverall,
      avgSecWhenCorrect,
      avgSecWhenWrong,
    },
  };
}
