/** Map simple speech (no AI) to exam actions for Web Speech API transcripts. */

export type VoiceCommand =
  | { type: "answer"; index: 0 | 1 | 2 | 3 }
  | { type: "repeat" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "none" };

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseVoiceCommand(raw: string): VoiceCommand {
  const t = norm(raw);
  if (!t) return { type: "none" };

  if (/\b(repeat|again|reread|read again|say again)\b/.test(t)) {
    return { type: "repeat" };
  }
  if (/\b(next|skip|forward|move on)\b/.test(t)) {
    return { type: "next" };
  }
  if (/\b(back|previous|go back|last question)\b/.test(t)) {
    return { type: "prev" };
  }

  // Letter answers — allow "option b", "answer c", Hindi-style "see" for C, etc.
  if (
    /^(option\s*)?a\b|^a\.?$|\banswer\s*a\b|\bfirst\b|\bone\b|^\s*1\s*$/.test(
      t,
    )
  ) {
    return { type: "answer", index: 0 };
  }
  if (
    /^(option\s*)?b\b|^b\.?$|\banswer\s*b\b|\bbee\b|\bsecond\b|\btwo\b|^\s*2\s*$/.test(
      t,
    )
  ) {
    return { type: "answer", index: 1 };
  }
  if (
    /^(option\s*)?c\b|^c\.?$|\banswer\s*c\b|\bcee\b|\bthird\b|\bthree\b|^\s*3\s*$/.test(
      t,
    ) ||
    /^see$/i.test(t)
  ) {
    return { type: "answer", index: 2 };
  }
  if (
    /^(option\s*)?d\b|^d\.?$|\banswer\s*d\b|\bdee\b|\bfourth\b|\bfour\b|^\s*4\s*$/.test(
      t,
    )
  ) {
    return { type: "answer", index: 3 };
  }

  // Single-char utterances often come back as just "a" etc.
  if (t.length === 1) {
    const ch = t;
    if (ch === "a") return { type: "answer", index: 0 };
    if (ch === "b") return { type: "answer", index: 1 };
    if (ch === "c") return { type: "answer", index: 2 };
    if (ch === "d") return { type: "answer", index: 3 };
  }

  return { type: "none" };
}
