import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/auth";

export default async function LandingPage() {
  const session = await auth();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-lg">ShipEasy</span>
          <nav className="flex items-center gap-4">
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
              Docs
            </Link>
            {session ? (
              <Button render={<Link href="/dashboard" />} size="sm">
                Dashboard
              </Button>
            ) : (
              <Button render={<Link href="/auth/signin" />} size="sm">
                Sign in
              </Button>
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
          ShipEasy gives you auth, docs, and a polished UI out of the box so you can focus on
          building your product.
        </p>
        <div className="flex gap-3 mt-2">
          <Button render={<Link href="/auth/signin" />} size="lg">
            Get started free
          </Button>
          <Button render={<Link href="/docs" />} variant="outline" size="lg">
            Read the docs
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ShipEasy
      </footer>
    </div>
  );
}
