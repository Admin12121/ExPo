import { handle } from "@upstash/realtime";

import { auth } from "@/lib/auth/server";
import { realtime } from "@/lib/realtime";
import { canAccessAssessmentByRoomId } from "@/lib/server/assessments";

export const runtime = "nodejs";

export const GET = handle({
  realtime,
  async middleware({ request, channels }) {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as typeof session.user & {
      role?: string | null;
    };

    for (const channel of channels) {
      if (channel === "writers") {
        if (user.role !== "writer" && user.role !== "admin") {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        continue;
      }

      if (channel.startsWith("user:")) {
        if (channel !== `user:${user.id}` && user.role !== "admin") {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        continue;
      }

      if (channel.startsWith("assessment:")) {
        const allowed = await canAccessAssessmentByRoomId(user, channel);
        if (!allowed) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        continue;
      }

      return Response.json({ error: "Unknown channel" }, { status: 403 });
    }
  },
});
