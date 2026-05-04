import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createAssessmentFromForm } from "@/lib/server/assessments";

export async function POST(request: Request) {
  try {
    const session = await requireSession("/assessments");
    if (session.user.role !== "user") {
      return NextResponse.json({ error: "Only users can create assessments" }, { status: 403 });
    }

    const formData = await request.formData();
    const assessmentId = await createAssessmentFromForm(session.user, formData as unknown as FormData);

    return NextResponse.json({ assessmentId, redirect: `/assessments/${assessmentId}` });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
