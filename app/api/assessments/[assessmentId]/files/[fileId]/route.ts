import { auth } from "@/lib/auth/server";
import { getDownloadableAssessmentFile } from "@/lib/server/assessments";

export const runtime = "nodejs";

type Context = {
  params: Promise<{
    assessmentId: string;
    fileId: string;
  }>;
};

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

    return new Response(result.data, {
      headers: {
        "content-disposition": `attachment; filename="${encodeURIComponent(
          result.file.originalName,
        )}"`,
        "content-length": String(result.file.sizeBytes),
        "content-type": "application/octet-stream",
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
