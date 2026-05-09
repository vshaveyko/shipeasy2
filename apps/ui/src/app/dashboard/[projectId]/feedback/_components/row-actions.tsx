"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import type { ActionResult } from "@/lib/action-result";

interface Props {
  id: string;
  title: string;
  editHref: string;
  deleteAction: (formData: FormData) => Promise<ActionResult>;
  kind: "bug" | "request";
}

export function RowActions({ id, title, editHref, deleteAction, kind }: Props) {
  const router = useRouter();
  const label = kind === "bug" ? "bug report" : "feature request";
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={editHref}
        aria-label={`Edit ${label}`}
        className="inline-flex size-7 items-center justify-center rounded text-[var(--se-fg-3)] hover:bg-[var(--se-bg-3)] hover:text-[var(--se-fg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <Pencil className="size-3.5" />
      </Link>
      <span onClick={(e) => e.stopPropagation()}>
        <ConfirmDeleteButton
          action={deleteAction}
          id={id}
          title={kind === "bug" ? "Delete bug report?" : "Delete feature request?"}
          description={
            <>
              <span className="font-mono text-[12px] text-[var(--se-fg-2)]">{title}</span> will be
              permanently removed. This cannot be undone.
            </>
          }
          loading={kind === "bug" ? "Deleting bug…" : "Deleting request…"}
          success={kind === "bug" ? "Bug deleted" : "Request deleted"}
          triggerSize="icon-sm"
          triggerAriaLabel={`Delete ${label}`}
          onSuccess={() => router.refresh()}
        />
      </span>
    </div>
  );
}
