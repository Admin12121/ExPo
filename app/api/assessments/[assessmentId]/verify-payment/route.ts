import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";
import { verifyAssessmentPayment } from "@/lib/server/assessments";

export const runtime = "nodejs";

type Context = {
  params: Promise<{
    assessmentId: string;
  }>;
};

function getErrorStatus(error: unknown) {
  if (!(error instanceof Error)) {
    return 500;
  }

  if (
    error.message.includes("permission") ||
    error.message.includes("Only the assigned writer")
  ) {
    return 403;
  }

  if (error.message.includes("not found")) {
    return 404;
  }

  if (error.message.includes("not waiting for verification")) {
    return 409;
  }

  return 400;
}

export async function POST(request: Request, context: Context) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = await context.params;
    const user = session.user as typeof session.user & {
      role?: string | null;
    };

    await verifyAssessmentPayment(user, assessmentId);
    revalidatePath("/assessments");
    revalidatePath(`/assessments/${assessmentId}`);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: getErrorStatus(error) },
    );
  }
}
