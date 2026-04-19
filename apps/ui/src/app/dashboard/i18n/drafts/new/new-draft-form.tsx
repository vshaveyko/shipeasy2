"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { createDraftAction } from "../actions";

interface Props {
  profiles: { id: string; name: string }[];
}

export function NewDraftForm({ profiles }: Props) {
  const [name, setName] = useState("");

  return (
    <form action={createDraftAction} className="max-w-lg">
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Draft details</CardTitle>
          <CardDescription>
            Give the draft a descriptive name and pick the target profile. Translators and AI tools
            will propose values for the keys in that profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-1.5">
            <Label htmlFor="draft-name">Name</Label>
            <Input
              id="draft-name"
              name="name"
              placeholder="fr-translations-q2"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="draft-profile">Target profile</Label>
            {profiles.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                No profiles yet.{" "}
                <LinkButton
                  variant="link"
                  size="sm"
                  className="-ml-1 h-auto p-0"
                  href="/dashboard/i18n/profiles/new"
                >
                  Create one first.
                </LinkButton>
              </div>
            ) : (
              <>
                <select
                  id="draft-profile"
                  name="profile_id"
                  required
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Select a profile…</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  No profiles yet?{" "}
                  <LinkButton
                    variant="link"
                    size="sm"
                    className="-ml-1 h-auto p-0 text-xs"
                    href="/dashboard/i18n/profiles/new"
                  >
                    Create one first.
                  </LinkButton>
                </p>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <LinkButton variant="ghost" size="sm" href="/dashboard/i18n/drafts">
              Cancel
            </LinkButton>
            <Button size="sm" type="submit" disabled={!name.trim()}>
              Create draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
