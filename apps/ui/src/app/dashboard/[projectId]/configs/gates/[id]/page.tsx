import { redirect } from "next/navigation";

export default async function ConfigsGateDetailRedirect({
  params,
}: {
  params: Promise<{ projectId: string; id: string }>;
}) {
  const { projectId, id } = await params;
  redirect(`/dashboard/${projectId}/gates/${id}`);
}
