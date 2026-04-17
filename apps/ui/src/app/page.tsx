import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";

export default async function LandingPage() {
  const session = await auth();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-lg">ShipEasy</span>
          <nav className="flex items-center gap-4">
            <a
              href="https://docs.shipeasy.ai"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Docs
            </a>
            {session ? (
              <LinkButton href="/dashboard" size="sm">
                Dashboard
              </LinkButton>
            ) : (
              <LinkButton href="/auth/signin" size="sm">
                Sign in
              </LinkButton>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <Badge variant="secondary">Now in beta</Badge>
        <h1 className="text-5xl font-bold tracking-tight max-w-2xl">
          Ship faster with the tools you need
        </h1>
        <p className="text-xl text-muted-foreground max-w-lg">
          Three products in one platform: feature Configs, Experiments, and a String Manager for
          localization — all backed by the same project, SDK keys, and plan.
        </p>
        <div className="flex gap-3 mt-2">
          <LinkButton href="/auth/signin" size="lg">
            Get started free
          </LinkButton>
          <LinkButton
            href="https://docs.shipeasy.ai"
            target="_blank"
            rel="noreferrer"
            variant="outline"
            size="lg"
          >
            Read the docs
          </LinkButton>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ShipEasy
      </footer>
    </div>
  );
}
