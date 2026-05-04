import { auth } from "@/lib/auth/server";
import {
  createAssessmentChatMessage,
  getAssessmentMessages,
} from "@/lib/server/assessment-chat";
import { canAccessAssessmentByRoomId } from "@/lib/server/assessments";
import { buildAssessmentRoomId } from "@/lib/server/assessment-room";

export const runtime = "nodejs";

type Context = {
  params: Promise<{
    assessmentId: string;
  }>;
};

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return null;
  }

  return session.user as typeof session.user & {
    role?: string | null;
  };
}

export async function GET(request: Request, context: Context) {
  const user = await getSessionUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assessmentId } = await context.params;
  const roomId = buildAssessmentRoomId(assessmentId);
  const allowed = await canAccessAssessmentByRoomId(user, roomId);
  if (!allowed) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await getAssessmentMessages(assessmentId);
  return Response.json({ messages });
}

export async function POST(request: Request, context: Context) {
  const user = await getSessionUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assessmentId } = await context.params;
  const payload = (await request.json().catch(() => null)) as {
    replyToMessageId?: string;
    text?: string;
  } | null;

  try {
    const message = await createAssessmentChatMessage(user, assessmentId, {
      replyToMessageId: payload?.replyToMessageId,
      text: payload?.text ?? "",
    });
    return Response.json({ message });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to send message.",
      },
      { status: 400 },
    );
  }
}
