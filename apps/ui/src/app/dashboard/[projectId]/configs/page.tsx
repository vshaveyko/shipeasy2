import { redirect } from "next/navigation";

export default async function ConfigsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/dashboard/${projectId}/configs/values`);
}
