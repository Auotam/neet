import { EXAM_PAPERS } from "@/lib/exams";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto max-w-5xl px-4 py-14">
        <header className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            NEET UG · practice lab
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Pattern mocks and predicted items
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Each of the thirty papers mirrors the official blueprint:{" "}
            <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
              180 MCQs in 3 hours
            </strong>
            ,{" "}
            <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
              720 marks
            </strong>
            , with{" "}
            <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
              +4 / −1 / 0
            </strong>{" "}
            marking,{" "}
            <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
              45 each
            </strong>{" "}
            in Physics, Chemistry, Botany, and Zoology. Every subject block is
            split into{" "}
            <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
              Section A (35) + Section B (10)
            </strong>{" "}
            per subject so the mock stays at{" "}
            <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
              180 questions
            </strong>
            . On the live paper, Section B lists 15 and you answer any 10.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-500">
            Items are original study aids (not NTA reproductions) with varied
            numeric stems and PYQ-pattern / NCERT-heavy / predicted labels.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/today"
                className="inline-flex items-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Today&apos;s one full mock
              </Link>
              <Link
                href="/today?paper=1"
                className="inline-flex items-center rounded-full border border-stone-400 bg-[#f5f0e8] px-5 py-2.5 text-sm font-semibold text-stone-900 shadow-sm hover:bg-stone-200 dark:border-stone-600 dark:bg-zinc-900 dark:text-stone-100 dark:hover:bg-zinc-800"
              >
                Today · booklet (iPad)
              </Link>
            </div>
            <span className="self-center text-sm text-zinc-500 dark:text-zinc-400">
              Same calendar day → same paper; ends with score + tips.{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Booklet view
              </span>{" "}
              (<code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">?paper=1</code>) mimics
              a hall answer sheet — cream paper, large OMR-style circles. On any
              paper, add that query or use the button above. For voice, use{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Listen &amp; speak
              </span>{" "}
              (booklet view is tap-only).
            </span>
          </div>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2">
          {EXAM_PAPERS.map((p) => (
            <li
              key={p.slug}
              className="flex h-full flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-500/70"
            >
              <Link
                href={`/exam/${p.slug}`}
                className="group flex flex-1 flex-col p-6 pb-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {p.slug.replace("paper-", "Paper ")}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                      {p.title}
                    </h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                    {p.questions.length} Q · {p.durationMinutes} min
                  </span>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {p.blurb.length > 200 ? `${p.blurb.slice(0, 200)}…` : p.blurb}
                </p>
                <span className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Open mock →
                </span>
              </Link>
              <div className="border-t border-zinc-100 px-6 pb-4 pt-2 dark:border-zinc-800">
                <Link
                  href={`/exam/${p.slug}?paper=1`}
                  className="text-xs font-semibold text-stone-700 underline decoration-stone-400 underline-offset-2 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100"
                >
                  Booklet view (iPad)
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
