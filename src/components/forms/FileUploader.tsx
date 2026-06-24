"use client";

import { useId, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { siteConfig } from "@/config/site";
import { formatFileSize, validateFile } from "@/lib/validation";

interface FileUploaderProps {
  label: string;
  optional?: boolean;
  /** Lifts the validated file (or null) up to the parent form. */
  onChange: (file: File | null) => void;
}

/**
 * Accessible single-file uploader.
 * Validates type and size on selection, shows the chosen filename, and lets
 * the applicant remove or replace the document.
 */
export function FileUploader({ label, optional, onChange }: FileUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>();

  const { acceptedExtensions, maxFileSizeMB } = siteConfig.upload;

  function handleFiles(files: FileList | null) {
    const selected = files?.[0] ?? null;
    if (!selected) return;
    const result = validateFile(selected);
    if (!result.ok) {
      setError(result.error);
      setFile(null);
      onChange(null);
      return;
    }
    setError(undefined);
    setFile(selected);
    onChange(selected);
  }

  function remove() {
    setFile(null);
    setError(undefined);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <span className="label">
        {label}
        {optional ? <span className="font-normal text-navy-400"> (optional)</span> : null}
      </span>

      {!file ? (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-200 bg-navy-50/40 px-4 py-6 text-center transition hover:border-brand-400 hover:bg-brand-50/40 focus-within:border-brand-500"
        >
          <Icon name="upload" className="h-6 w-6 text-brand-600" />
          <span className="text-sm font-medium text-navy-800">
            Click to upload or drag and drop
          </span>
          <span className="text-xs text-navy-500">
            Accepted: {acceptedExtensions.join(", ")} · Max {maxFileSizeMB} MB
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={acceptedExtensions.join(",")}
            className="sr-only"
            aria-describedby={error ? `${inputId}-error` : undefined}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-navy-200 bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Icon name="checkCircle" className="h-5 w-5 shrink-0 text-green-600" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-navy-900">{file.name}</p>
              <p className="text-xs text-navy-500">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={remove}
              className="rounded-full p-1.5 text-navy-500 transition hover:bg-red-50 hover:text-red-600"
              aria-label={`Remove ${file.name}`}
            >
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </div>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={acceptedExtensions.join(",")}
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {error ? (
        <p id={`${inputId}-error`} role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
