import { KeysContent } from "./keys-content";

/**
 * Static shell — auth/redirect lives in the dashboard layout. Data
 * loads client-side via SWR so this route doesn't drag the i18n
 * handler chain (drizzle + the entire keys aggregation query) into
 * the SSR bundle.
 */
export const dynamic = "force-static";
export const revalidate = false;

export default function I18nKeysPage() {
  return <KeysContent />;
}
