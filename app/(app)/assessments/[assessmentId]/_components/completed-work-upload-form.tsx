"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileCheckIcon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AssessmentFileTableUpload } from "../../_components/assessment-file-upload";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { FramePanel } from "@/components/ui/frame";

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
  action: (formData: FormData) => Promise<void>;
  assessmentId: string;
};

export function CompletedWorkUploadForm({
  action,
  assessmentId,
}: CompletedWorkUploadFormProps) {
  const router = useRouter();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
    setValue,
  } = useForm<CompletedWorkFormValues>({
    defaultValues: {
      files: [],
    },
    resolver: zodResolver(completedWorkSchema),
  });

  const handleFilesChange = useCallback(
    (files: File[]) => {
      setValue("files", files, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue],
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

    try {
      await action(formData);
      router.refresh();
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Unable to upload completed file.",
      });
    }
  }

  return (
    <FramePanel className="grid gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <FileCheckIcon className="size-4 text-muted-foreground" />
        Complete work
      </div>
      <Form className="grid gap-3" onSubmit={handleSubmit(submit)}>
        <Field>
          <FieldLabel>Completed file</FieldLabel>
          <AssessmentFileTableUpload
            accept={COMPLETED_ACCEPT}
            error={errors.files?.message}
            maxFiles={MAX_FILES}
            maxSize={COMPLETED_MAX_SIZE}
            onFilesChange={handleFilesChange}
          />
        </Field>
        {errors.root?.message ? (
          <p className="text-destructive-foreground text-xs" role="alert">
            {errors.root.message}
          </p>
        ) : null}
        <Button loading={isSubmitting} type="submit">
          <UploadIcon />
          Upload completed file
        </Button>
      </Form>
    </FramePanel>
  );
}
