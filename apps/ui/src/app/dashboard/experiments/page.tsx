import { ExperimentsContent } from "./experiments-content";

export const dynamic = "force-static";
export const revalidate = false;

export default function ExperimentsPage() {
  return <ExperimentsContent />;
}
