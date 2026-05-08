"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { setExperimentStatusAction } from "../actions";

export function ExperimentStatusButtons({ id, status }: { id: string; status: string }) {
  return (
    <>
      {status === "draft" && (
        <ActionForm
          action={setExperimentStatusAction}
          loading="Starting…"
          success="Experiment started"
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="running" />
          <Button size="sm" type="submit">
            Start
          </Button>
        </ActionForm>
      )}
      {status === "running" && (
        <ActionForm
          action={setExperimentStatusAction}
          loading="Stopping…"
          success="Experiment stopped"
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="stopped" />
          <Button size="sm" variant="outline" type="submit">
            Stop
          </Button>
        </ActionForm>
      )}
    </>
  );
}
