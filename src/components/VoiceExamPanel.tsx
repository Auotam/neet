"use client";

import { parseVoiceCommand } from "@/lib/voice-command-parse";
import type { ExamQuestion } from "@/lib/exam-types";
import {
  buildQuestionSpeakText,
  getSpeechSupport,
  useExamSpeech,
} from "@/hooks/useExamSpeech";
import { TTS_SLOT_COUNT } from "@/lib/tts-voices";
import { useCallback, useEffect, useState } from "react";

type Props = {
  question: ExamQuestion;
  questionIndex: number;
  totalQuestions: number;
  attemptClosed: boolean;
  onAnswer: (index: 0 | 1 | 2 | 3) => void;
  onNext: () => void;
  onPrev: () => void;
};

export function VoiceExamPanel({
  question,
  questionIndex,
  totalQuestions,
  attemptClosed,
  onAnswer,
  onNext,
  onPrev,
}: Props) {
  const support = getSpeechSupport();
  const {
    speak,
    cancelSpeech,
    isSpeaking,
    listenOnce,
    isListening,
    lastHeard,
    speechError,
    setSpeechError,
    ttsSlots,
    ttsVoicesReady,
    activeSlotIndex,
    setActiveSlotIndex,
    refreshVoices,
  } = useExamSpeech("en-IN");
  const [autoRead, setAutoRead] = useState(true);
  const [showHelp, setShowHelp] = useState(true);

  const playQuestion = useCallback(() => {
    cancelSpeech();
    speak(buildQuestionSpeakText(question));
  }, [question, speak, cancelSpeech]);

  useEffect(() => {
    if (attemptClosed || !autoRead || !support.tts) return;
    const t = window.setTimeout(() => {
      speak(buildQuestionSpeakText(question));
    }, 400);
    return () => {
      window.clearTimeout(t);
      cancelSpeech();
    };
  }, [
    questionIndex,
    question.id,
    attemptClosed,
    autoRead,
    support.tts,
    question,
    speak,
    cancelSpeech,
  ]);

  const onListen = () => {
    if (attemptClosed) return;
    listenOnce((transcript) => {
      const cmd = parseVoiceCommand(transcript);
      if (cmd.type === "answer") onAnswer(cmd.index);
      else if (cmd.type === "repeat") playQuestion();
      else if (cmd.type === "next") onNext();
      else if (cmd.type === "prev") onPrev();
      else {
        setSpeechError(
          `Heard: "${transcript.trim() || "…"}". Say A, B, C, or D — or "repeat", "next", "back".`,
        );
      }
    });
  };

  if (attemptClosed) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-100/80 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
        Voice controls are off after submit. Scroll to review or re-open the
        paper to practise again.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/90 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/40">
      <div className="border-b border-indigo-200/80 px-4 py-3 dark:border-indigo-900/50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-800 dark:text-indigo-200">
            Listen &amp; speak mode
          </p>
          <button
            type="button"
            onClick={() => setShowHelp((h) => !h)}
            className="text-xs font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
          >
            {showHelp ? "Hide how-to" : "How to use"}
          </button>
        </div>
        {!support.tts && (
          <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">
            This browser cannot read questions aloud. Try Chrome or Edge.
          </p>
        )}
        {!support.recognition && (
          <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
            Speech-to-text is not available here. You can still use{" "}
            <span className="font-medium">Play question</span> and tap answers
            below.
          </p>
        )}
      </div>

      {showHelp && (
        <ul className="list-disc space-y-1.5 px-7 py-3 text-xs leading-relaxed text-indigo-950/90 dark:text-indigo-100/90">
          <li>
            Uses your browser&apos;s <strong>built-in voices</strong> (not a
            cloud AI actor). Pick one of <strong>4 voice styles</strong> below — we
            prefer clearer &quot;neural&quot; / Google / newer engines when the OS
            lists them. <strong>Chrome</strong> usually sounds better than Safari.
          </li>
          <li>
            For more natural voices on Windows, install optional speech packs in{" "}
            <strong>Settings → Time &amp; language → Speech</strong>; on Android,
            use <strong>Google Text-to-Speech</strong> voices.
          </li>
          <li>
            Allow <strong>microphone</strong> when the browser asks. Works best
            in <strong>Chrome</strong> (Windows / Android) or <strong>Edge</strong>.
          </li>
          <li>
            Tap <strong>Play question</strong> to hear the stem and all four
            options. Turn off <strong>Auto-read</strong> if you only want manual
            playback.
          </li>
          <li>
            Tap <strong>I&apos;m answering</strong>, wait for the beep/listening
            state, then say clearly: <strong>A</strong>, <strong>B</strong>,{" "}
            <strong>C</strong>, or <strong>D</strong> (or &quot;option B&quot;; say{" "}
            <strong>see</strong> as a single word for C).
          </li>
          <li>
            Say <strong>repeat</strong> to hear the question again,{" "}
            <strong>next</strong> to skip forward, <strong>back</strong> for the
            previous question.
          </li>
        </ul>
      )}

      <div className="border-b border-indigo-200/60 px-4 py-3 dark:border-indigo-900/40">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">
            Reading voice ({TTS_SLOT_COUNT} options)
          </p>
          <button
            type="button"
            onClick={() => refreshVoices()}
            className="text-xs font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
          >
            Reload voice list
          </button>
        </div>
        {!ttsVoicesReady && support.tts && (
          <p className="mb-2 text-xs text-amber-800 dark:text-amber-200">
            Loading voices… If this hangs, tap <strong>Reload voice list</strong>
            .
          </p>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ttsSlots.map((slot, i) => (
            <button
              key={`${slot.title}-${i}`}
              type="button"
              onClick={() => setActiveSlotIndex(i)}
              className={[
                "rounded-xl border px-3 py-2.5 text-left text-xs transition touch-manipulation",
                activeSlotIndex === i
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-sm dark:border-indigo-400 dark:bg-indigo-500"
                  : "border-indigo-200 bg-white text-indigo-950 hover:border-indigo-400 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-50 dark:hover:border-indigo-600",
              ].join(" ")}
            >
              <span className="block font-semibold">
                Voice {i + 1} · {slot.styleTag}
              </span>
              <span
                className={
                  activeSlotIndex === i
                    ? "mt-0.5 block text-[11px] text-indigo-100"
                    : "mt-0.5 block text-[11px] text-indigo-800/80 dark:text-indigo-200/90"
                }
              >
                {slot.title}
              </span>
              <span
                className={
                  activeSlotIndex === i
                    ? "mt-0.5 block text-[10px] text-indigo-100/90"
                    : "mt-0.5 block text-[10px] text-indigo-700/70 dark:text-indigo-300/80"
                }
              >
                {slot.subtitle}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-indigo-900 dark:text-indigo-100">
          <input
            type="checkbox"
            checked={autoRead}
            onChange={(e) => setAutoRead(e.target.checked)}
            className="h-4 w-4 rounded border-indigo-400"
          />
          Auto-read when question changes
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={playQuestion}
            disabled={!support.tts || isSpeaking}
            className="min-h-10 touch-manipulation rounded-full border border-indigo-600 bg-white px-4 py-2 text-sm font-semibold text-indigo-900 disabled:opacity-50 dark:bg-indigo-950 dark:text-indigo-100"
          >
            {isSpeaking ? "Playing…" : "Play question"}
          </button>
          <button
            type="button"
            onClick={() => cancelSpeech()}
            disabled={!isSpeaking}
            className="min-h-10 rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
          >
            Stop voice
          </button>
          <button
            type="button"
            onClick={onListen}
            disabled={!support.recognition || isListening}
            className="min-h-10 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isListening ? "Listening…" : "I’m answering (mic)"}
          </button>
        </div>
      </div>

      {(lastHeard || speechError) && (
        <div className="border-t border-indigo-200/80 px-4 py-2 text-xs dark:border-indigo-900/50">
          {lastHeard && (
            <p className="text-indigo-900 dark:text-indigo-100">
              <span className="font-semibold">Heard:</span> {lastHeard}
            </p>
          )}
          {speechError && (
            <p className="mt-1 text-rose-700 dark:text-rose-300">
              {speechError}
            </p>
          )}
        </div>
      )}

      <p className="px-4 pb-3 text-[10px] text-indigo-800/70 dark:text-indigo-200/70">
        Question {questionIndex + 1} of {totalQuestions} · language en-IN for
        recognition (adjust in code if needed)
      </p>
    </div>
  );
}
