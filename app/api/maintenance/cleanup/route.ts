import { runAssessmentCleanup } from "@/lib/server/assessments";
import { isMaintenanceRequestAuthorized } from "@/lib/server/maintenance-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isMaintenanceRequestAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAssessmentCleanup();
  return Response.json({ ok: true, ...result });
}
