import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Logo } from "@shipeasy/shared/Logo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

export default function CliAuthSuccessPage() {
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
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>CLI authorized</CardTitle>
            <CardDescription>
              You can close this window. The CLI will finish logging in automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <LinkButton variant="outline" size="sm" href="/dashboard">
              Go to dashboard
            </LinkButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
