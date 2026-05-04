import "server-only";

function readPositiveInteger(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    return fallback;
  }

  return value;
}

export const serverEnv = {
  assessmentChatFlushAgeMs: readPositiveInteger(
    "ASSESSMENT_CHAT_FLUSH_AGE_MS",
    25 * 60 * 1000,
  ),
  assessmentChatMaxPendingBytes: readPositiveInteger(
    "ASSESSMENT_CHAT_MAX_PENDING_BYTES",
    10 * 1024 * 1024,
  ),
  assessmentChatMaxPendingMessages: readPositiveInteger(
    "ASSESSMENT_CHAT_MAX_PENDING_MESSAGES",
    50,
  ),
  assessmentCleanupRetentionDays: readPositiveInteger(
    "ASSESSMENT_CLEANUP_RETENTION_DAYS",
    7,
  ),
  maxAssessmentUploadBytes: readPositiveInteger(
    "MAX_ASSESSMENT_UPLOAD_BYTES",
    25 * 1024 * 1024,
  ),
  maxCompletedUploadBytes: readPositiveInteger(
    "MAX_COMPLETED_UPLOAD_BYTES",
    50 * 1024 * 1024,
  ),
  maxPaymentProofUploadBytes: readPositiveInteger(
    "MAX_PAYMENT_PROOF_UPLOAD_BYTES",
    10 * 1024 * 1024,
  ),
  maintenanceApiKey: process.env.MAINTENANCE_API_KEY ?? "",
  storageDir: process.env.ATHENA_STORAGE_DIR?.trim() || "storage",
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL ?? "",
};
