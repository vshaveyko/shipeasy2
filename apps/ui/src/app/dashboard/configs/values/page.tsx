import { auth } from "@/auth";
import { listConfigs } from "@/lib/handlers/configs";
import { LinkButton } from "@/components/ui/link-button";
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
    <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="t-caps dim-2 tracking-[0.08em]">No config selected</div>
      <h2 className="text-[22px] font-medium tracking-tight">Start with your first config</h2>
      <p className="max-w-[46ch] text-[13px] text-muted-foreground">
        Configs hold typed JSON values you can edit without deploying. Pick a key from the tree or
        create a new one.
      </p>
      <LinkButton size="sm" href="/dashboard/configs/values/new">
        New config
      </LinkButton>
    </div>
  );
}
