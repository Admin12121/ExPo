"use client";

import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FilePlusIcon } from "lucide-react";
import { Form } from "@/components/ui/form";

export default function NewAssessmentDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button>
            <FilePlusIcon className="size-4" /> New assessment
          </Button>
        }
      />
      <DialogPopup>
        <Frame>
          <FrameHeader>
            <FrameTitle>Create new Assessment</FrameTitle>
            <FrameDescription>
              Upload your assessment and details.
            </FrameDescription>
          </FrameHeader>
          <form
            action="/api/assessments/create"
            method="post"
            encType="multipart/form-data"
          >
            <Form className="contents">
              <FramePanel className="grid gap-2">
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel>Title</FieldLabel>
                    <Input name="title" required />
                  </Field>
                  <Field>
                    <FieldLabel>Topic</FieldLabel>
                    <Input name="topic" required />
                  </Field>
                  <Field>
                    <FieldLabel>Price</FieldLabel>
                    <Input
                      min="0"
                      name="price"
                      nativeInput
                      required
                      step="0.01"
                      type="number"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Deadline</FieldLabel>
                    <Input name="deadlineAt" nativeInput type="date" />
                  </Field>
                </FieldGroup>
                <Field>
                  <FieldLabel>Description</FieldLabel>
                  <Textarea name="description" required />
                </Field>
                <Field>
                  <FieldLabel>Source file</FieldLabel>
                  <Input
                    accept=".pdf,.docx,.txt"
                    name="file"
                    nativeInput
                    required
                    type="file"
                  />
                </Field>
              </FramePanel>

              <FrameFooter className="flex items-center justify-end gap-2">
                <DialogClose
                  render={<Button variant="outline">Cancel</Button>}
                />
                <Button type="submit">Upload assessment</Button>
              </FrameFooter>
            </Form>
          </form>
        </Frame>
      </DialogPopup>
    </Dialog>
  );
}
