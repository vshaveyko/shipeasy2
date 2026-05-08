import { auth } from "@/auth";
import { listGates } from "@/lib/handlers/gates";
import NewExperimentClient from "./new-experiment-client";

export default async function NewExperimentPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let gates: { id: string; name: string }[] = [];
  if (projectId) {
    try {
      const raw = await listGates({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
      gates = raw.map((g) => ({ id: g.id, name: g.name }));
    } catch {
      // DB not available in dev without wrangler
    }
  }

  return <NewExperimentClient gates={gates} />;
}
