"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismissNewKeyAction } from "./actions";

export function CopyKeyButton({ value }: { value: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [dismissing, startDismiss] = useTransition();

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDismiss() {
    startDismiss(async () => {
      await dismissNewKeyAction();
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
        {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
        {copied ? "Copied!" : "Copy key"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDismiss}
        disabled={dismissing}
        aria-label="Dismiss new key banner"
        className="gap-1"
      >
        <X className="size-3" />
        Done
      </Button>
    </div>
  );
}
