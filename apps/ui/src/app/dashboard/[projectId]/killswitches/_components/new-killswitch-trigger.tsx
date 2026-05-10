"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KillswitchModal } from "./killswitch-modal";

export function NewKillswitchTrigger({ label = "New killswitch" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        {label}
      </Button>
      <KillswitchModal open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
