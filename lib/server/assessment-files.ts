import "server-only";

import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

import { serverEnv } from "@/lib/server/env";
import type { AssessmentFileKind } from "@/lib/db/schema";

export type ValidatedUpload = {
  buffer: Buffer;
  extension: string;
  mimeType: string;
  originalName: string;
  scanMessage: string;
  sha256: string;
  sizeBytes: number;
};

type UploadPurpose = AssessmentFileKind;

const pdfDangerPatterns = [
  /\/JavaScript\b/i,
  /\/JS\b/i,
  /\/Launch\b/i,
  /\/EmbeddedFile\b/i,
  /\/OpenAction\b/i,
  /\/AA\b/i,
  /\/RichMedia\b/i,
  /\/XFA\b/i,
  /\/SubmitForm\b/i,
  /\/ImportData\b/i,
];

const docxDangerPatterns = [
  /vbaProject\.bin/i,
  /macrosheets/i,
  /activeX/i,
  /oleObject/i,
  /embeddings\//i,
  /externalLink/i,
  /TargetMode="External"/i,
  /\.exe/i,
  /\.js/i,
  /\.vbs/i,
  /\.ps1/i,
  /\.\.\//i,
  /\/\.\./i,
];

const imageDangerPatterns = [
  /<script\b/i,
  /<svg\b/i,
  /<html\b/i,
  /javascript:/i,
];

const zipDangerPatterns = [
  /(^|[\\/])\.\.([\\/]|$)/,
  /[A-Za-z]:[\\/]/,
  /\0/,
];

function getFileName(file: File) {
  return file.name || "upload";
}

function getExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return extension.startsWith(".") ? extension.slice(1) : extension;
}

function sanitizeBaseName(fileName: string) {
  const base = path.basename(fileName, path.extname(fileName));
  return (
    base
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "file"
  );
}

function getAllowedExtensions(purpose: UploadPurpose) {
  if (purpose === "source" || purpose === "completed") {
    return ["pdf", "docx", "txt", "zip"];
  }

  return ["pdf", "png", "jpg", "jpeg", "webp"];
}

function getMaxUploadBytes(purpose: UploadPurpose) {
  if (purpose === "completed") {
    return serverEnv.maxCompletedUploadBytes;
  }

  if (purpose === "payment_proof") {
    return serverEnv.maxPaymentProofUploadBytes;
  }

  return serverEnv.maxAssessmentUploadBytes;
}

function detectMimeType(buffer: Buffer, extension: string) {
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }

  if (buffer[0] === 0x50 && buffer[1] === 0x4b && extension === "zip") {
    return "application/zip";
  }

  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  if (extension === "txt") {
    return "text/plain";
  }

  return "application/octet-stream";
}

function assertPdfIsSafe(buffer: Buffer) {
  const body = buffer.toString("latin1");
  for (const pattern of pdfDangerPatterns) {
    if (pattern.test(body)) {
      throw new Error("PDF rejected because it contains active content.");
    }
  }
}

function assertDocxIsSafe(buffer: Buffer) {
  const body = buffer.toString("latin1");
  if (!body.includes("[Content_Types].xml") || !body.includes("word/")) {
    throw new Error("DOCX rejected because the document package is invalid.");
  }

  for (const pattern of docxDangerPatterns) {
    if (pattern.test(body)) {
      throw new Error("DOCX rejected because it contains embedded active content.");
    }
  }
}

function assertTxtIsSafe(buffer: Buffer, mimeType: string) {
  if (mimeType !== "text/plain") {
    throw new Error("TXT file content is invalid.");
  }

  if (buffer.includes(0)) {
    throw new Error("TXT rejected because it contains binary content.");
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const text = decoder.decode(buffer);
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
    throw new Error("TXT rejected because it contains control characters.");
  }
}

function assertImageIsSafe(buffer: Buffer, extension: string, mimeType: string) {
  const allowed = new Map([
    ["png", "image/png"],
    ["jpg", "image/jpeg"],
    ["jpeg", "image/jpeg"],
    ["webp", "image/webp"],
  ]);

  if (allowed.get(extension) !== mimeType) {
    throw new Error("Payment proof image type does not match the file content.");
  }

  const text = buffer
    .subarray(0, Math.min(buffer.length, 64 * 1024))
    .toString("latin1");
  if (imageDangerPatterns.some((pattern) => pattern.test(text))) {
    throw new Error("Payment proof image rejected because it contains active content.");
  }
}

function assertZipIsSafe(buffer: Buffer, mimeType: string) {
  if (mimeType !== "application/zip") {
    throw new Error("ZIP file content is invalid.");
  }

  const body = buffer.toString("latin1");
  if (zipDangerPatterns.some((pattern) => pattern.test(body))) {
    throw new Error("ZIP rejected because it contains unsafe paths.");
  }
}

export async function validateAssessmentUpload(
  file: File,
  purpose: UploadPurpose,
): Promise<ValidatedUpload> {
  const originalName = getFileName(file);
  const extension = getExtension(originalName);
  const allowedExtensions = getAllowedExtensions(purpose);

  if (!allowedExtensions.includes(extension)) {
    throw new Error(
      `Unsupported file type. Allowed: ${allowedExtensions.join(", ")}.`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const maxBytes = getMaxUploadBytes(purpose);
  if (buffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }

  if (buffer.length > maxBytes) {
    throw new Error(
      `Uploaded file is too large. Maximum allowed size is ${Math.floor(
        maxBytes / 1024 / 1024,
      )}MB.`,
    );
  }

  const mimeType = detectMimeType(buffer, extension);

  if (extension === "pdf") {
    if (mimeType !== "application/pdf") {
      throw new Error("PDF file content is invalid.");
    }
    assertPdfIsSafe(buffer);
  } else if (extension === "docx") {
    if (
      mimeType !==
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      throw new Error("DOCX file content is invalid.");
    }
    assertDocxIsSafe(buffer);
  } else if (extension === "txt") {
    assertTxtIsSafe(buffer, mimeType);
  } else if (extension === "zip") {
    assertZipIsSafe(buffer, mimeType);
  } else {
    assertImageIsSafe(buffer, extension, mimeType);
  }

  return {
    buffer,
    extension,
    mimeType,
    originalName,
    scanMessage: "Clean",
    sha256: createHash("sha256").update(buffer).digest("hex"),
    sizeBytes: buffer.length,
  };
}

export async function writePrivateAssessmentFile(
  assessmentId: string,
  kind: UploadPurpose,
  upload: ValidatedUpload,
) {
  const safeName = sanitizeBaseName(upload.originalName);
  const fileName = `${Date.now()}-${randomUUID()}-${safeName}.${upload.extension}`;
  const storageKey = path.posix.join("assessments", assessmentId, kind, fileName);
  const fullPath = resolveStorageKey(storageKey);

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, upload.buffer, { flag: "wx" });

  return storageKey;
}

function getStorageRoot() {
  if (path.isAbsolute(serverEnv.storageDir)) {
    return path.resolve(serverEnv.storageDir);
  }

  return path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    serverEnv.storageDir,
  );
}

export function resolveStorageKey(storageKey: string) {
  const normalized = storageKey.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.includes("../")) {
    throw new Error("Invalid storage key.");
  }

  const storageRoot = getStorageRoot();
  const fullPath = path.resolve(storageRoot, normalized);
  if (!fullPath.startsWith(storageRoot + path.sep)) {
    throw new Error("Invalid storage path.");
  }

  return fullPath;
}

export async function readPrivateAssessmentFile(storageKey: string) {
  return readFile(resolveStorageKey(storageKey));
}

export async function removePrivateAssessmentFile(storageKey: string) {
  await rm(resolveStorageKey(storageKey), { force: true });
}
