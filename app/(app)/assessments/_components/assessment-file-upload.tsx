"use client";

import {
  AlertCircleIcon,
  DownloadIcon,
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileUpIcon,
  HeadphonesIcon,
  ImageIcon,
  Trash2Icon,
  UploadCloudIcon,
  UploadIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { useEffect } from "react";

import {
  formatBytes,
  type UploadFileItem,
  useFileUpload,
} from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AssessmentFileUploadProps = {
  accept?: string;
  error?: string;
  maxFiles?: number;
  maxSize: number;
  onFilesChange: (files: File[]) => void;
};

function getFileMeta(file: UploadFileItem) {
  return {
    name: file.file.name,
    size: file.file.size,
    type: file.file.type,
  };
}

function getFileIcon(file: UploadFileItem) {
  const { name, type } = getFileMeta(file);
  const fileName = name.toLowerCase();
  const fileType = type.toLowerCase();

  if (
    fileType.includes("pdf") ||
    fileName.endsWith(".pdf") ||
    fileType.includes("word") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  ) {
    return <FileTextIcon className="size-4 opacity-60" />;
  }

  if (
    fileType.includes("zip") ||
    fileType.includes("archive") ||
    fileName.endsWith(".zip") ||
    fileName.endsWith(".rar")
  ) {
    return <FileArchiveIcon className="size-4 opacity-60" />;
  }

  if (
    fileType.includes("excel") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx")
  ) {
    return <FileSpreadsheetIcon className="size-4 opacity-60" />;
  }

  if (fileType.includes("video/")) {
    return <VideoIcon className="size-4 opacity-60" />;
  }

  if (fileType.includes("audio/")) {
    return <HeadphonesIcon className="size-4 opacity-60" />;
  }

  if (fileType.startsWith("image/")) {
    return <ImageIcon className="size-4 opacity-60" />;
  }

  return <FileIcon className="size-4 opacity-60" />;
}

function useAssessmentUpload({
  accept,
  maxFiles = 1,
  maxSize,
  onFilesChange,
}: AssessmentFileUploadProps) {
  const [
    { errors, files, isDragging },
    {
      clearFiles,
      getInputProps,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
    },
  ] = useFileUpload({
    accept,
    maxFiles,
    maxSize,
    multiple: maxFiles > 1,
  });

  useEffect(() => {
    onFilesChange(
      files.flatMap((item) => (item.file instanceof File ? [item.file] : [])),
    );
  }, [files, onFilesChange]);

  return {
    clearFiles,
    errors,
    files,
    getInputProps,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    isDragging,
    openFileDialog,
    removeFile,
  };
}

export function AssessmentFileDropzone(props: AssessmentFileUploadProps) {
  const maxFiles = props.maxFiles ?? 1;
  const {
    clearFiles,
    errors,
    files,
    getInputProps,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    isDragging,
    openFileDialog,
    removeFile,
  } = useAssessmentUpload(props);
  const error = props.error ?? errors[0];

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-input border-dashed p-4 transition-colors hover:bg-accent/50 has-disabled:pointer-events-none has-[input:focus]:border-ring has-disabled:opacity-50 has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
        data-dragging={isDragging || undefined}
        onClick={openFileDialog}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="button"
        tabIndex={-1}
      >
        <input
          {...getInputProps({ "aria-label": "Upload files" })}
          className="sr-only"
        />

        <div className="flex flex-col items-center justify-center text-center">
          <div
            aria-hidden="true"
            className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
          >
            <FileUpIcon className="size-4 opacity-60" />
          </div>
          <p className="mb-1.5 font-medium text-sm">Upload files</p>
          <p className="mb-2 text-muted-foreground text-xs">
            Drag & drop or click to browse
          </p>
          <div className="flex flex-wrap justify-center gap-1 text-muted-foreground/70 text-xs">
            <span>All files</span>
            <span>∙</span>
            <span>Max {maxFiles} files</span>
            <span>∙</span>
            <span>Up to {formatBytes(props.maxSize)}</span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-1 text-destructive text-xs" role="alert">
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {files.length > 0 ? (
        <div className="space-y-2">
          {files.map((file) => {
            const meta = getFileMeta(file);

            return (
              <div
                className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2 pe-3"
                key={file.id}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded border">
                    {getFileIcon(file)}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate font-medium text-[13px]">
                      {meta.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatBytes(meta.size)}
                    </p>
                  </div>
                </div>

                <Button
                  aria-label={`Remove ${meta.name}`}
                  className="-me-2 size-8 text-muted-foreground/80 hover:bg-transparent hover:text-foreground"
                  onClick={() => removeFile(file.id)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </Button>
              </div>
            );
          })}

          {files.length > 1 ? (
            <Button onClick={clearFiles} size="sm" type="button" variant="outline">
              Remove all files
            </Button>
          ) : null}
        </div>
      ) : null}

      <p
        aria-live="polite"
        className="mt-2 text-center text-muted-foreground text-xs"
        role="region"
      >
        Multiple files uploader w/ list ∙{" "}
        <a
          className="underline hover:text-foreground"
          href="https://github.com/cosscom/coss/blob/main/apps/origin/docs/use-file-upload.md"
        >
          API
        </a>
      </p>
    </div>
  );
}

export function AssessmentFileTableUpload(props: AssessmentFileUploadProps) {
  const maxFiles = props.maxFiles ?? 1;
  const {
    clearFiles,
    errors,
    files,
    getInputProps,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    isDragging,
    openFileDialog,
    removeFile,
  } = useAssessmentUpload(props);
  const error = props.error ?? errors[0];

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex min-h-56 flex-col items-center rounded-xl border border-input border-dashed p-4 transition-colors not-data-[files]:justify-center has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[files]:hidden data-[dragging=true]:bg-accent/50"
        data-dragging={isDragging || undefined}
        data-files={files.length > 0 || undefined}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          {...getInputProps({ "aria-label": "Upload files" })}
          className="sr-only"
        />
        <div className="flex flex-col items-center justify-center text-center">
          <div
            aria-hidden="true"
            className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
          >
            <FileIcon className="size-4 opacity-60" />
          </div>
          <p className="mb-1.5 font-medium text-sm">Upload files</p>
          <p className="text-muted-foreground text-xs">
            Max {maxFiles} files ∙ Up to {formatBytes(props.maxSize)}
          </p>
          <Button className="mt-4" onClick={openFileDialog} type="button" variant="outline">
            <UploadIcon aria-hidden="true" className="-ms-1 opacity-60" />
            Select files
          </Button>
        </div>
      </div>

      {files.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-sm">Files ({files.length})</h3>
            <div className="flex gap-2">
              <Button onClick={openFileDialog} size="sm" type="button" variant="outline">
                <UploadCloudIcon
                  aria-hidden="true"
                  className="-ms-0.5 size-3.5 opacity-60"
                />
                Add files
              </Button>
              <Button onClick={clearFiles} size="sm" type="button" variant="outline">
                <Trash2Icon
                  aria-hidden="true"
                  className="-ms-0.5 size-3.5 opacity-60"
                />
                Remove all
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-md border bg-background">
            <Table>
              <TableHeader className="text-xs">
                <TableRow className="bg-muted/50">
                  <TableHead className="h-9 py-2">Name</TableHead>
                  <TableHead className="h-9 py-2">Type</TableHead>
                  <TableHead className="h-9 py-2">Size</TableHead>
                  <TableHead className="h-9 w-0 py-2 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[13px]">
                {files.map((file) => {
                  const meta = getFileMeta(file);

                  return (
                    <TableRow key={file.id}>
                      <TableCell className="max-w-48 py-2 font-medium">
                        <span className="flex items-center gap-2">
                          <span className="shrink-0">{getFileIcon(file)}</span>
                          <span className="truncate">{meta.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-muted-foreground">
                        {meta.type.split("/")[1]?.toUpperCase() || "UNKNOWN"}
                      </TableCell>
                      <TableCell className="py-2 text-muted-foreground">
                        {formatBytes(meta.size)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-2 text-right">
                        <Button
                          aria-label={`Download ${meta.name}`}
                          className="size-8 text-muted-foreground/80 hover:bg-transparent hover:text-foreground"
                          onClick={() => window.open(file.preview, "_blank")}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <DownloadIcon className="size-4" />
                        </Button>
                        <Button
                          aria-label={`Remove ${meta.name}`}
                          className="size-8 text-muted-foreground/80 hover:bg-transparent hover:text-foreground"
                          onClick={() => removeFile(file.id)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}

      {error ? (
        <div className="flex items-center gap-1 text-destructive text-xs" role="alert">
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <p
        aria-live="polite"
        className="mt-2 text-center text-muted-foreground text-xs"
        role="region"
      >
        Multiple files uploader w/ table ∙{" "}
        <a
          className="underline hover:text-foreground"
          href="https://github.com/cosscom/coss/blob/main/apps/origin/docs/use-file-upload.md"
        >
          API
        </a>
      </p>
    </div>
  );
}
