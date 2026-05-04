import { runAssessmentCleanup } from "@/lib/server/assessments";
import { serverEnv } from "@/lib/server/env";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  if (!serverEnv.maintenanceApiKey) {
    return process.env.APP_ENV !== "production";
  }

  return request.headers.get("authorization") ===
    `Bearer ${serverEnv.maintenanceApiKey}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAssessmentCleanup();
  return Response.json({ ok: true, ...result });
}
