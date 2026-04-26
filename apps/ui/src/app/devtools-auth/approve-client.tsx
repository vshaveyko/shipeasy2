"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  approveDevtoolsAuthAction,
  listDevtoolsProjectsAction,
  type ProjectOption,
} from "./actions";
import { useShipEasyI18n } from "@shipeasy/react";

interface Props {
  /** Origin of the opener window; restricts postMessage target. */
  origin: string;
  email: string;
}

type Phase = "loading" | "ready" | "pending" | "success" | "error";

export function ApproveButton({ origin, email }: Props) {
  const { t } = useShipEasyI18n();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [projectList, setProjectList] = useState<ProjectOption[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    listDevtoolsProjectsAction()
      .then((list) => {
        setProjectList(list);
        if (list.length === 1) setSelected(list[0].id);
        setPhase("ready");
      })
      .catch((e) => {
        setPhase("error");
        setError(e instanceof Error ? e.message : String(e));
      });
  }, []);

  async function onApprove() {
    if (!selected) return;
    setPhase("pending");
    setError(null);
    try {
      const result = await approveDevtoolsAuthAction(selected);
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "se:devtools-auth",
            token: result.token,
            projectId: result.projectId,
            projectName: result.projectName,
            email: result.email,
          },
          origin,
        );
      }
      setPhase("success");
      setTimeout(() => window.close(), 600);
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (phase === "loading") {
    return (
      <p className="text-muted-foreground text-center text-sm">
        {t("app.devtools-auth.loading_projects")}
      </p>
    );
  }

  if (phase === "success") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {t("app.devtools-auth.connected_you_can_close_this_window")}
      </p>
    );
  }

  if (projectList.length === 0) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        {t("app.devtools-auth.no_projects_found_for")} <strong>{email}</strong>.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wider uppercase">
          {t("app.devtools-auth.choose_a_project")}
        </label>
        <div className="space-y-1.5" role="radiogroup" aria-label={t("app.devtools-auth.projects")}>
          {projectList.map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                selected === p.id ? "border-primary bg-muted" : "hover:bg-muted/60"
              }`}
            >
              <input
                type="radio"
                name="devtools-project"
                value={p.id}
                checked={selected === p.id}
                onChange={() => setSelected(p.id)}
                className="accent-primary size-4"
              />
              <span className="flex-1">
                <span className="block font-medium">{p.name}</span>
                <span className="text-muted-foreground block text-xs capitalize">{p.plan}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <Button className="w-full" onClick={onApprove} disabled={phase === "pending" || !selected}>
        {phase === "pending"
          ? t("common.connecting")
          : t("app.devtools-auth.approve_as", { email })}
      </Button>
      {error && <p className="text-destructive text-center text-xs">{error}</p>}
    </div>
  );
}
