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
          <Label htmlFor="project-domain">Domain</Label>
          <Input id="project-domain" name="domain" placeholder="app.example.com" />
          <p className="text-xs text-muted-foreground">
            Client-key SDK calls from other origins will be rejected. You can set this later.
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
