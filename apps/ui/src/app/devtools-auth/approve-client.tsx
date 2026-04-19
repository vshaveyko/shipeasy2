"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { approveDevtoolsAuthAction } from "./actions";

interface Props {
  /** Origin of the opener window, used to restrict postMessage target. */
  origin: string;
  email: string;
}

export function ApproveButton({ origin, email }: Props) {
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onApprove() {
    setState("pending");
    setError(null);
    try {
      const result = await approveDevtoolsAuthAction();
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "se:devtools-auth",
            token: result.token,
            projectId: result.projectId,
            email: result.email,
          },
          origin,
        );
      }
      setState("success");
      setTimeout(() => window.close(), 600);
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (state === "success") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Connected. You can close this window.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={onApprove} disabled={state === "pending"}>
        {state === "pending" ? "Connecting…" : `Approve as ${email}`}
      </Button>
      {error && <p className="text-destructive text-center text-xs">{error}</p>}
    </div>
  );
}
