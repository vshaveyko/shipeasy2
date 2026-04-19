import { Tags } from "lucide-react";
import { auth } from "@/auth";
import { listAttributes } from "@/lib/handlers/attributes";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AttributeForm } from "./attribute-form";
import { deleteAttributeAction } from "./actions";

export default async function AttributesPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let attributes: Awaited<ReturnType<typeof listAttributes>> = [];
  if (projectId) {
    try {
      attributes = await listAttributes({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB not available in dev without wrangler
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User attributes"
        description="Declared attributes your SDKs can target on — country, plan, signup date, custom traits."
      />

      <AttributeForm />

      {attributes.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No attributes declared"
          description="Declaring an attribute lets you reference it in targeting rules without typos, with the right data type."
        />
      ) : (
        <div className="rounded-lg border">
          {attributes.map((attr) => (
            <div
              key={attr.id}
              className="flex items-center justify-between border-b px-4 py-3 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium">{attr.name}</span>
                <Badge variant="secondary">{attr.type}</Badge>
              </div>
              <form action={deleteAttributeAction}>
                <input type="hidden" name="id" value={attr.id} />
                <Button
                  size="sm"
                  variant="ghost"
                  type="submit"
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
