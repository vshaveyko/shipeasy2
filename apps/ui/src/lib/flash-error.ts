import { cookies } from "next/headers";

/**
 * Shared flash-cookie helpers for surfacing server-action errors back to the
 * page that triggered them. Each surface picks its own cookie name so the
 * banner only renders where the user can do something about it.
 *
 * Why a cookie:
 * - `redirect()` from a Server Action throws and cannot return a payload.
 * - URL params would leak sensitive content into history/logs.
 * - httpOnly + short TTL keeps the value private and self-expiring.
 */
export async function setFlashError(opts: {
  cookieName: string;
  scopePath: string;
  message: string;
  maxAgeSeconds?: number;
}) {
  const cookieStore = await cookies();
  cookieStore.set(opts.cookieName, opts.message, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: opts.scopePath,
    maxAge: opts.maxAgeSeconds ?? 30,
  });
}

export async function readFlashError(cookieName: string): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(cookieName)?.value ?? null;
}
