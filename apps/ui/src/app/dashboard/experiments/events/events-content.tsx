"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectableList } from "@/components/dashboard/selectable-list";
import { approveEventAction, deleteEventAction, bulkDeleteEventsAction } from "./actions";

interface Event {
  id: string;
  name: string;
  description?: string | null;
  pending?: number | boolean | null;
}

interface Props {
  events: Event[];
}

export function EventsContent({ events }: Props) {
  return (
    <SelectableList
      items={events}
      onBulkDelete={bulkDeleteEventsAction}
      renderContent={(ev) => (
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-medium">{ev.name}</span>
          {ev.description && (
            <span className="text-xs text-muted-foreground">{ev.description}</span>
          )}
          {ev.pending ? (
            <Badge variant="secondary">pending</Badge>
          ) : (
            <Badge variant="default">approved</Badge>
          )}
        </div>
      )}
      renderActions={(ev) => (
        <>
          {!!ev.pending && (
            <form action={approveEventAction}>
              <input type="hidden" name="id" value={ev.id} />
              <Button size="sm" variant="outline" type="submit">
                Approve
              </Button>
            </form>
          )}
          <form action={deleteEventAction}>
            <input type="hidden" name="id" value={ev.id} />
            <Button
              size="sm"
              variant="ghost"
              type="submit"
              className="text-destructive hover:text-destructive"
            >
              Delete
            </Button>
          </form>
        </>
      )}
    />
  );
}
