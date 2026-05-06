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
  modules: {
    translations: boolean;
    configs: boolean;
    gates: boolean;
    experiments: boolean;
    feedback: boolean;
  };
}

const MODULE_FIELDS: Array<{
  key: keyof Props["modules"];
  name: string;
  label: string;
  description: string;
}> = [
  {
    key: "translations",
    name: "moduleTranslations",
    label: "Translations",
    description: "Manage i18n profiles, drafts, and label keys.",
  },
  {
    key: "configs",
    name: "moduleConfigs",
    label: "Configs",
    description: "Per-environment JSON configs published to your SDKs.",
  },
  {
    key: "gates",
    name: "moduleGates",
    label: "Gatekeepers",
    description: "Feature gates with targeting rules and percentage rollouts.",
  },
  {
    key: "experiments",
    name: "moduleExperiments",
    label: "Experiments",
    description: "A/B tests, universes, metrics, and statistical analysis.",
  },
  {
    key: "feedback",
    name: "moduleFeedback",
    label: "Bugs & feature requests",
    description: "In-app bug reports and feature requests captured via devtools.",
  },
];

export function ProjectSettingsForm({ projectId, name, domain, modules }: Props) {
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
        <div className="grid gap-2 border-t pt-4">
          <div>
            <Label>Modules</Label>
            <p className="text-xs text-muted-foreground">
              Toggle which surfaces are exposed in this project&apos;s devtools overlay.
            </p>
          </div>
          <div className="grid gap-2">
            {MODULE_FIELDS.map((m) => (
              <label
                key={m.key}
                className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name={m.name}
                  defaultChecked={modules[m.key]}
                  className="mt-1 h-4 w-4"
                />
                <span className="flex flex-col">
                  <span className="font-medium">{m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <Button size="sm" type="submit">
          Save
        </Button>
      </div>
    </ActionForm>
  );
}
