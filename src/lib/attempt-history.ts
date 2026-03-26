/** Persist recent full-paper attempts locally (per device). */

export const ATTEMPT_HISTORY_KEY = "neet-exam-attempt-history";
export const MAX_HISTORY = 24;

export type AttemptHistoryEntry = {
  id: string;
  paperSlug: string;
  paperTitle: string;
  submittedAtMs: number;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  unattempted: number;
  totalQuestions: number;
  timeUsedSeconds: number;
  timeAllocatedSeconds: number;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function readAttemptHistory(): AttemptHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ATTEMPT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AttemptHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendAttemptHistory(entry: Omit<AttemptHistoryEntry, "id">) {
  if (typeof window === "undefined") return;
  const prev = readAttemptHistory();
  const next: AttemptHistoryEntry[] = [
    {
      ...entry,
      id: uid(),
    },
    ...prev,
  ].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(ATTEMPT_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}
