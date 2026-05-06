"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, FilePlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AssessmentFileDropzone } from "./assessment-file-upload";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

const MAX_FILES = 3;
const SOURCE_MAX_SIZE = 30 * 1024 * 1024;

function isFile(value: unknown): value is File {
  return value instanceof File && value.size > 0;
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const newAssessmentSchema = z.object({
  deadlineAt: z.string().optional(),
  description: z.string().trim().min(1, "Description is required.").max(4000),
  files: z
    .array(
      z
        .custom<File>(isFile, "Source file is required.")
        .refine((file) => file.size <= SOURCE_MAX_SIZE, "File is too large."),
    )
    .min(1, "Source file is required.")
    .max(MAX_FILES, `Upload up to ${MAX_FILES} files.`),
  price: z
    .string()
    .trim()
    .min(1, "Price is required.")
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, {
      message: "Price must be zero or higher.",
    }),
  title: z.string().trim().min(1, "Country is required.").max(160),
  topic: z.string().trim().min(1, "Topic is required.").max(120),
});

type NewAssessmentFormValues = z.infer<typeof newAssessmentSchema>;

export default function NewAssessmentDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<Date | undefined>();
  const form = useForm<NewAssessmentFormValues>({
    defaultValues: {
      deadlineAt: "",
      description: "",
      files: [],
      price: "",
      title: "",
      topic: "",
    },
    resolver: zodResolver(newAssessmentSchema),
  });
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
  } = form;

  const handleFilesChange = useCallback(
    (files: File[]) => {
      setValue("files", files, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      });
    },
    [form.formState.isSubmitted, setValue],
  );

  function handleDeadlineSelect(date: Date | undefined) {
    setSelectedDeadline(date);
    setValue("deadlineAt", date ? formatDateValue(date) : "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function submit(values: NewAssessmentFormValues) {
    if (values.files.length === 0) {
      setError("files", { message: "Source file is required." });
      return;
    }

    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("topic", values.topic);
    formData.set("price", values.price);
    formData.set("description", values.description);
    if (values.deadlineAt) {
      formData.set("deadlineAt", values.deadlineAt);
    }
    for (const file of values.files) {
      formData.append("file", file);
    }

    const response = await fetch("/api/assessments/create", {
      body: formData,
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as {
      assessmentId?: string;
      error?: string;
      redirect?: string;
    } | null;

    if (!response.ok || !payload?.assessmentId) {
      setError("root", {
        message: payload?.error ?? "Unable to create assessment.",
      });
      return;
    }

    setOpen(false);
    reset();
    setSelectedDeadline(undefined);
    router.push(payload.redirect ?? `/assessments/${payload.assessmentId}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <FilePlusIcon className="size-4" /> New assessment
          </Button>
        }
      />
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Create new assessment</DialogTitle>
          <DialogDescription>
            Upload the source file and assessment details.
          </DialogDescription>
        </DialogHeader>
        <Form className="contents" onSubmit={handleSubmit(submit)}>
          <DialogPanel className="grid gap-5">
            <Fieldset className="grid gap-4">
              <FieldsetLegend>Assessment details</FieldsetLegend>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="assessment-title">Country</FieldLabel>
                  <Input
                    id="assessment-title"
                    nativeInput
                    {...register("title")}
                  />
                  {errors.title ? (
                    <FieldError>{errors.title.message}</FieldError>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor="assessment-topic">Topic</FieldLabel>
                  <Input
                    id="assessment-topic"
                    nativeInput
                    {...register("topic")}
                  />
                  {errors.topic ? (
                    <FieldError>{errors.topic.message}</FieldError>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor="assessment-price">Price</FieldLabel>
                  <Input
                    id="assessment-price"
                    min="0"
                    nativeInput
                    step="0.01"
                    type="number"
                    {...register("price")}
                  />
                  {errors.price ? (
                    <FieldError>{errors.price.message}</FieldError>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel>Deadline</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          className="w-full justify-start"
                          type="button"
                          variant="outline"
                        />
                      }
                    >
                      <CalendarIcon aria-hidden="true" />
                      {selectedDeadline
                        ? format(selectedDeadline, "PPP")
                        : "Pick a date"}
                    </PopoverTrigger>
                    <PopoverPopup>
                      <Calendar
                        defaultMonth={selectedDeadline}
                        mode="single"
                        onSelect={handleDeadlineSelect}
                        selected={selectedDeadline}
                      />
                    </PopoverPopup>
                  </Popover>
                </Field>
              </FieldGroup>
            </Fieldset>

            <Field>
              <FieldLabel htmlFor="assessment-description">
                Description
              </FieldLabel>
              <Textarea
                id="assessment-description"
                {...register("description")}
              />
              <FieldDescription>
                Include scope, requirements, and delivery notes.
              </FieldDescription>
              {errors.description ? (
                <FieldError>{errors.description.message}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel>Source file</FieldLabel>
              <AssessmentFileDropzone
                error={errors.files?.message}
                maxFiles={MAX_FILES}
                maxSize={SOURCE_MAX_SIZE}
                onFilesChange={handleFilesChange}
              />
            </Field>

            {errors.root?.message ? (
              <p className="text-destructive-foreground text-xs" role="alert">
                {errors.root.message}
              </p>
            ) : null}
          </DialogPanel>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button loading={isSubmitting} type="submit">
              Upload assessment
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
