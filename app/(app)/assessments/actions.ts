"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import {
  cancelOpenAssessment,
  claimAssessment,
  completeAssessmentFromForm,
  createAssessmentFromForm,
  createAssessmentReport,
  requestMutualClose,
  resolveAssessmentReport,
  submitPaymentProofFromForm,
  verifyAssessmentPayment,
} from "@/lib/server/assessments";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createAssessmentAction(formData: FormData) {
  const session = await requireSession("/assessments");

  if (session.user.role !== "user") {
    throw new Error("Only users can create and upload assessments.");
  }

  const assessmentId = await createAssessmentFromForm(session.user, formData);

  revalidatePath("/assessments");
  redirect(`/assessments/${assessmentId}`);
}

export async function claimAssessmentAction(formData: FormData) {
  const session = await requireSession("/assessments");
  const assessmentId = getText(formData, "assessmentId");

  await claimAssessment(session.user, assessmentId);
  revalidatePath("/assessments");
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function cancelAssessmentAction(formData: FormData) {
  const session = await requireSession("/assessments");
  const assessmentId = getText(formData, "assessmentId");

  await cancelOpenAssessment(session.user, assessmentId);
  revalidatePath("/assessments");
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function requestCloseAction(formData: FormData) {
  const session = await requireSession("/assessments");
  const assessmentId = getText(formData, "assessmentId");
  const reason = getText(formData, "reason");

  await requestMutualClose(session.user, assessmentId, reason);
  revalidatePath("/assessments");
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function completeAssessmentAction(formData: FormData) {
  const session = await requireSession("/assessments");
  const assessmentId = getText(formData, "assessmentId");

  await completeAssessmentFromForm(session.user, assessmentId, formData);
  revalidatePath("/assessments");
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function submitPaymentProofAction(formData: FormData) {
  const session = await requireSession("/assessments");
  const assessmentId = getText(formData, "assessmentId");

  await submitPaymentProofFromForm(session.user, assessmentId, formData);
  revalidatePath("/assessments");
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function verifyPaymentAction(formData: FormData) {
  const session = await requireSession("/assessments");
  const assessmentId = getText(formData, "assessmentId");

  await verifyAssessmentPayment(session.user, assessmentId);
  revalidatePath("/assessments");
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function reportAssessmentAction(formData: FormData) {
  const session = await requireSession("/assessments");
  const assessmentId = getText(formData, "assessmentId");
  const reason = getText(formData, "reason");

  await createAssessmentReport(session.user, assessmentId, reason);
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function resolveReportAction(formData: FormData) {
  const session = await requireSession("/assessments");
  const assessmentId = getText(formData, "assessmentId");
  const reportId = getText(formData, "reportId");

  await resolveAssessmentReport(session.user, reportId);
  revalidatePath(`/assessments/${assessmentId}`);
}
