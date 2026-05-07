import { redirect } from "next/navigation";

export default function BugsRedirect() {
  redirect("/dashboard/feedback?tab=bugs");
}
