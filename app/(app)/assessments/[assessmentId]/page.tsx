import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  HandshakeIcon,
  LockIcon,
  UploadIcon,
} from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireSession } from "@/lib/auth/session";
import { getAssessmentMessages } from "@/lib/server/assessment-chat";
import { getAssessmentDetail } from "@/lib/server/assessments";

import { AssessmentChatPanel } from "./_components/assessment-chat-panel";
import {
  completeAssessmentAction,
  reportAssessmentAction,
  requestCloseAction,
  resolveReportAction,
  submitPaymentProofAction,
  verifyPaymentAction,
} from "../actions";
import { CompletedWorkUploadForm } from "./_components/completed-work-upload-form";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PageProps = {
  params: Promise<{
    assessmentId: string;
  }>;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en", {
    currency,
    style: "currency",
  }).format(cents / 100);
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isChatOpen(status: string) {
  return [
    "in_progress",
    "close_requested",
    "completed_pending_payment",
    "payment_submitted",
    "payment_verified",
  ].includes(status);
}

export default async function AssessmentDetailPage({ params }: PageProps) {
  const session = await requireSession("/assessments");
  const { assessmentId } = await params;
  const detail = await getAssessmentDetail(session.user, assessmentId);

  if (!detail) {
    notFound();
  }

  const { assessment, closeRequests, files, reports } = detail;
  const messages = await getAssessmentMessages(assessment.id);
  const role = session.user.role ?? "user";
  const isOwner = assessment.userId === session.user.id;
  const isWriter = assessment.writerId === session.user.id;
  const isAdmin = role === "admin";
  const canComplete =
    (isWriter || isAdmin) &&
    ["in_progress", "close_requested"].includes(assessment.status);
  const canSubmitPayment =
    (isOwner || isAdmin) && assessment.status === "completed_pending_payment";
  const canVerifyPayment =
    (isWriter || isAdmin) && assessment.status === "payment_submitted";
  const canClose =
    (isOwner || isWriter || isAdmin) &&
    ["in_progress", "close_requested"].includes(assessment.status);
  const canReport = isOwner || isWriter || isAdmin;

  return (
    <main className="grid gap-4 p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid gap-4">
          <Frame>
            <FrameHeader className="p-2">
              <FrameTitle className="truncate text-lg font-semibold">
                {assessment.topic}
              </FrameTitle>
              <FrameDescription className="text-muted-foreground text-sm">
                {assessment.title}
              </FrameDescription>
            </FrameHeader>
            <FramePanel className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <div className="text-muted-foreground text-sm">Price</div>
                  <div className="font-medium">
                    {formatMoney(assessment.priceCents, assessment.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm">Deadline</div>
                  <div className="font-medium">
                    {formatDate(assessment.deadlineAt)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm">Writer</div>
                  <div className="font-medium">
                    {assessment.writer?.name ?? "Unclaimed"}
                  </div>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7">
                {assessment.description}
              </p>
            </FramePanel>
          </Frame>

          <Frame>
            <Table variant="card">
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.length === 0 ? (
                  <TableRow className="text-muted-foreground text-sm">
                    <TableCell colSpan={3} className="text-center">
                      No files.
                    </TableCell>
                  </TableRow>
                ) : (
                  files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        {file.originalName}
                      </TableCell>
                      <TableCell>
                        {Math.ceil(file.sizeBytes / 1024)}KB
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          render={
                            <a
                              href={`/api/assessments/${assessment.id}/files/${file.id}`}
                            />
                          }
                          size="icon-sm"
                          variant="secondary"
                        >
                          <DownloadIcon />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Frame>

          {canComplete ? (
            <CompletedWorkUploadForm
              action={completeAssessmentAction}
              assessmentId={assessment.id}
            />
          ) : null}
        </div>

        <div className="grid content-start gap-4">
          <Frame>
            <FrameHeader className="p-2">
              <FrameTitle>Conversation</FrameTitle>
            </FrameHeader>
            <FramePanel className="p-0">
              <AssessmentChatPanel
                assessmentId={assessment.id}
                canPost={isChatOpen(assessment.status)}
                currentUserId={session.user.id}
                initialMessages={messages}
                roomId={assessment.roomId}
              />
            </FramePanel>
          </Frame>
          {/* {canSubmitPayment ? (
            <form
              action={submitPaymentProofAction}
              encType="multipart/form-data"
            >
              <input name="assessmentId" type="hidden" value={assessment.id} />
              <FramePanel className="grid gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <UploadIcon className="size-4 text-muted-foreground" />
                  Submit payment proof
                </div>
                <Field>
                  <FieldLabel>Proof file</FieldLabel>
                  <Input
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    name="file"
                    nativeInput
                    required
                    type="file"
                  />
                </Field>
                <Button type="submit">Submit proof</Button>
              </FramePanel>
            </form>
          ) : null}

          {canVerifyPayment ? (
            <form action={verifyPaymentAction}>
              <input name="assessmentId" type="hidden" value={assessment.id} />
              <FramePanel className="grid gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2Icon className="size-4 text-muted-foreground" />
                  Payment verification
                </div>
                <Button type="submit">
                  Verify payment and unlock download
                </Button>
              </FramePanel>
            </form>
          ) : null}

          {canClose ? (
            <form action={requestCloseAction}>
              <input name="assessmentId" type="hidden" value={assessment.id} />
              <FramePanel className="grid gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <HandshakeIcon className="size-4 text-muted-foreground" />
                  Mutual close
                </div>
                <Textarea
                  name="reason"
                  placeholder="Why should this assessment be closed?"
                  required
                />
                <Button type="submit" variant="outline">
                  Request or accept close
                </Button>
              </FramePanel>
            </form>
          ) : null}

          {canReport ? (
            <form action={reportAssessmentAction}>
              <input name="assessmentId" type="hidden" value={assessment.id} />
              <FramePanel className="grid gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangleIcon className="size-4 text-muted-foreground" />
                  Report issue
                </div>
                <Textarea
                  name="reason"
                  placeholder="Describe the issue for admin review."
                  required
                />
                <Button type="submit" variant="destructive-outline">
                  Report
                </Button>
              </FramePanel>
            </form>
          ) : null}

          <FramePanel className="grid gap-3">
            <div className="text-sm font-semibold">Close requests</div>
            {closeRequests.length === 0 ? (
              <div className="text-muted-foreground text-sm">None.</div>
            ) : (
              closeRequests.map((request) => (
                <div
                  className="rounded-lg border bg-background p-3 text-sm"
                  key={request.id}
                >
                  <div className="font-medium">{request.status}</div>
                  <div className="text-muted-foreground">{request.reason}</div>
                </div>
              ))
            )}
          </FramePanel>

          <FramePanel className="grid gap-3">
            <div className="text-sm font-semibold">Reports</div>
            {reports.length === 0 ? (
              <div className="text-muted-foreground text-sm">None.</div>
            ) : (
              reports.map((report) => (
                <div
                  className="grid gap-2 rounded-lg border bg-background p-3 text-sm"
                  key={report.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{report.status}</span>
                    {isAdmin && report.status === "open" ? (
                      <form action={resolveReportAction}>
                        <input
                          name="assessmentId"
                          type="hidden"
                          value={assessment.id}
                        />
                        <input
                          name="reportId"
                          type="hidden"
                          value={report.id}
                        />
                        <Button size="sm" type="submit" variant="outline">
                          Resolve
                        </Button>
                      </form>
                    ) : null}
                  </div>
                  <div className="text-muted-foreground">{report.reason}</div>
                </div>
              ))
            )}
          </FramePanel> */}
        </div>
      </div>
    </main>
  );
}
