"use client";

import { useState } from "react";
import { ArrowRight, BookOpen, Plus, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { MetricsDashboard } from "./dashboard";
import { EventDrawer } from "./event-drawer";
import { OnboardingWizard } from "./onboarding-wizard";
import type { CustomEvent } from "./mock-data";

type View = "empty" | "dashboard";

export function MetricsPageRoot({ initialView = "empty" }: { initialView?: View }) {
  const [view, setView] = useState<View>(initialView);
  const [showWizard, setShowWizard] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CustomEvent | null>(null);

  const closeDrawer = () => {
    setCreating(false);
    setEditing(null);
  };

  return (
    <>
      {view === "empty" ? (
        <HeroEmptyState
          kind="metrics"
          ctaLabel="Start in 60 seconds"
          extraAction={
            <>
              <Button variant="ghost" size="sm" onClick={() => setView("dashboard")}>
                Skip to demo data <ArrowRight className="size-3" />
              </Button>
              <Button onClick={() => setShowWizard(true)}>
                <Zap className="size-3" /> Start setup
              </Button>
            </>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowWizard(true)}>
              <BookOpen className="size-3" /> Setup guide
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-3" /> Register event
            </Button>
          </div>
          <MetricsDashboard
            onOpenSetup={() => setShowWizard(true)}
            onCreate={() => setCreating(true)}
            onEditEvent={(e) => setEditing(e)}
          />
        </>
      )}

      {showWizard && (
        <OnboardingWizard
          onClose={() => setShowWizard(false)}
          onComplete={() => {
            setShowWizard(false);
            setView("dashboard");
          }}
        />
      )}

      {(creating || editing) && (
        <EventDrawer event={editing} onClose={closeDrawer} onSave={closeDrawer} />
      )}
    </>
  );
}
