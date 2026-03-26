import { EXAM_PAPER_COUNT } from "@/data/mcq-engine";

/** Deterministic "one paper today" choice — same calendar day → same slug. */
export function getTodaysPaperSlug(): string {
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = Math.imul(31, h) + key.charCodeAt(i) || 0;
  const idx = (Math.abs(h) % EXAM_PAPER_COUNT) + 1;
  return `paper-${String(idx).padStart(2, "0")}`;
}
