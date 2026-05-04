import { Frame } from "@/components/ui/frame";
import { requireSession } from "@/lib/auth/session";

export default async function AssessmentsPage() {
  await requireSession("/assessments");

  return (
    <main className="grid gap-4 p-4">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold">Assessments</h1>
        <p className="truncate text-sm text-muted-foreground">
          Assessment tools will live here.
        </p>
      </div>
      <Frame className="p-4 text-sm text-muted-foreground">
        No assessments have been added yet.
      </Frame>
    </main>
  );
}
