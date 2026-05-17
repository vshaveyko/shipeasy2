import { redirect } from "next/navigation";

interface NewGateRouteProps {
  params: Promise<{ projectId: string }>;
}

// Legacy deep-link. The "name your gatekeeper" step now lives in a
// BigModalWizard that opens over the gates list via `?new=1`.
export default async function NewGateRoute({ params }: NewGateRouteProps) {
  const { projectId } = await params;
  redirect(`/dashboard/${projectId}/gates?new=1`);
}
