import { cookies } from "next/headers";

export const METRIC_ERROR_COOKIE = "shipeasy_metric_error";

export async function consumeMetricErrorCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(METRIC_ERROR_COOKIE)?.value ?? null;
}
