"use client";

import { Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { deleteProfileAction } from "./actions";

export function DeleteProfileButton({ id, name }: { id: string; name: string }) {
  return (
    <ActionForm action={deleteProfileAction} loading="Deleting…" success="Profile deleted">
      <input type="hidden" name="id" value={id} />
      <Button variant="ghost" size="icon-sm" type="submit" aria-label={`Delete profile ${name}`}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </ActionForm>
  );
}
