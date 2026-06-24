import { siteConfig } from "@/config/site";

/** Reasonable email format check (UI-level; always re-validate server-side). */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/**
 * Phone validation: allows an optional leading +, digits, spaces, dashes,
 * parentheses, and dots. Requires 7–15 digits overall.
 */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!/^[+]?[\d\s().-]{7,}$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true; // optional fields are valid when empty
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  const { maxFileSizeMB, acceptedExtensions, acceptedMimeTypes } = siteConfig.upload;
  const maxBytes = maxFileSizeMB * 1024 * 1024;

  const lowerName = file.name.toLowerCase();
  const extOk = acceptedExtensions.some((ext) => lowerName.endsWith(ext));
  // Some browsers report an empty type for .doc; fall back to extension check.
  const typeOk =
    file.type === "" || (acceptedMimeTypes as readonly string[]).includes(file.type);

  if (!extOk || !typeOk) {
    return {
      ok: false,
      error: `Unsupported file type. Accepted: ${acceptedExtensions.join(", ")}.`,
    };
  }
  if (file.size > maxBytes) {
    return { ok: false, error: `File is too large. Maximum size is ${maxFileSizeMB} MB.` };
  }
  return { ok: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
