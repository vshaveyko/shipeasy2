"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProjectAction } from "./actions";

const TZ_OPTIONS = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "America/Chicago",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
];

interface Props {
  projectId: string;
  name: string;
  domain: string;
  slug: string;
  defaultEnv: "dev" | "staging" | "prod";
  timezone: string;
}

export function GeneralForm({ projectId, name, domain, slug, defaultEnv, timezone }: Props) {
  return (
    <ActionForm
      action={updateProjectAction}
      loading="Saving…"
      success="Settings saved"
      className="s-panel"
    >
      <div className="panel-head">
        <div className="flex-1">
          <h2>General</h2>
          <div className="desc">Project identity &amp; defaults.</div>
        </div>
        <Button type="submit" variant="outline" size="sm">
          Save changes
        </Button>
      </div>

      <div className="field-row">
        <div className="label">
          <div className="name">Project name</div>
          <div className="desc">How your team appears in the app &amp; emails.</div>
        </div>
        <div />
        <div className="control">
          <Input
            name="name"
            defaultValue={name}
            className="w-[280px]"
            aria-label="Project name"
          />
        </div>
      </div>

      <div className="field-row">
        <div className="label">
          <div className="name">Slug</div>
          <div className="desc">Used in URLs and SDK config.</div>
        </div>
        <div />
        <div className="control">
          <div className="flex w-[280px] items-stretch rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] font-mono text-sm">
            <span className="border-r border-[var(--se-line-2)] px-2.5 py-[7px] text-[var(--se-fg-3)]">
              shipeasy.dev/
            </span>
            <input
              name="slug"
              defaultValue={slug}
              aria-label="Project slug"
              placeholder="acme"
              className="flex-1 bg-transparent px-2.5 py-[7px] outline-none"
            />
          </div>
        </div>
      </div>

      <div className="field-row">
        <div className="label">
          <div className="name">Domain</div>
          <div className="desc">
            App hostname. Client-key SDK calls from other origins are rejected. Use{" "}
            <code>*.example.com</code> for all subdomains.
          </div>
        </div>
        <div />
        <div className="control">
          <Input
            name="domain"
            defaultValue={domain}
            placeholder="https://app.example.com"
            className="w-[280px]"
            aria-label="Domain"
          />
        </div>
      </div>

      <div className="field-row">
        <div className="label">
          <div className="name">Default environment</div>
          <div className="desc">New experiments target this environment first.</div>
        </div>
        <div />
        <div className="control">
          <select
            name="defaultEnv"
            defaultValue={defaultEnv}
            aria-label="Default environment"
            className="h-9 w-[180px] rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-sm outline-none"
          >
            <option value="dev">dev</option>
            <option value="staging">staging</option>
            <option value="prod">prod</option>
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="label">
          <div className="name">Time zone</div>
          <div className="desc">Affects scheduling and audit log timestamps.</div>
        </div>
        <div />
        <div className="control">
          <select
            name="timezone"
            defaultValue={TZ_OPTIONS.includes(timezone) ? timezone : "UTC"}
            aria-label="Time zone"
            className="h-9 w-[280px] rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-sm outline-none"
          >
            {TZ_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="label">
          <div className="name">Project ID</div>
          <div className="desc">Immutable identifier used by the SDK.</div>
        </div>
        <div />
        <div className="control">
          <Input
            value={projectId}
            readOnly
            disabled
            className="w-[280px] font-mono"
            aria-label="Project ID"
          />
        </div>
      </div>
    </ActionForm>
  );
}
