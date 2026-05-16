"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/ui/action-form";
import { useAction } from "@/hooks/use-action";
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
import {
  connectIntegrationAction,
  disconnectIntegrationAction,
} from "./actions";
import type { IntegrationRow } from "@/lib/handlers/integrations";

export function IntegrationsList({ initial }: { initial: IntegrationRow[] }) {
  const [openKind, setOpenKind] = useState<string | null>(null);
  const { execute: doDisconnect, pending: disconnecting } = useAction(disconnectIntegrationAction, {
    success: "Disconnected",
  });

  return (
    <div className="s-panel">
      <div className="panel-head">
        <div className="flex-1">
          <h2>Integrations</h2>
          <div className="desc">Connect Shipeasy to the rest of your stack.</div>
        </div>
      </div>

      {initial.map((row) => (
        <div key={row.kind} className="integration">
          <div className="ico">{row.icon}</div>
          <div className="meta">
            <div className="name">
              {row.name}
              {row.status === "connected" ? (
                <Badge variant="secondary" className="ml-1 gap-1">
                  <span className="inline-block size-1.5 rounded-full bg-[var(--se-accent)]" />
                  CONNECTED
                </Badge>
              ) : null}
            </div>
            <div className="desc">{row.desc}</div>
          </div>
          <div className="right">
            {row.status === "connected" ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenKind(row.kind)}
                >
                  Configure
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disconnecting}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("kind", row.kind);
                    doDisconnect(fd);
                  }}
                  className="text-[var(--se-danger)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenKind(row.kind)}
              >
                Connect
              </Button>
            )}
          </div>

          <Dialog open={openKind === row.kind} onOpenChange={(o) => !o && setOpenKind(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {row.status === "connected" ? "Configure" : "Connect"} {row.name}
                </DialogTitle>
                <DialogDescription>
                  Paste integration config as JSON. Real OAuth flows can be wired into this same
                  endpoint later.
                </DialogDescription>
              </DialogHeader>
              <ActionForm
                action={connectIntegrationAction}
                loading="Saving…"
                success="Saved"
                onSuccess={() => setOpenKind(null)}
                className="space-y-3"
              >
                <input type="hidden" name="kind" value={row.kind} />
                <div className="grid gap-1.5">
                  <Label htmlFor={`integration-config-${row.kind}`}>Config (JSON)</Label>
                  <Input
                    id={`integration-config-${row.kind}`}
                    name="config"
                    defaultValue={row.config ? JSON.stringify(row.config) : ""}
                    placeholder='{"channel":"#experiments"}'
                    className="font-mono text-xs"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenKind(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    {row.status === "connected" ? "Update" : "Connect"}
                  </Button>
                </DialogFooter>
              </ActionForm>
            </DialogContent>
          </Dialog>
        </div>
      ))}
    </div>
  );
}
