"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
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
import { transferOwnershipAction } from "./actions";

interface TransferTarget {
  email: string;
  role: "admin" | "editor" | "viewer";
}

interface Props {
  projectName: string;
  isOwner: boolean;
  targets: TransferTarget[];
}

export function TransferOwnershipForm({ projectName, isOwner, targets }: Props) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>(targets[0]?.email ?? "");
  const [confirm, setConfirm] = useState("");

  const blocked = !isOwner;
  const noTargets = isOwner && targets.length === 0;
  const confirmMatches = confirm.trim() === projectName;
  const canSubmit = isOwner && !!target && confirmMatches;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={blocked || noTargets}
        onClick={() => {
          setTarget(targets[0]?.email ?? "");
          setConfirm("");
          setOpen(true);
        }}
        className="text-[var(--se-danger)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
      >
        <ArrowRightLeft className="size-3.5" />
        Transfer ownership
      </Button>

      {blocked ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Only the current owner can transfer this project.
        </p>
      ) : noTargets ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No eligible recipient. Invite a teammate from{" "}
          <Link className="underline" href="/dashboard/team">
            Team
          </Link>{" "}
          and have them accept first.
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer project ownership</DialogTitle>
            <DialogDescription>
              The new owner gains full control of this project, including billing and member
              management. You will be downgraded to an <b>admin</b> member and keep access until the
              new owner removes you.
            </DialogDescription>
          </DialogHeader>

          <ActionForm
            action={transferOwnershipAction}
            loading="Transferring…"
            success="Project transferred"
            onSuccess={() => setOpen(false)}
            className="space-y-4"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="transfer-target">New owner</Label>
              <select
                id="transfer-target"
                name="targetEmail"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
                className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-sm outline-none focus-visible:border-ring"
              >
                {targets.map((t) => (
                  <option key={t.email} value={t.email}>
                    {t.email} ({t.role})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Only active team members are eligible. Pending invites must accept first.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="transfer-confirm">
                Type <code className="font-mono">{projectName}</code> to confirm
              </Label>
              <Input
                id="transfer-confirm"
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
                disabled={!canSubmit}
                className="bg-[var(--se-danger)] text-white hover:bg-[var(--se-danger)]/90 disabled:opacity-50"
              >
                Transfer
              </Button>
            </DialogFooter>
          </ActionForm>
        </DialogContent>
      </Dialog>
    </>
  );
}
