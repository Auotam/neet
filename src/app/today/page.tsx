import { getTodaysPaperSlug } from "@/lib/todays-paper";
import { redirect } from "next/navigation";

export default function TodaysMockPage() {
  redirect(`/exam/${getTodaysPaperSlug()}?guided=1`);
}
