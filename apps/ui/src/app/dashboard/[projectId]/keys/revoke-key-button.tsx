"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { revokeKeyAction } from "./actions";

export function RevokeKeyButton({ id }: { id: string }) {
  return (
    <ActionForm action={revokeKeyAction} loading="Revoking…" success="Key revoked">
      <input type="hidden" name="id" value={id} />
      <Button
        size="sm"
        variant="ghost"
        type="submit"
        className="text-destructive hover:text-destructive"
      >
        Revoke
      </Button>
    </ActionForm>
  );
}
