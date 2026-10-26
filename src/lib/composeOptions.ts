/**
 * What the Send email tab's editor offers, shared by the toolbar (browser) and
 * the cleaner that runs before sending (server), so a choice made in one is
 * always accepted by the other.
 *
 * Fonts are the ones every mail app has: a web font chosen here would show in
 * the preview and then fall back to something else in the recipient's inbox.
 */

export const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
] as const;

/** In pixels. 16 is the size the email is written in when nothing is chosen. */
export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32] as const;
export const DEFAULT_FONT_SIZE = 16;

/** Quick picks for text and highlight colour; any other colour can be chosen too. */
export const COLOR_SWATCHES = [
  "#0f1035", "#383864", "#656593", "#000000", "#ffffff",
  "#b06e0c", "#f5a623", "#dc2626", "#ea580c", "#16a34a",
  "#0284c7", "#4f46e5", "#7c3aed", "#db2777", "#fde68a",
] as const;

export type ComposeDesign = "workroute" | "plain";

export const MAX_SUBJECT = 200;
/** The editor's HTML, before cleaning. Generous for a long letter with formatting. */
export const MAX_BODY_HTML = 200_000;
