"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as React from "react";

export type ExistingUploadFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
};

export type UploadFileItem = {
  file: File | ExistingUploadFile;
  id: string;
  preview: string;
};

type UseFileUploadOptions = {
  accept?: string;
  initialFiles?: ExistingUploadFile[];
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
};

type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "accept" | "multiple" | "onChange" | "type"
>;

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function createFileItem(file: File): UploadFileItem {
  return {
    file,
    id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
    preview: URL.createObjectURL(file),
  };
}

function createExistingFileItem(file: ExistingUploadFile): UploadFileItem {
  return {
    file,
    id: file.id,
    preview: file.url,
  };
}

function isExistingFile(file: UploadFileItem["file"]): file is ExistingUploadFile {
  return !(file instanceof File);
}

function acceptsFile(file: File, accept?: string) {
  if (!accept) {
    return true;
  }

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  const acceptedTypes = accept
    .split(",")
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean);

  return acceptedTypes.some((type) => {
    if (type.startsWith(".")) {
      return fileName.endsWith(type);
    }

    if (type.endsWith("/*")) {
      return fileType.startsWith(type.slice(0, -1));
    }

    return fileType === type;
  });
}

export function useFileUpload({
  accept,
  initialFiles = [],
  maxFiles = Number.POSITIVE_INFINITY,
  maxSize = Number.POSITIVE_INFINITY,
  multiple = false,
}: UseFileUploadOptions = {}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<UploadFileItem[]>(
    initialFiles.map(createExistingFileItem),
  );
  const filesRef = useRef(files);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const clearObjectUrls = useCallback((items: UploadFileItem[]) => {
    for (const item of items) {
      if (!isExistingFile(item.file)) {
        URL.revokeObjectURL(item.preview);
      }
    }
  }, []);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => clearObjectUrls(filesRef.current);
  }, [clearObjectUrls]);

  const updateFiles = useCallback(
    (nextFiles: File[]) => {
      setErrors([]);

      if (nextFiles.length === 0) {
        return;
      }

      const validFiles: File[] = [];
      const nextErrors: string[] = [];

      for (const file of nextFiles) {
        if (!acceptsFile(file, accept)) {
          nextErrors.push(`${file.name} is not an accepted file type.`);
          continue;
        }

        if (file.size > maxSize) {
          nextErrors.push(`${file.name} is larger than ${formatBytes(maxSize)}.`);
          continue;
        }

        validFiles.push(file);
      }

      const currentFiles = filesRef.current;
      const selectedFiles = multiple
        ? [...currentFiles, ...validFiles.map(createFileItem)]
        : validFiles.slice(0, 1).map(createFileItem);
      const acceptedFiles = selectedFiles.slice(0, maxFiles);

      if (selectedFiles.length > maxFiles) {
        nextErrors.push(
          `You can upload up to ${maxFiles} file${maxFiles === 1 ? "" : "s"}.`,
        );
        clearObjectUrls(selectedFiles.slice(maxFiles));
      }

      if (!multiple) {
        clearObjectUrls(currentFiles);
      }

      filesRef.current = acceptedFiles;
      setFiles(acceptedFiles);

      setErrors(nextErrors);
    },
    [accept, clearObjectUrls, maxFiles, maxSize, multiple],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateFiles(Array.from(event.target.files ?? []));
    },
    [updateFiles],
  );

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      updateFiles(Array.from(event.dataTransfer.files));
    },
    [updateFiles],
  );

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const removeFile = useCallback(
    (id: string) => {
      setFiles((currentFiles) => {
        const file = currentFiles.find((item) => item.id === id);
        if (file) {
          clearObjectUrls([file]);
        }

        const nextFiles = currentFiles.filter((item) => item.id !== id);
        filesRef.current = nextFiles;
        return nextFiles;
      });

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [clearObjectUrls],
  );

  const clearFiles = useCallback(() => {
    setFiles((currentFiles) => {
      clearObjectUrls(currentFiles);
      filesRef.current = [];
      return [];
    });
    setErrors([]);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [clearObjectUrls]);

  const getInputProps = useCallback(
    (props: InputProps = {}) => ({
      ...props,
      accept,
      multiple,
      onChange: handleInputChange,
      ref: inputRef,
      type: "file",
    }),
    [accept, handleInputChange, multiple],
  );

  return [
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
  ] as const;
}
