"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProjectAction } from "./actions";

interface Props {
  projectId: string;
  name: string;
  domain: string;
}

export function ProjectSettingsForm({ projectId, name, domain }: Props) {
  return (
    <ActionForm action={updateProjectAction} loading="Saving…" success="Settings saved">
      <div className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="project-domain">Domain</Label>
          <Input
            id="project-domain"
            name="domain"
            defaultValue={domain}
            placeholder="app.example.com"
          />
          <p className="text-xs text-muted-foreground">
            Your app&apos;s hostname. Client-key SDK calls from other origins will be rejected. Use{" "}
            <code>*.example.com</code> to allow all subdomains.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="project-name">Display name</Label>
          <Input id="project-name" name="name" defaultValue={name} placeholder="My project" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="project-id">Project ID</Label>
          <Input id="project-id" defaultValue={projectId} className="font-mono" disabled />
        </div>
        <Button size="sm" type="submit">
          Save
        </Button>
      </div>
    </ActionForm>
  );
}
