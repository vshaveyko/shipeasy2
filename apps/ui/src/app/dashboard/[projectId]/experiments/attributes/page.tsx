import type { Metadata } from "next";
import { AlertTriangle, Tags } from "lucide-react";
import { auth } from "@/auth";
import { listAttributes } from "@/lib/handlers/attributes";

export const metadata: Metadata = { title: "Attributes" };
import { EmptyState } from "@/components/dashboard/empty-state";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { readFlashError } from "@/lib/flash-error";
import { AttributeForm } from "./attribute-form";
import { AttributesContent } from "./attributes-content";
import { ATTRIBUTE_ERROR_COOKIE } from "./attribute-error-cookie";

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

  const error = await readFlashError(ATTRIBUTE_ERROR_COOKIE);

  return (
    <Page>
      <PageHeader
        title="User attributes"
        description="Declared attributes your SDKs can target on — country, plan, signup date, custom traits."
      />
      <PageBody className="space-y-6">
        {error && (
          <div
            className="rounded-[var(--radius-md)] border p-4"
            style={{
              background: "color-mix(in oklab, var(--se-danger) 12%, var(--se-bg-1))",
              borderColor: "color-mix(in oklab, var(--se-danger) 35%, transparent)",
            }}
            role="alert"
          >
            <div
              className="t-caps mb-2 flex items-center gap-2"
              style={{ color: "var(--se-danger)" }}
            >
              <AlertTriangle className="size-3" />
              <span>Attribute action failed</span>
            </div>
            <p className="text-[13px] text-[var(--se-fg)]">{error}</p>
          </div>
        )}
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
      </PageBody>
    </Page>
  );
}
