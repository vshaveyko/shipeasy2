import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewProjectForm } from "./new-project-form";

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New project"
        description="Projects scope your experiments, gates, configs, and SDK keys."
      />
      <Card className="max-w-lg">
        <CardHeader className="border-b pb-4">
          <CardTitle>Project details</CardTitle>
          <CardDescription>You can change these later in Settings.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <NewProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}
