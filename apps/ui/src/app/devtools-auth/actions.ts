"use server";

import { createKey } from "@/lib/handlers/keys";
import type { AdminIdentity } from "@/lib/admin-auth";
import { auth } from "@/auth";

export interface DevtoolsAuthResult {
  token: string;
  projectId: string;
  email: string;
}

/**
 * Mints a fresh admin SDK key for the signed-in user's project and returns
 * it along with the project id. Invoked from the /devtools-auth approval
 * page; the page then postMessages the result back to window.opener.
 */
export async function approveDevtoolsAuthAction(): Promise<DevtoolsAuthResult> {
  const session = await auth();
  const user = session?.user as { email?: string; project_id?: string } | undefined;
  if (!user?.email || !user?.project_id) {
    throw new Error("Not signed in");
  }

  const identity: AdminIdentity = {
    projectId: user.project_id,
    actorEmail: user.email,
    source: "jwt",
  };
  const result = await createKey(identity, { type: "admin" });
  return { token: result.key, projectId: user.project_id, email: user.email };
}
