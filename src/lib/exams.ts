import { buildExamPapers } from "@/data/mcq-engine";
import type { ExamPaper } from "./exam-types";

export const EXAM_PAPERS: ExamPaper[] = buildExamPapers();

export function getExamBySlug(slug: string): ExamPaper | undefined {
  return EXAM_PAPERS.find((p) => p.slug === slug);
}

export function listExamSlugs(): string[] {
  return EXAM_PAPERS.map((p) => p.slug);
}
