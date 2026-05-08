import { redirect } from "next/navigation";

export default async function FeatureRequestsRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/dashboard/${projectId}/feedback?tab=requests`);
}
