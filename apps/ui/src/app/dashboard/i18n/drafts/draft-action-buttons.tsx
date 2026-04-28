"use client";

import { Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { abandonDraftAction, deleteDraftAction } from "./actions";

export function AbandonDraftButton({ id }: { id: string }) {
  return (
    <ActionForm action={abandonDraftAction} loading="Abandoning…" success="Draft abandoned">
      <input type="hidden" name="id" value={id} />
      <Button variant="ghost" size="sm" type="submit">
        Abandon
      </Button>
    </ActionForm>
  );
}

export function DeleteDraftButton({ id, name }: { id: string; name: string }) {
  return (
    <ActionForm action={deleteDraftAction} loading="Deleting…" success="Draft deleted">
      <input type="hidden" name="id" value={id} />
      <Button variant="ghost" size="icon-sm" type="submit" aria-label={`Delete draft ${name}`}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </ActionForm>
  );
}
