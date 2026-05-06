import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { createAssessmentFromForm } from "@/lib/server/assessments";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as typeof session.user & {
      role?: string | null;
    };

    if (user.role !== "user") {
      return NextResponse.json(
        { error: "Only users can create assessments" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const assessmentId = await createAssessmentFromForm(user, formData);

    return NextResponse.json({
      assessmentId,
      redirect: `/assessments/${assessmentId}`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: err instanceof Error ? 400 : 500 },
    );
  }
}
