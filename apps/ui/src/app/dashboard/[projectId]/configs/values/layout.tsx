import type { ReactNode } from "react";

import { auth } from "@/auth";
import { listConfigs, type ConfigSummary } from "@/lib/handlers/configs";
import { ConfigsTree } from "./configs-tree";

export default async function ConfigValuesLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const projectId = session?.user?.project_id;
  let configs: ConfigSummary[] = [];
  if (projectId) {
    try {
      configs = await listConfigs({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB unavailable in dev without wrangler
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col py-6">
      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)] gap-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
        <aside className="min-h-0 border-r border-[var(--se-line)] bg-[var(--se-bg-1)]">
          <ConfigsTree configs={configs} />
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col">{children}</div>
      </div>
    </div>
  );
}
