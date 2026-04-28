import { Tags } from "lucide-react";
import { auth } from "@/auth";
import { listAttributes } from "@/lib/handlers/attributes";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { AttributeForm } from "./attribute-form";
import { AttributesContent } from "./attributes-content";

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
        <AttributesContent attributes={attributes} />
      )}
    </div>
  );
}
