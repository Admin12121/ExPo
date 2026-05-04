import "server-only";

import { createHash } from "node:crypto";

function getSecretSalt() {
  return process.env.BETTER_AUTH_SECRET ?? "dev-athena-room-secret";
}

export function buildAssessmentRoomId(assessmentId: string) {
  const fingerprint = createHash("sha256")
    .update(`${getSecretSalt()}:assessment:${assessmentId}`)
    .digest("hex")
    .slice(0, 16);

  return `assessment:${assessmentId}:${fingerprint}`;
}
