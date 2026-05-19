import type { Metadata } from "next";
import { Activity, AlertTriangle } from "lucide-react";
import { auth } from "@/auth";
import { listEvents } from "@/lib/handlers/events";

export const metadata: Metadata = { title: "Events" };
import { EmptyState } from "@/components/dashboard/empty-state";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readFlashError } from "@/lib/flash-error";
import { createEventAction } from "./actions";
import { EventsContent } from "./events-content";
import { EVENT_ERROR_COOKIE } from "./event-error-cookie";

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

  const error = await readFlashError(EVENT_ERROR_COOKIE);

  return (
    <Page>
      <PageHeader
        title="Events"
        description="The event catalog. Events auto-discover from SDK track() calls and wait for approval before becoming metric-eligible."
      />
      <PageBody className="space-y-6">
        {error && (
          <div
            className="rounded-[var(--radius-md)] border p-4"
            style={{
              background: "color-mix(in oklab, var(--se-danger) 12%, var(--se-bg-1))",
              borderColor: "color-mix(in oklab, var(--se-danger) 35%, transparent)",
            }}
            role="alert"
          >
            <div
              className="t-caps mb-2 flex items-center gap-2"
              style={{ color: "var(--se-danger)" }}
            >
              <AlertTriangle className="size-3" />
              <span>Event action failed</span>
            </div>
            <p className="text-[13px] text-[var(--se-fg)]">{error}</p>
          </div>
        )}
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
      </PageBody>
    </Page>
  );
}
