import { redirect } from "next/navigation";
import Link from "next/link";
import { Terminal } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@shipeasy/shared/Logo";
import { approveCliAuthAction } from "./actions";

interface Props {
  searchParams: Promise<{ state?: string; code_challenge?: string }>;
}

export default async function CliAuthPage({ searchParams }: Props) {
  const { state, code_challenge } = await searchParams;

  if (!state || !code_challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <p className="text-muted-foreground text-sm">
            Invalid link. Run <code className="font-mono">shipeasy auth login</code> again.
          </p>
        </div>
      </div>
    );
  }

  const session = await auth();
  if (!session?.user) {
    const callbackUrl = `/cli-auth?state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(code_challenge)}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
            <Logo className="size-8" />
            ShipEasy
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
              <Terminal className="size-5" />
            </div>
            <CardTitle>Authorize CLI access</CardTitle>
            <CardDescription>
              The ShipEasy CLI is requesting access to your project as{" "}
              <strong>{session.user.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={approveCliAuthAction}>
              <input type="hidden" name="state" value={state} />
              <Button className="w-full" type="submit">
                Approve access
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground">
              Not you?{" "}
              <Link href="/auth/signin" className="underline hover:text-foreground">
                Sign in with a different account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
