import { redirect } from "next/navigation";

export default async function ConfigsGatesNewRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/dashboard/${projectId}/gates/new`);
}
