"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import { resolveAssessmentReport } from "@/lib/server/assessments";

export async function resolveReportAction(formData: FormData) {
  const session = await requireAdmin("/reports");
  const reportId = String(formData.get("reportId") ?? "").trim();
  const assessmentId = String(formData.get("assessmentId") ?? "").trim();

  if (!reportId) {
    return;
  }

  await resolveAssessmentReport(session.user, reportId);
  revalidatePath("/reports");
  if (assessmentId) {
    revalidatePath(`/assessments/${assessmentId}`);
  }
}
