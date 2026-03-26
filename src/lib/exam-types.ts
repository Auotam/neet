export type Subject = "Physics" | "Chemistry" | "Botany" | "Zoology";

/** NTA-style: Section A compulsory; Section B internal choice (10 of 15 live). */
export type ExamSection = "A" | "B";

export interface ExamQuestion {
  id: string;
  subject: Subject;
  section: ExamSection;
  topic: string;
  stem: string;
  options: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  /** PYQ-like framing, NCERT-heavy stems, or forward-looking prediction */
  flavor: "pyq-pattern" | "ncert-heavy" | "predicted";
}

export interface ExamPaper {
  slug: string;
  title: string;
  blurb: string;
  /** Full-paper duration (official NEET: 180 minutes). */
  durationMinutes: number;
  questions: ExamQuestion[];
}

/** Official-style scoring: +4 correct, −1 incorrect, 0 unattempted; max 720. */
export const NEET_MARKS = {
  correct: 4,
  incorrect: -1,
  unattempted: 0,
  maxScore: 720,
} as const;
