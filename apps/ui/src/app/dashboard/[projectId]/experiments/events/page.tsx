import { Activity } from "lucide-react";
import { auth } from "@/auth";
import { listEvents } from "@/lib/handlers/events";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEventAction } from "./actions";
import { EventsContent } from "./events-content";

export default async function EventsPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let events: Awaited<ReturnType<typeof listEvents>> = [];
  if (projectId) {
    try {
      events = await listEvents({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB not available in dev without wrangler
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="The event catalog. Events auto-discover from SDK track() calls and wait for approval before becoming metric-eligible."
      />

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>New event</CardTitle>
          <CardDescription>Manually register an event before SDK calls arrive.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={createEventAction} className="flex items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="event-name">Name</Label>
              <Input
                id="event-name"
                name="name"
                placeholder="purchase"
                className="font-mono"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="event-description">Description</Label>
              <Input
                id="event-description"
                name="description"
                placeholder="User completed purchase"
              />
            </div>
            <Button size="sm" type="submit">
              Add event
            </Button>
          </form>
        </CardContent>
      </Card>

      {events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No events yet"
          description="Call track('purchase', ...) from an SDK and it'll appear here as a pending event awaiting approval."
        />
      ) : (
        <EventsContent events={events} />
      )}
    </div>
  );
}
