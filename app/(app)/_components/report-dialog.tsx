"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";

const reportCategories = [
  { label: "Issue", value: "issue" },
  { label: "Problem", value: "problem" },
  { label: "Complaint", value: "complaint" },
  { label: "Suggestion", value: "suggestion" },
  { label: "Improvement", value: "improvement" },
] as const;

type ReportCategory = (typeof reportCategories)[number]["value"];

type ReportDialogProps = {
  assessmentId?: string;
  description?: string;
  submitLabel?: string;
  title?: string;
  trigger: React.ReactElement;
};

export function ReportDialog({
  assessmentId,
  description = "Share the issue, complaint, suggestion, or improvement request with the admin team.",
  submitLabel = "Submit report",
  title = "Report an issue",
  trigger,
}: ReportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState<ReportCategory>("issue");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = reason.trim();
    if (!message) {
      setError("Tell us what happened before submitting.");
      return;
    }

    setError(undefined);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reports", {
        body: JSON.stringify({
          assessmentId,
          category,
          reason: message,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        ok?: boolean;
      } | null;

      if (!response.ok || !payload?.ok) {
        const message =
          payload?.error ?? "Unable to submit the report. Please try again.";
        setError(message);
        toastManager.add({
          description: message,
          title: "Report not submitted",
          type: "error",
        });
        return;
      }

      setOpen(false);
      setReason("");
      setCategory("issue");
      toastManager.add({
        description: "The admin team can now review it.",
        title: "Report submitted",
        type: "success",
      });
      router.refresh();
    } catch {
      const message = "Unable to submit the report. Please try again.";
      setError(message);
      toastManager.add({
        description: message,
        title: "Report not submitted",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="contents" onSubmit={submitReport}>
          <DialogPanel>
            <FieldGroup>
              <Field>
                <FieldLabel>Category</FieldLabel>
                <Select
                  items={reportCategories}
                  name="category"
                  onValueChange={(value) =>
                    setCategory((value ?? "issue") as ReportCategory)
                  }
                  value={category}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {reportCategories.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Details</FieldLabel>
                <Textarea
                  maxLength={4000}
                  minLength={8}
                  name="reason"
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Describe what happened or what should be improved."
                  required
                  rows={6}
                  value={reason}
                />
              </Field>
              {error ? (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              ) : null}
            </FieldGroup>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button loading={isSubmitting} type="submit">
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
