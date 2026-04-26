import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SignInFormSuspended from "./signin-form";

interface Props {
  searchParams: Promise<{ callbackUrl?: string }>;
}

/**
 * Server-rendered shell so already-signed-in users skip the form entirely.
 * The landing nav points "Go to portal" here — for an active session we
 * forward straight to /dashboard (or the requested callback), so the
 * landing stays static and the routing decision lives in one place.
 */
export default async function SignInPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams;
  const session = await auth();
  if (session?.user) {
    const safe =
      callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/dashboard";
    redirect(safe);
  }
  return <SignInFormSuspended />;
}
