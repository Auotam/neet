"use client";

import type { ExamQuestion } from "@/lib/exam-types";
import {
  buildTTSSlots,
  getBrowserVoices,
  readStoredSlotIndex,
  type TTSVoiceSlot,
  TTS_SLOT_COUNT,
  writeStoredSlotIndex,
} from "@/lib/tts-voices";
import { useCallback, useEffect, useRef, useState } from "react";

export function getSpeechSupport(): {
  tts: boolean;
  recognition: boolean;
} {
  if (typeof window === "undefined") {
    return { tts: false, recognition: false };
  }
  const tts = "speechSynthesis" in window;
  const recognition = Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition,
  );
  return { tts, recognition };
}

type RecognitionCtor = new () => SpeechRecognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const W = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return W.SpeechRecognition ?? W.webkitSpeechRecognition ?? null;
}

export function buildQuestionSpeakText(q: ExamQuestion): string {
  const opts = q.options
    .map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o}`)
    .join(". ");
  return `${q.subject}. ${q.stem}. ${opts}. Which option do you choose — A, B, C, or D?`;
}

export function useExamSpeech(recognitionLang: string = "en-IN") {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const [ttsSlots, setTtsSlots] = useState<TTSVoiceSlot[]>(() =>
    buildTTSSlots([]),
  );
  const [ttsVoicesReady, setTtsVoicesReady] = useState(false);
  const [activeSlotIndex, setActiveSlotIndexState] = useState(0);

  const recRef = useRef<SpeechRecognition | null>(null);
  const slotsRef = useRef<TTSVoiceSlot[]>(buildTTSSlots([]));
  const slotIndexRef = useRef(0);

  useEffect(() => {
    slotsRef.current = ttsSlots;
  }, [ttsSlots]);

  useEffect(() => {
    slotIndexRef.current = activeSlotIndex;
  }, [activeSlotIndex]);

  useEffect(() => {
    setActiveSlotIndexState(readStoredSlotIndex());
  }, []);

  const refreshVoices = useCallback(() => {
    const list = getBrowserVoices();
    const slots = buildTTSSlots(list);
    setTtsSlots(slots);
    setTtsVoicesReady(list.length > 0);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    refreshVoices();
    const synth = window.speechSynthesis;
    synth.addEventListener("voiceschanged", refreshVoices);
    // Chrome sometimes needs a delayed second read
    const t = window.setTimeout(refreshVoices, 750);
    return () => {
      synth.removeEventListener("voiceschanged", refreshVoices);
      window.clearTimeout(t);
    };
  }, [refreshVoices]);

  const setActiveSlotIndex = useCallback((i: number) => {
    const clamped = Math.max(0, Math.min(TTS_SLOT_COUNT - 1, i));
    setActiveSlotIndexState(clamped);
    writeStoredSlotIndex(clamped);
  }, []);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      cancelSpeech();
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setSpeechError("This browser cannot read text aloud.");
        return;
      }
      const slots = slotsRef.current;
      const idx = slotIndexRef.current;
      const slot = slots[idx] ?? null;

      const u = new SpeechSynthesisUtterance(text);
      if (slot?.voice) {
        u.voice = slot.voice;
        u.lang = slot.voice.lang || recognitionLang;
      } else {
        u.lang = recognitionLang;
      }
      u.rate = slot?.rate ?? 0.88;
      u.pitch = slot?.pitch ?? 1;

      u.onstart = () => setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => {
        setIsSpeaking(false);
        setSpeechError("Playback was interrupted or failed.");
      };
      setSpeechError(null);
      window.speechSynthesis.speak(u);
    },
    [cancelSpeech, recognitionLang],
  );

  const stopListening = useCallback(() => {
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setIsListening(false);
  }, []);

  useEffect(() => () => {
    cancelSpeech();
    stopListening();
  }, [cancelSpeech, stopListening]);

  const listenOnce = useCallback(
    (onCommand: (transcript: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) {
        setSpeechError(
          "Speech input is not supported in this browser. Try Chrome on desktop or Android.",
        );
        return;
      }
      stopListening();
      setSpeechError(null);
      setLastHeard(null);

      const rec = new Ctor();
      rec.lang = recognitionLang;
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (ev: SpeechRecognitionEvent) => {
        const text = ev.results[0]?.[0]?.transcript ?? "";
        setLastHeard(text);
        onCommand(text);
      };
      rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (ev.error === "aborted") return;
        setSpeechError(
          ev.error === "not-allowed"
            ? "Microphone blocked — allow access in the browser address bar."
            : `Mic error: ${ev.error}`,
        );
      };
      rec.onend = () => {
        setIsListening(false);
        recRef.current = null;
      };

      recRef.current = rec;
      try {
        setIsListening(true);
        rec.start();
      } catch {
        setIsListening(false);
        setSpeechError("Could not start microphone listening.");
      }
    },
    [recognitionLang, stopListening],
  );

  return {
    speak,
    cancelSpeech,
    isSpeaking,
    listenOnce,
    stopListening,
    isListening,
    lastHeard,
    speechError,
    setSpeechError,
    ttsSlots,
    ttsVoicesReady,
    activeSlotIndex,
    setActiveSlotIndex,
    refreshVoices,
  };
}
