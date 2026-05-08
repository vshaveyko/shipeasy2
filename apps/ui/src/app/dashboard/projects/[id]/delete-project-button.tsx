"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { deleteProjectAction } from "./actions";

export function DeleteProjectButton({
  id,
  name,
  domain,
}: {
  id: string;
  name: string;
  domain: string | null;
}) {
  const router = useRouter();
  const label = domain ? `${name} (${domain})` : name;
  return (
    <ConfirmDeleteButton
      action={deleteProjectAction}
      id={id}
      title="Delete project?"
      description={
        <>
          <span className="font-mono text-[12px] text-[var(--se-fg-2)]">{label}</span> will be
          permanently removed along with its members, SDK keys, and audit log. The project must be
          empty — clear gates, configs, experiments, universes, metrics, and events first. This
          cannot be undone.
        </>
      }
      loading="Deleting project…"
      success="Project deleted"
      triggerLabel="Delete project"
      triggerVariant="outline"
      triggerClassName="text-[var(--se-danger)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
      onSuccess={() => router.push("/dashboard/projects")}
    />
  );
}
