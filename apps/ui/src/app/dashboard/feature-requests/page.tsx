import { redirect } from "next/navigation";

export default function FeatureRequestsRedirect() {
  redirect("/dashboard/feedback?tab=requests");
}
