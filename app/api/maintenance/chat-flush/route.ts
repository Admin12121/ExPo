import { flushDueAssessmentChatRooms } from "@/lib/server/assessment-chat";
import { isMaintenanceRequestAuthorized } from "@/lib/server/maintenance-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isMaintenanceRequestAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await flushDueAssessmentChatRooms();
  return Response.json({ ok: true, ...result });
}
