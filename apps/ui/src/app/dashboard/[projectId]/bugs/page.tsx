import { redirect } from "next/navigation";

export default async function BugsRedirect({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/dashboard/${projectId}/feedback?tab=bugs`);
}
