import { redirect } from "next/navigation";

/**
 * The new-config flow is now hosted inside the configs list via
 * `<BigModalWizard kind="configs">`, opened by `?new=1`. Keep this route
 * as a redirect so existing deep-links (sidebar CTAs, docs, email) work.
 */
export default async function NewConfigRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/dashboard/${projectId}/configs/values?new=1`);
}
