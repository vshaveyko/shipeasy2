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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold">
            <Logo className="size-8" />
            ShipEasy
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="bg-muted mx-auto mb-2 flex size-10 items-center justify-center rounded-full">
              <Terminal className="size-5" />
            </div>
            <CardTitle>Authorize DevTools access</CardTitle>
            <CardDescription>
              ShipEasy DevTools from{" "}
              <code className="font-mono text-xs">{new URL(origin).host}</code> is requesting access
              to your project.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ApproveButton origin={origin} email={user.email} />
            <p className="text-muted-foreground text-center text-xs">
              Not you?{" "}
              <Link href="/auth/signin" className="hover:text-foreground underline">
                Sign in with a different account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
