"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { softDeleteProjectAction } from "./actions";

interface Props {
  projectName: string;
  isOwner: boolean;
}

export function DeleteProjectForm({ projectName, isOwner }: Props) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const matches = confirm.trim() === projectName;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!isOwner}
        onClick={() => {
          setConfirm("");
          setOpen(true);
        }}
        className="text-[var(--se-danger)] border-[color-mix(in_oklab,var(--se-danger)_30%,var(--se-line-2))] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
      >
        <Trash2 className="size-3.5" />
        Delete project
      </Button>
      {!isOwner ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Only the current owner can delete this project.
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--se-danger)]">Delete project?</DialogTitle>
            <DialogDescription>
              Removes all experiments, gates, configs, and audit logs after a 14-day grace period.
              The project will stop accepting SDK calls immediately.
            </DialogDescription>
          </DialogHeader>
          <ActionForm
            action={softDeleteProjectAction}
            loading="Deleting…"
            success="Project queued for deletion"
            onSuccess={() => setOpen(false)}
            className="space-y-4"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="delete-confirm">
                Type <code className="font-mono">{projectName}</code> to confirm
              </Label>
              <Input
                id="delete-confirm"
                name="confirmName"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={projectName}
                autoComplete="off"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!matches}
                className="bg-[var(--se-danger)] text-white hover:bg-[var(--se-danger)]/90 disabled:opacity-50"
              >
                Delete project
              </Button>
            </DialogFooter>
          </ActionForm>
        </DialogContent>
      </Dialog>
    </>
  );
}
