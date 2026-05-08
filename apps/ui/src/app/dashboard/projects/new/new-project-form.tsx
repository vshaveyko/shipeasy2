"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectAction } from "../actions";

export function NewProjectForm() {
  return (
    <ActionForm action={createProjectAction} loading="Creating project…" success="Project created">
      <div className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="project-name">
            Display name <span className="text-destructive">*</span>
          </Label>
          <Input id="project-name" name="name" placeholder="My app" required autoFocus />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="project-domain">
            Domain <span className="text-destructive">*</span>
          </Label>
          <Input id="project-domain" name="domain" placeholder="https://app.example.com" required />
          <p className="text-xs text-muted-foreground">
            Full URL with <code>http://</code> or <code>https://</code>. Use <code>*</code> to allow
            any origin. Client-key SDK calls from other origins are rejected.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" type="submit">
            Create project
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => history.back()}>
            Cancel
          </Button>
        </div>
      </div>
    </ActionForm>
  );
}
