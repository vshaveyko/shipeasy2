import type { Metadata } from "next";

import { Page, PageBody } from "@/components/dashboard/page";
import { LinkButton } from "@/components/ui/link-button";

export const metadata: Metadata = { title: "Not found" };

export default function DashboardNotFound() {
  return (
    <Page>
      <PageBody>
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-6">
            <div className="t-caps mb-2 text-[var(--se-fg-3)]">404 · Not found</div>
            <h1 className="text-[18px] font-medium">This page doesn&rsquo;t exist.</h1>
            <p className="mt-2 text-[13px] text-[var(--se-fg-3)]">
              The URL is mistyped, or the resource was deleted. Use the sidebar to find what you
              need, or jump back to the project overview.
            </p>

            <div className="mt-5 flex gap-2">
              <LinkButton size="sm" href="/dashboard">
                Back to dashboard
              </LinkButton>
              <LinkButton size="sm" variant="ghost" href="https://docs.shipeasy.ai">
                Open docs
              </LinkButton>
            </div>
          </div>
        </div>
      </PageBody>
    </Page>
  );
}
