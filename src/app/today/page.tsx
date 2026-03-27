import { getTodaysPaperSlug } from "@/lib/todays-paper";
import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ paper?: string }> };

export default async function TodaysMockPage({ searchParams }: Props) {
  const { paper } = await searchParams;
  const q = new URLSearchParams({ guided: "1" });
  if (paper === "1" || paper === "true") q.set("paper", "1");
  redirect(`/exam/${getTodaysPaperSlug()}?${q}`);
}
