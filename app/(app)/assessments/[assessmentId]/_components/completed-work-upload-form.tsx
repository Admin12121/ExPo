"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { AssessmentFileTableUpload } from "../../_components/assessment-file-upload";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";

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

type CompletedWorkFormValues = z.infer<typeof completedWorkSchema>;

type CompletedWorkUploadFormProps = {
  assessmentId: string;
};

export function CompletedWorkUploadForm({
  assessmentId,
}: CompletedWorkUploadFormProps) {
  const router = useRouter();
  const {
    clearErrors,
    formState: { errors, isSubmitted, isSubmitting },
    control,
    handleSubmit,
    setError,
    setValue,
  } = useForm<CompletedWorkFormValues>({
    defaultValues: {
      files: [],
    },
    resolver: zodResolver(completedWorkSchema),
  });
  const selectedFiles = useWatch({ control, name: "files" });
  const hasFiles = selectedFiles.length > 0;

  const handleFilesChange = useCallback(
    (files: File[]) => {
      setValue("files", files, {
        shouldDirty: files.length > 0,
        shouldValidate: isSubmitted || files.length > 0,
      });

      if (!isSubmitted && files.length === 0) {
        clearErrors("files");
      }
    },
    [clearErrors, isSubmitted, setValue],
  );

  async function submit(values: CompletedWorkFormValues) {
    if (values.files.length === 0) {
      setError("files", { message: "Completed file is required." });
      return;
    }

    const formData = new FormData();
    formData.set("assessmentId", assessmentId);
    for (const file of values.files) {
      formData.append("file", file);
    }

    const response = await fetch(`/api/assessments/${assessmentId}/complete`, {
      body: formData,
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      ok?: boolean;
    } | null;

    if (!response.ok || !payload?.ok) {
      setError("root", {
        message: payload?.error ?? "Unable to upload completed file.",
      });
      return;
    }

    router.refresh();
  }

  return (
    <Form className="grid gap-3" onSubmit={handleSubmit(submit)}>
      <Field className={"items-center justify-center"}>
        <AssessmentFileTableUpload
          accept={COMPLETED_ACCEPT}
          error={errors.files?.message}
          maxFiles={MAX_FILES}
          maxSize={COMPLETED_MAX_SIZE}
          onFilesChange={handleFilesChange}
        />
      </Field>
      {errors.root?.message ? (
        <p className="text-destructive text-xs" role="alert">
          {errors.root.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={!hasFiles} loading={isSubmitting} type="submit">
          <UploadIcon aria-hidden="true" className="-ms-1 opacity-60" />
          Upload completed work
        </Button>
      </div>
    </Form>
  );
}
