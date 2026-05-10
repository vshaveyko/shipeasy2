"use client";

// Thin "name your gatekeeper" step. The actual authoring (stack of
// sub-gates, conditions, rollouts, public floor, test panel, etc.) lives in
// the wizard at `[projectId]/gates/[id]`. This page just collects the SDK
// key — once it exists, createGateAction redirects into the wizard for the
// new gate so the user can configure everything inline.

import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Shield } from "lucide-react";

import { projectIdFromPathname } from "@/lib/project-path";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { createGateAction } from "../actions";

export default function NewGatePage() {
  const pathname = usePathname();
  const projectId = projectIdFromPathname(pathname) ?? "";

  return (
    <form action={createGateAction} className="contents">
      <Page>
        <PageHeader
          kicker={
            <LinkButton
              variant="ghost"
              size="sm"
              className="-ml-2"
              href={`/dashboard/${projectId}/gates`}
            >
              <ArrowLeft className="size-3.5" /> Gates
            </LinkButton>
          }
          title="New gatekeeper"
          description="Pick a key — that's the string your SDK will fetch with. The gatekeeper editor opens next so you can stack rollouts, conditions, and the public floor."
        />
        <PageBody className="space-y-6">
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-4" /> Identity
              </CardTitle>
              <CardDescription>
                The key is locked after the first publish — pick a stable name like{" "}
                <code className="font-mono">premium_features</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-1.5">
                <Label htmlFor="gate-key">Key</Label>
                <Input
                  id="gate-key"
                  name="key"
                  placeholder="premium_features"
                  className="font-mono"
                  required
                  pattern="[a-z0-9][a-z0-9_\-]{0,59}"
                  title="Lowercase letters, digits, - or _. Max 64 chars total."
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  SDK consumers fetch with{" "}
                  <code className="font-mono">shipeasy.gate(&apos;…&apos;)</code>.
                </p>
              </div>
              {/* The wizard owns the rollout %, rules, and metadata. We seed a
                  0% public floor here so the row lands with a sane default
                  the wizard can read on first load. */}
              <input type="hidden" name="rollout_pct" value={0} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <LinkButton variant="ghost" size="sm" href={`/dashboard/${projectId}/gates`}>
              Cancel
            </LinkButton>
            <Button size="sm" type="submit">
              Create gate <ArrowRight className="size-3" />
            </Button>
          </div>
        </PageBody>
      </Page>
    </form>
  );
}
