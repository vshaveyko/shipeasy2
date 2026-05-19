import { cookies } from "next/headers";

export const NEW_KEY_COOKIE = "shipeasy_new_key";
export const KEY_ERROR_COOKIE = "shipeasy_new_key_error";

export async function consumeNewKeyCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(NEW_KEY_COOKIE)?.value ?? null;
}

export async function consumeKeyErrorCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(KEY_ERROR_COOKIE)?.value ?? null;
}
