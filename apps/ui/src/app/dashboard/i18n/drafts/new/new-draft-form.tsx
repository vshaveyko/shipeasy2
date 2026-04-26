"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { createDraftAction } from "../actions";
import { useShipEasyI18n } from "@shipeasy/react";

interface Props {
  profiles: { id: string; name: string }[];
}

export function NewDraftForm({ profiles }: Props) {
  const { t } = useShipEasyI18n();
  const [name, setName] = useState("");

  return (
    <form action={createDraftAction} className="max-w-lg">
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>{t("app.dashboard.i18n.drafts.draft_details")}</CardTitle>
          <CardDescription>
            {t(
              "app.dashboard.i18n.drafts.give_the_draft_a_descriptive_name_and_pick_the_target_profil",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-1.5">
            <Label htmlFor="draft-name">{t("common.name")}</Label>
            <Input
              id="draft-name"
              name="name"
              placeholder={t("app.dashboard.i18n.drafts.fr_translations_q2")}
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="draft-profile">{t("app.dashboard.i18n.drafts.target_profile")}</Label>
            {profiles.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                {t("common.no_profiles_yet")}{" "}
                <LinkButton
                  variant="link"
                  size="sm"
                  className="-ml-1 h-auto p-0"
                  href="/dashboard/i18n/profiles/new"
                >
                  {t("app.dashboard.i18n.drafts.create_one_first")}
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
                  <option value="">{t("app.dashboard.i18n.drafts.select_a_profile")}</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {t("common.no_profiles_yet")}{" "}
                  <LinkButton
                    variant="link"
                    size="sm"
                    className="-ml-1 h-auto p-0 text-xs"
                    href="/dashboard/i18n/profiles/new"
                  >
                    {t("app.dashboard.i18n.drafts.create_one_first")}
                  </LinkButton>
                </p>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <LinkButton variant="ghost" size="sm" href="/dashboard/i18n/drafts">
              {t("common.cancel")}
            </LinkButton>
            <Button size="sm" type="submit" disabled={!name.trim()}>
              {t("app.dashboard.i18n.drafts.create_draft")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
