import { requireAdmin } from "@/lib/auth/session";
import { getAdminAssessmentReports } from "@/lib/server/assessments";

import { ReportsTable } from "./_components/reports-table";

export default async function ReportsPage() {
  await requireAdmin("/reports");
  const reports = await getAdminAssessmentReports();

  return (
    <main className="grid gap-4 p-4">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold">Reports</h1>
        <p className="text-muted-foreground text-sm">
          Review complaints, problems, suggestions, and improvement requests.
        </p>
      </div>
      <ReportsTable reports={reports} />
    </main>
  );
}
