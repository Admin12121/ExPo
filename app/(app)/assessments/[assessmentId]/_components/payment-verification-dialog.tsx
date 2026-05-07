"use client";

import { CircleDollarSignIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

type PaymentVerificationDialogProps = {
  assessmentId: string;
  paymentProofFiles: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
};

export function PaymentVerificationDialog({
  assessmentId,
  paymentProofFiles,
}: PaymentVerificationDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function verifyPayment() {
    setError(undefined);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/assessments/${assessmentId}/verify-payment`,
        {
          method: "POST",
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        ok?: boolean;
      } | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "Unable to verify payment.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to verify payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            aria-label="Confirm payment"
            className="absolute top-2 right-2"
            size="icon-sm"
            type="button"
            variant="secondary"
          />
        }
      >
        <CircleDollarSignIcon aria-hidden="true" />
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Confirm payment</DialogTitle>
          <DialogDescription>
            Confirm that the submitted payment proof is valid and unlock the
            completed files for the user.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="grid gap-4">
          {paymentProofFiles.length > 0 ? (
            <div className="grid gap-3">
              {paymentProofFiles.map((file) => (
                <figure
                  className="overflow-hidden rounded-lg border border-input bg-background"
                  key={file.id}
                >
                  <div className="relative h-64 bg-muted/20">
                    <Image
                      alt={`Payment proof: ${file.name}`}
                      className="object-contain"
                      fill
                      sizes="(max-width: 640px) 90vw, 448px"
                      src={file.url}
                      unoptimized
                    />
                  </div>
                  <figcaption className="border-t px-3 py-2 text-muted-foreground text-xs">
                    <span className="block truncate">{file.name}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No payment proof image was found for this assessment.
            </p>
          )}
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              This will mark payment as verified and stop further writer file
              changes.
            </p>
          )}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            loading={isSubmitting}
            onClick={() => void verifyPayment()}
            type="button"
          >
            Confirm payment
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
