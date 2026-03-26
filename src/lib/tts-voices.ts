/** Pick the nicest-sounding built-in TTS voices the browser exposes (varies by OS). */

export const TTS_SLOT_COUNT = 4;

export type TTSVoiceSlot = {
  /** Stable index 0..3 */
  slotIndex: number;
  /** Short label for UI */
  title: string;
  /** Subtitle: engine / language hint */
  subtitle: string;
  /** How we tuned rate/pitch for this slot */
  styleTag: string;
  voice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
};

const STORAGE_KEY = "neet-tts-slot-index";

export function readStoredSlotIndex(): number {
  if (typeof window === "undefined") return 0;
  const n = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
  if (Number.isNaN(n) || n < 0 || n >= TTS_SLOT_COUNT) return 0;
  return n;
}

export function writeStoredSlotIndex(i: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(i));
}

function isEnglish(v: SpeechSynthesisVoice): boolean {
  const l = v.lang.toLowerCase().replace("_", "-");
  return (
    l.startsWith("en") ||
    l === "" // some engines omit lang
  );
}

/** Higher = try first for a more natural read. */
function qualityScore(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/neural|natural speech|premium|enhanced|wavenet|wave-net|generative/.test(n))
    s += 40;
  if (/google(?! translate)/i.test(n)) s += 18;
  if (/microsoft.*(aria|jenny|guy|sonia|libby|ryan|ashley|anshi)/i.test(n))
    s += 14;
  if (/samantha|karen|daniel|fiona|moira|tessa|veena|audrey/.test(n)) s += 12;
  if (!v.localService) s += 10;
  if (/english.*india|en-in|en_in/i.test(v.lang)) s += 6;
  if (/en-gb|en-au|en-nz/i.test(v.lang)) s += 4;
  if (/en-us/i.test(v.lang)) s += 3;
  if (v.default) s += 2;
  // Older desktop SAPI voices tend to sound more robotic
  if (v.localService && /zira|david|mark|hazel|heera|ravi|desktop/i.test(n))
    s -= 12;
  return s;
}

function shortTitle(v: SpeechSynthesisVoice): string {
  const name = v.name.trim();
  if (name.length <= 28) return name;
  return `${name.slice(0, 26)}…`;
}

function subtitleFor(v: SpeechSynthesisVoice): string {
  const loc = v.localService ? "On-device" : "Network / cloud";
  return `${v.lang || "en"} · ${loc}`;
}

/** Per-slot playback tuning (slightly slower = usually clearer, less “chipmunk”). */
const SLOT_TUNING: { rate: number; pitch: number; tag: string }[] = [
  { rate: 0.88, pitch: 1, tag: "Calm & clear" },
  { rate: 0.9, pitch: 0.98, tag: "Steady" },
  { rate: 0.86, pitch: 1.02, tag: "Warm" },
  { rate: 0.92, pitch: 1, tag: "Bright" },
];

/**
 * Build up to 4 slots: prefer distinct high-scoring English voices.
 * If the OS lists fewer, we reuse the best voice with different tuning so all 4 slots stay usable.
 */
export function buildTTSSlots(
  allVoices: SpeechSynthesisVoice[],
): TTSVoiceSlot[] {
  const english = allVoices.filter(isEnglish);
  const ranked = [...english].sort(
    (a, b) => qualityScore(b) - qualityScore(a),
  );

  const picked: SpeechSynthesisVoice[] = [];
  const seenUri = new Set<string>();
  for (const v of ranked) {
    const key = v.voiceURI || v.name;
    if (seenUri.has(key)) continue;
    seenUri.add(key);
    picked.push(v);
    if (picked.length >= TTS_SLOT_COUNT) break;
  }

  const fallback =
    picked[0] ||
    allVoices.find((x) => isEnglish(x)) ||
    allVoices[0] ||
    null;

  const slots: TTSVoiceSlot[] = [];
  for (let i = 0; i < TTS_SLOT_COUNT; i++) {
    const voice = picked[i] ?? fallback;
    const tuning = SLOT_TUNING[i] ?? SLOT_TUNING[0];
    const title =
      voice != null
        ? shortTitle(voice)
        : `Browser default (${tuning.tag})`;
    const subtitle =
      voice != null ? subtitleFor(voice) : `${tuning.tag} · system voice`;

    slots.push({
      slotIndex: i,
      title,
      subtitle,
      styleTag: tuning.tag,
      voice,
      rate: tuning.rate,
      pitch: tuning.pitch,
    });
  }
  return slots;
}

export function getBrowserVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}
