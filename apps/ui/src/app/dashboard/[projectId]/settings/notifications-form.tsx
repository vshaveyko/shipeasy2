"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import {
  resetNotificationPrefsAction,
  updateNotificationPrefAction,
} from "./actions";
import type { NotificationPrefRow } from "@/lib/handlers/notifications";

type Row = NotificationPrefRow;

export function NotificationsForm({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [pending, startTransition] = useTransition();
  const { execute: doReset, pending: resetting } = useAction(resetNotificationPrefsAction, {
    success: "Notification preferences reset",
  });

  function toggle(event: string, channel: "email" | "slack" | "claudeDm") {
    setRows((prev) => {
      const next = prev.map((r) =>
        r.event === event ? { ...r, [channel]: !r[channel] } : r,
      );
      const updated = next.find((r) => r.event === event)!;
      const fd = new FormData();
      fd.set("event", event);
      fd.set("email", updated.email ? "on" : "off");
      fd.set("slack", updated.slack ? "on" : "off");
      fd.set("claudeDm", updated.claudeDm ? "on" : "off");
      startTransition(() => {
        void updateNotificationPrefAction(fd);
      });
      return next;
    });
  }

  return (
    <div className="s-panel">
      <div className="panel-head">
        <div className="flex-1">
          <h2>Notifications</h2>
          <div className="desc">Where and when Shipeasy pings you.</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={resetting || pending}
          onClick={() => doReset(new FormData())}
        >
          Reset to defaults
        </Button>
      </div>

      <div className="notif-head">
        <div>Event</div>
        <div>Email</div>
        <div>Slack</div>
        <div>Claude DM</div>
      </div>

      {rows.map((row) => (
        <div key={row.event} className="notif-row">
          <div className="text-[13px] font-medium">{row.label}</div>
          <div>
            <Switch
              checked={row.email}
              onCheckedChange={() => toggle(row.event, "email")}
              label={`${row.label} — Email`}
            />
          </div>
          <div>
            <Switch
              checked={row.slack}
              onCheckedChange={() => toggle(row.event, "slack")}
              label={`${row.label} — Slack`}
            />
          </div>
          <div>
            <Switch
              checked={row.claudeDm}
              onCheckedChange={() => toggle(row.event, "claudeDm")}
              label={`${row.label} — Claude DM`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
