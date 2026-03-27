import { ExamRunner } from "@/components/ExamRunner";
import { getExamBySlug, listExamSlugs } from "@/lib/exams";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    guided?: string;
    interaction?: string;
    paper?: string;
  }>;
};

export async function generateStaticParams() {
  return listExamSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const paper = getExamBySlug(slug);
  if (!paper) return { title: "Paper not found" };
  return {
    title: `${paper.title} · NEET mocks`,
    description: paper.blurb,
  };
}

export default async function ExamPage(props: Props) {
  const { slug } = await props.params;
  const { guided, interaction, paper: paperQ } = await props.searchParams;
  const paper = getExamBySlug(slug);
  if (!paper) notFound();

  const paperMode = paperQ === "1" || paperQ === "true";

  return (
    <div
      className={
        paperMode
          ? "min-h-full bg-[#e5e0d6]"
          : "min-h-full bg-zinc-50 dark:bg-black"
      }
    >
      <Suspense
        fallback={
          <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Loading exam…
          </div>
        }
      >
        <ExamRunner
          paper={paper}
          singleSessionHint={guided === "1"}
          interactionMode={interaction === "voice" ? "voice" : "tap"}
          paperMode={paperMode}
        />
      </Suspense>
      <footer
        className={
          paperMode
            ? "mx-auto max-w-6xl px-4 pb-10 text-center text-xs text-stone-600"
            : "mx-auto max-w-6xl px-4 pb-10 text-center text-xs text-zinc-500 dark:text-zinc-500"
        }
      >
        <Link
          href="/"
          className={
            paperMode
              ? "font-semibold text-stone-800 underline decoration-stone-400"
              : "font-semibold text-emerald-700 dark:text-emerald-300"
          }
        >
          ← Back to index
        </Link>
      </footer>
    </div>
  );
}
