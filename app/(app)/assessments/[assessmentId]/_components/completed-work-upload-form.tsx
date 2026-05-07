"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { z } from "zod";

import { AssessmentFileTableUpload } from "../../_components/assessment-file-upload";
import { Field } from "@/components/ui/field";
import type { ExistingUploadFile } from "@/hooks/use-file-upload";

const MAX_FILES = 3;
const COMPLETED_MAX_SIZE = 30 * 1024 * 1024;
const COMPLETED_ACCEPT = ".pdf,.docx,.txt,.zip";
const COMPLETED_EXTENSIONS = new Set(["pdf", "docx", "txt", "zip"]);

function isFile(value: unknown): value is File {
  return value instanceof File && value.size > 0;
}

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

const completedWorkSchema = z.object({
  files: z
    .array(
      z
        .custom<File>(isFile, "Completed file is required.")
        .refine((file) => file.size <= COMPLETED_MAX_SIZE, "File is too large.")
        .refine(
          (file) => COMPLETED_EXTENSIONS.has(getExtension(file.name)),
          "Use a PDF, DOCX, TXT, or ZIP file.",
        ),
    )
    .min(1, "Completed file is required.")
    .max(MAX_FILES, `Upload up to ${MAX_FILES} files.`),
});

type CompletedWorkUploadFormProps = {
  assessmentId: string;
  canManageFiles: boolean;
  initialFiles: ExistingUploadFile[];
};

function getFilesSignature(files: File[]) {
  return files
    .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
    .join("|");
}

function getSchemaError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Unable to upload completed file.";
}

export function CompletedWorkUploadForm({
  assessmentId,
  canManageFiles,
  initialFiles,
}: CompletedWorkUploadFormProps) {
  const router = useRouter();
  const lastSubmittedSignatureRef = useRef<string | null>(null);
  const uploadingRef = useRef(false);
  const [fileError, setFileError] = useState<string>();
  const [busyMessage, setBusyMessage] = useState<string>();
  const [uploadError, setUploadError] = useState<string>();

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!canManageFiles) {
        return;
      }

      if (files.length === 0) {
        lastSubmittedSignatureRef.current = null;
        setFileError(undefined);
        setUploadError(undefined);
        return;
      }

      const signature = getFilesSignature(files);
      if (
        uploadingRef.current ||
        lastSubmittedSignatureRef.current === signature
      ) {
        return;
      }

      const parsed = completedWorkSchema.safeParse({ files });
      if (!parsed.success) {
        setFileError(getSchemaError(parsed.error));
        return;
      }

      const formData = new FormData();
      formData.set("assessmentId", assessmentId);
      for (const file of parsed.data.files) {
        formData.append("file", file);
      }

      lastSubmittedSignatureRef.current = signature;
      uploadingRef.current = true;
      setFileError(undefined);
      setUploadError(undefined);
      setBusyMessage("Uploading completed work...");

      try {
        const response = await fetch(
          `/api/assessments/${assessmentId}/complete`,
          {
            body: formData,
            method: "POST",
          },
        );
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          ok?: boolean;
        } | null;

        if (!response.ok || !payload?.ok) {
          lastSubmittedSignatureRef.current = null;
          setUploadError(payload?.error ?? "Unable to upload completed file.");
          return;
        }

        router.refresh();
      } catch {
        lastSubmittedSignatureRef.current = null;
        setUploadError("Unable to upload completed file.");
      } finally {
        uploadingRef.current = false;
        setBusyMessage(undefined);
      }
    },
    [assessmentId, canManageFiles, router],
  );

  const removeExistingFile = useCallback(
    async (file: ExistingUploadFile) => {
      if (!canManageFiles) {
        return;
      }

      setUploadError(undefined);
      setBusyMessage("Removing completed work...");

      try {
        const response = await fetch(
          `/api/assessments/${assessmentId}/complete`,
          {
            body: JSON.stringify({ fileId: file.id }),
            headers: {
              "content-type": "application/json",
            },
            method: "DELETE",
          },
        );
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          ok?: boolean;
        } | null;

        if (!response.ok || !payload?.ok) {
          const message =
            payload?.error ?? "Unable to remove completed file.";
          setUploadError(message);
          throw new Error(message);
        }

        router.refresh();
      } catch (error) {
        setUploadError(
          error instanceof Error
            ? error.message
            : "Unable to remove completed file.",
        );
        throw error;
      } finally {
        setBusyMessage(undefined);
      }
    },
    [assessmentId, canManageFiles, router],
  );

  return (
    <div className="grid gap-3">
      <Field
        aria-busy={Boolean(busyMessage)}
        className="items-center justify-center"
      >
        <AssessmentFileTableUpload
          accept={COMPLETED_ACCEPT}
          disabled={Boolean(busyMessage)}
          error={fileError}
          initialFiles={initialFiles}
          maxFiles={MAX_FILES}
          maxSize={COMPLETED_MAX_SIZE}
          onExistingFileRemove={removeExistingFile}
          onFilesChange={uploadFiles}
          readOnly={!canManageFiles}
        />
      </Field>
      {busyMessage ? (
        <p className="text-muted-foreground text-xs" role="status">
          {busyMessage}
        </p>
      ) : null}
      {uploadError ? (
        <p className="text-destructive text-xs" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
