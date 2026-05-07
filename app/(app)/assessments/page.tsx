import { Frame, FramePanel } from "@/components/ui/frame";
import { requireSession } from "@/lib/auth/session";
import { getAssessmentWorkspace } from "@/lib/server/assessments";

import {
  AssessmentResults,
  UserAssessmentTable,
} from "./_components/assessment-results";
import NewAssessmentDialog from "./_components/new-assessment-dialog";

export default async function AssessmentsPage() {
  const session = await requireSession("/assessments");
  const workspace = await getAssessmentWorkspace(session.user);
  const role = workspace.role;
  const userId = session.user.id;
  const isUser = role === "user";

  return (
    <main className="grid gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex items-center justify-between w-full">
          <h1 className="truncate text-lg font-semibold">Assessments</h1>
          {role === "user" ? <NewAssessmentDialog /> : null}
        </div>
      </div>

      {!isUser ? (
        <Frame className="grid gap-1 md:grid-cols-4">
          {[
            ["Total", workspace.stats.total],
            ["Open", workspace.stats.open],
            ["Active", workspace.stats.active],
            ["Payment", workspace.stats.payment],
          ].map(([label, value]) => (
            <FramePanel key={label} className="p-4 m-0!">
              <div className="text-muted-foreground text-sm">{label}</div>
              <div className="mt-2 text-2xl font-semibold">{value}</div>
            </FramePanel>
          ))}
        </Frame>
      ) : null}

      {isUser ? (
        <UserAssessmentTable
          items={workspace.items}
          role={role}
          userId={userId}
        />
      ) : (
        <AssessmentResults
          items={workspace.items}
          role={role}
          userId={userId}
        />
      )}
    </main>
  );
}
