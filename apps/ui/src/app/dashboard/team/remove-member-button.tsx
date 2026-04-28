"use client";

import { X } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { removeMemberAction } from "./actions";

export function RemoveMemberButton({ id, email }: { id: string; email: string }) {
  return (
    <ActionForm action={removeMemberAction} loading="Removing…" success="Member removed">
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        aria-label={`Remove ${email}`}
        className="size-7 p-0 text-[var(--se-fg-3)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
      >
        <X className="size-3" />
      </Button>
    </ActionForm>
  );
}
