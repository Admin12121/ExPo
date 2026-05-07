"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyholeIcon, UploadIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AssessmentFileDropzone } from "../../_components/assessment-file-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";

const PAYMENT_PROOF_MAX_SIZE = 10 * 1024 * 1024;
const PAYMENT_PROOF_ACCEPT =
  "image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,.tif,.tiff,.heic,.heif";
const PAYMENT_PROOF_EXTENSIONS = new Set([
  "avif",
  "bmp",
  "gif",
  "heic",
  "heif",
  "jpeg",
  "jpg",
  "png",
  "tif",
  "tiff",
  "webp",
]);
const MATRIX_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function isFile(value: unknown): value is File {
  return value instanceof File && value.size > 0;
}

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function generateMatrix(length: number, source?: string) {
  let result = "";
  for (let index = 0; index < length; index += 1) {
    if (source && Math.random() > 0.25) {
      result += source[index] ?? "";
    } else {
      result += MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
    }
  }

  return result;
}

const paymentProofSchema = z.object({
  files: z
    .array(
      z
        .custom<File>(isFile, "Payment proof file is required.")
        .refine(
          (file) => file.size <= PAYMENT_PROOF_MAX_SIZE,
          "File is too large.",
        )
        .refine(
          (file) => PAYMENT_PROOF_EXTENSIONS.has(getExtension(file.name)),
          "Use an image file.",
        ),
    )
    .min(1, "Payment proof file is required.")
    .max(1, "Upload one payment proof file."),
});

type PaymentProofFormValues = z.infer<typeof paymentProofSchema>;

type PaymentProofDialogProps = {
  assessmentId: string;
  status: string;
};

export function PaymentProofDialog({
  assessmentId,
  status,
}: PaymentProofDialogProps) {
  const router = useRouter();
  const matrixRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const canSubmitProof = status === "completed_pending_payment";
  const isSubmitted = status === "payment_submitted";
  const {
    formState: { errors, isSubmitted: formSubmitted, isSubmitting },
    handleSubmit,
    reset,
    setError,
    setValue,
  } = useForm<PaymentProofFormValues>({
    defaultValues: {
      files: [],
    },
    resolver: zodResolver(paymentProofSchema),
  });

  useEffect(() => {
    const element = matrixRef.current;
    if (!element) {
      return;
    }

    const glyphHeight = 28;
    const glyphWidth = 18 * 0.6 + 4;
    const glyphCount = Math.max(
      80,
      Math.floor(
        (element.offsetHeight / glyphHeight + 1) *
          (element.offsetWidth / glyphWidth + 1),
      ),
    );

    element.textContent = generateMatrix(glyphCount);
    const interval = window.setInterval(() => {
      element.textContent = generateMatrix(
        glyphCount,
        element.textContent ?? undefined,
      );
    }, 100);

    return () => window.clearInterval(interval);
  }, []);

  const handleFilesChange = useCallback(
    (files: File[]) => {
      setValue("files", files, {
        shouldDirty: files.length > 0,
        shouldValidate: formSubmitted || files.length > 0,
      });
    },
    [formSubmitted, setValue],
  );

  async function submit(values: PaymentProofFormValues) {
    const [file] = values.files;
    if (!file) {
      setError("files", { message: "Payment proof file is required." });
      return;
    }

    const formData = new FormData();
    formData.set("assessmentId", assessmentId);
    formData.set("file", file);

    const response = await fetch(
      `/api/assessments/${assessmentId}/payment-proof`,
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
      setError("root", {
        message: payload?.error ?? "Unable to submit payment proof.",
      });
      return;
    }

    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={!canSubmitProof}
        render={
          <button
            className="group w-full cursor-pointer rounded-xl border border-dashed border-input bg-background/40 p-6 text-center transition-colors disabled:cursor-default"
            type="button"
          />
        }
      >
        <figure className="mx-auto grid max-w-xl gap-4">
          <div className="relative mx-auto h-[250px] w-full max-w-[500px] overflow-hidden">
            <div
              className="pointer-events-none absolute inset-x-0 top-[15px] bottom-[15px] overflow-hidden break-words font-bold text-[#D2DAE3] text-lg leading-7 tracking-[4px] [font-family:'Courier_New',monospace] after:absolute after:inset-0 after:bg-linear-to-r after:from-background after:via-transparent after:to-background"
              ref={matrixRef}
            />
            <Image
              alt="Illustration: Shield"
              className="relative z-10 mx-auto mt-9 h-[175px] w-[196px] object-contain opacity-95 transition-transform group-enabled:group-hover:scale-[1.03]"
              height={250}
              src="https://www.jcpw.dev/codepen/img/privacy-shield.svg"
              width={280}
            />
          </div>
          <figcaption className="grid gap-2">
            <span className="flex items-center justify-center gap-2 font-medium">
              <LockKeyholeIcon className="size-4 text-muted-foreground" />
              File locked
            </span>
            <span className="text-muted-foreground text-sm">
              {isSubmitted
                ? "Payment proof submitted. Download unlocks after writer verification."
                : "Provide payment proof to unlock the completed file."}
            </span>
          </figcaption>
        </figure>
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Submit payment proof</DialogTitle>
          <DialogDescription>
            Upload one image proof for this completed assessment.
          </DialogDescription>
        </DialogHeader>
        <Form className="contents" onSubmit={handleSubmit(submit)}>
          <DialogPanel className="grid gap-4">
            <Field>
              <FieldLabel>Proof file</FieldLabel>
              <AssessmentFileDropzone
                accept={PAYMENT_PROOF_ACCEPT}
                error={errors.files?.message}
                maxFiles={1}
                maxSize={PAYMENT_PROOF_MAX_SIZE}
                onFilesChange={handleFilesChange}
              />
              {errors.root?.message ? (
                <FieldError>{errors.root.message}</FieldError>
              ) : null}
            </Field>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button loading={isSubmitting} type="submit">
              <UploadIcon aria-hidden="true" className="-ms-1 opacity-60" />
              Submit proof
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
