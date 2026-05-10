import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";
import {
  createAssessmentReport,
  createGeneralAssessmentReport,
} from "@/lib/server/assessments";

export const runtime = "nodejs";

function getText(value: unknown, maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    assessmentId?: unknown;
    category?: unknown;
    reason?: unknown;
  } | null;

  const assessmentId = getText(payload?.assessmentId, 80);
  const category = getText(payload?.category, 32);
  const reason = getText(payload?.reason);

  if (!reason) {
    return NextResponse.json(
      { error: "Tell us what happened before submitting." },
      { status: 400 },
    );
  }

  try {
    if (assessmentId) {
      await createAssessmentReport(
        session.user as typeof session.user & { role?: string | null },
        assessmentId,
        category,
        reason,
      );
    } else {
      await createGeneralAssessmentReport(
        session.user as typeof session.user & { role?: string | null },
        category,
        reason,
      );
    }

    revalidatePath("/reports");
    if (assessmentId) {
      revalidatePath(`/assessments/${assessmentId}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit the report.",
      },
      { status: 400 },
    );
  }
}
