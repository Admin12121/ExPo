import { DownloadIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { requireSession } from "@/lib/auth/session";
import { getAssessmentMessages } from "@/lib/server/assessment-chat";
import {
  getAssessmentDetail,
  type AssessmentDetail,
} from "@/lib/server/assessments";

import { AssessmentChatPanel } from "./_components/assessment-chat-panel";
import { CompletedWorkUploadForm } from "./_components/completed-work-upload-form";
import { PaymentProofDialog } from "./_components/payment-proof-dialog";
import { PaymentVerificationDialog } from "./_components/payment-verification-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PageProps = {
  params: Promise<{
    assessmentId: string;
  }>;
};

type AssessmentFileItem = AssessmentDetail["files"][number];

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

function formatFileSize(bytes: number) {
  return `${Math.ceil(bytes / 1024)}KB`;
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

function AssessmentFilesTable({
  assessmentId,
  emptyLabel,
  files,
}: {
  assessmentId: string;
  emptyLabel: string;
  files: AssessmentFileItem[];
}) {
  return (
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
              <TableCell className="text-center" colSpan={3}>
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : (
            files.map((file) => (
              <TableRow key={file.id}>
                <TableCell className="font-medium">
                  {file.originalName}
                </TableCell>
                <TableCell>{formatFileSize(file.sizeBytes)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    render={
                      <a href={`/api/assessments/${assessmentId}/files/${file.id}`} />
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
  );
}

export default async function AssessmentDetailPage({ params }: PageProps) {
  const session = await requireSession("/assessments");
  const { assessmentId } = await params;
  const detail = await getAssessmentDetail(session.user, assessmentId);

  if (!detail) {
    notFound();
  }

  const { assessment, files } = detail;
  const sourceFiles = files.filter((file) => file.kind === "source");
  const completedFiles = files.filter((file) => file.kind === "completed");
  const paymentProofFiles = files.filter((file) => file.kind === "payment_proof");
  const completedUploadFiles = completedFiles.map((file) => ({
    id: file.id,
    name: file.originalName,
    size: file.sizeBytes,
    type: file.mimeType,
    url: `/api/assessments/${assessment.id}/files/${file.id}`,
  }));
  const paymentProofPreviewFiles = paymentProofFiles
    .filter((file) => file.mimeType.startsWith("image/"))
    .map((file) => ({
      id: file.id,
      name: file.originalName,
      type: file.mimeType,
      url: `/api/assessments/${assessment.id}/files/${file.id}?preview=1`,
    }));
  const messages = await getAssessmentMessages(assessment.id);
  const role = session.user.role ?? "user";
  const isOwner = assessment.userId === session.user.id;
  const isWriter = assessment.writerId === session.user.id;
  const isAdmin = role === "admin";
  const canManageCompletedFiles =
    (isWriter || isAdmin) &&
    [
      "in_progress",
      "close_requested",
      "completed_pending_payment",
      "payment_submitted",
    ].includes(assessment.status);
  const canViewCompletedUploader =
    isWriter || isAdmin
      ? canManageCompletedFiles || completedUploadFiles.length > 0
      : false;
  const canSubmitPaymentProof =
    isOwner &&
    completedFiles.length > 0 &&
    ["completed_pending_payment", "payment_submitted"].includes(
      assessment.status,
    );
  const canDownloadCompletedFiles =
    isOwner &&
    completedFiles.length > 0 &&
    ["payment_verified", "downloaded", "archived"].includes(assessment.status);
  const canVerifyPayment =
    (isWriter || isAdmin) && assessment.status === "payment_submitted";

  return (
    <main className="grid gap-4 p-4">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid content-start gap-4">
          <Frame>
            <FrameHeader className="relative p-2 pr-12">
              <div className="min-w-0">
                <FrameTitle className="truncate text-lg font-semibold">
                  {assessment.topic}
                </FrameTitle>
                <FrameDescription className="text-muted-foreground text-sm">
                  {assessment.title}
                </FrameDescription>
              </div>
              {canVerifyPayment ? (
                <PaymentVerificationDialog
                  assessmentId={assessment.id}
                  paymentProofFiles={paymentProofPreviewFiles}
                />
              ) : null}
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

          <AssessmentFilesTable
            assessmentId={assessment.id}
            emptyLabel="No source files."
            files={sourceFiles}
          />

          {canViewCompletedUploader ? (
            <CompletedWorkUploadForm
              assessmentId={assessment.id}
              canManageFiles={canManageCompletedFiles}
              initialFiles={completedUploadFiles}
              key={completedUploadFiles.map((file) => file.id).join(":")}
            />
          ) : null}

          {canSubmitPaymentProof ? (
            <PaymentProofDialog
              assessmentId={assessment.id}
              status={assessment.status}
            />
          ) : null}

          {canDownloadCompletedFiles ? (
            <AssessmentFilesTable
              assessmentId={assessment.id}
              emptyLabel="No completed files."
              files={completedFiles}
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
