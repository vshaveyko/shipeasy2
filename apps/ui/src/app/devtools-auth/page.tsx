import { redirect } from "next/navigation";
import Link from "next/link";
import { Terminal } from "lucide-react";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@shipeasy/shared/Logo";
import { ApproveButton } from "./approve-client";

interface Props {
  searchParams: Promise<{ origin?: string }>;
}

/**
 * Approval page for the @shipeasy/devtools browser overlay.
 *
 * Flow:
 *   1. Devtools on any origin opens this page in a popup with ?origin=<opener-origin>.
 *   2. If not signed in, Auth.js bounces through /auth/signin and back here.
 *   3. User clicks Approve; server mints an admin SDK key scoped to their project.
 *   4. Client posts { token, projectId } back to window.opener (origin-restricted).
 *   5. Devtools saves the session and closes the popup.
 *
 * No worker dependency — entirely self-contained in the admin app.
 */
export default async function DevtoolsAuthPage({ searchParams }: Props) {
  const { origin } = await searchParams;

  if (!origin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-muted-foreground max-w-sm text-center text-sm">
          Missing <code>origin</code> parameter. Open the ShipEasy DevTools overlay and click
          Connect again.
        </p>
      </div>
    );
  }

  // Basic sanity check — must be a parseable URL origin.
  try {
    const parsed = new URL(origin);
    if (parsed.origin !== origin) throw new Error("not an origin");
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-destructive max-w-sm text-center text-sm">Invalid origin parameter.</p>
      </div>
    );
  }

  const session = await auth();
  const user = session?.user as { email?: string; project_id?: string } | undefined;
  if (!user?.email || !user?.project_id) {
    const callbackUrl = `/devtools-auth?origin=${encodeURIComponent(origin)}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    // The page renders inside a 460×640 popup. Tight vertical rhythm + a
    // single "max" wrapper keeps the whole flow visible without scrolling
    // even on the narrowest authorization windows.
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-start gap-3 overflow-x-hidden px-3 py-4 sm:justify-center sm:gap-5 sm:py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-base font-semibold sm:gap-2 sm:text-xl"
      >
        <Logo className="size-5 sm:size-7" />
        ShipEasy
      </Link>

      <Card className="w-full max-w-full min-w-0 sm:max-w-sm">
        <CardHeader className="space-y-1 px-4 pb-2 pt-4 text-center sm:px-6 sm:pb-3 sm:pt-6">
          <div className="bg-muted mx-auto flex size-8 items-center justify-center rounded-full sm:size-10">
            <Terminal className="size-4 sm:size-5" />
          </div>
          <CardTitle className="text-base sm:text-lg">Authorize DevTools access</CardTitle>
          <CardDescription className="text-[12px] leading-snug sm:text-sm">
            ShipEasy DevTools from{" "}
            <code className="font-mono text-[11px] break-all sm:text-xs">
              {new URL(origin).host}
            </code>{" "}
            is requesting access to your project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 px-4 pb-4 sm:space-y-3 sm:px-6 sm:pb-6">
          <ApproveButton origin={origin} email={user.email} />
          <p className="text-muted-foreground text-center text-[11px] sm:text-xs">
            Not you?{" "}
            <Link href="/auth/signin" className="hover:text-foreground underline">
              Sign in with a different account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
