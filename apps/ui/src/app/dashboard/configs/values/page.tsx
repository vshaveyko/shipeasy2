import { auth } from "@/auth";
import { listConfigs } from "@/lib/handlers/configs";
import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { redirect } from "next/navigation";

export default async function ConfigValuesEmptyPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  if (projectId) {
    try {
      const list = await listConfigs({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
      if (list.length > 0) {
        const byName = [...list].sort((a, b) => a.name.localeCompare(b.name));
        redirect(`/dashboard/configs/values/${byName[0].id}`);
      }
    } catch {
      // DB unavailable in dev — fall through to empty state.
    }
  }

  return (
    <div className="p-6">
      <HeroEmptyState kind="configs" ctaHref="/dashboard/configs/values/new" />
    </div>
  );
}
