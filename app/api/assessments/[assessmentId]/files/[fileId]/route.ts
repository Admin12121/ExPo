import { auth } from "@/lib/auth/server";
import { getDownloadableAssessmentFile } from "@/lib/server/assessments";

export const runtime = "nodejs";

type Context = {
  params: Promise<{
    assessmentId: string;
    fileId: string;
  }>;
};

function getAttachmentDisposition(fileName: string) {
  const fallbackName =
    fileName
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/[\x00-\x1F\x7F]/g, "")
      .slice(0, 120) || "download";

  return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(
    fileName,
  )}`;
}

function getInlineDisposition(fileName: string) {
  const fallbackName =
    fileName
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/[\x00-\x1F\x7F]/g, "")
      .slice(0, 120) || "preview";

  return `inline; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(
    fileName,
  )}`;
}

export async function GET(request: Request, context: Context) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assessmentId, fileId } = await context.params;

  try {
    const result = await getDownloadableAssessmentFile(
      session.user as typeof session.user & { role?: string | null },
      assessmentId,
      fileId,
    );

    if (!result) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const shouldPreview =
      new URL(request.url).searchParams.has("preview") &&
      result.file.kind === "payment_proof" &&
      result.file.mimeType.startsWith("image/");

    return new Response(result.data, {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": shouldPreview
          ? getInlineDisposition(result.file.originalName)
          : getAttachmentDisposition(result.file.originalName),
        "content-length": String(result.file.sizeBytes),
        "content-type": shouldPreview
          ? result.file.mimeType
          : "application/octet-stream",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to download file.",
      },
      { status: 403 },
    );
  }
}
