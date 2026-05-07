import type { Metadata } from "next";

import { KeysContent } from "./keys-content";

export const metadata: Metadata = { title: "Label keys" };

export default function I18nKeysPage() {
  return <KeysContent />;
}
