"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { COLOR_SWATCHES, DEFAULT_FONT_SIZE, FONT_FAMILIES, FONT_SIZES } from "@/lib/composeOptions";

/**
 * The Send email tab's editor: a writing area with a toolbar over it — font,
 * size, bold, italic, underline, strikethrough, text and highlight colour,
 * headings, alignment, lists, links, a dividing line, clear formatting, undo
 * and redo. Ctrl/⌘+B, I, U and K work as in any mail app.
 *
 * Built on the browser's own editing (contentEditable), so there is no editor
 * library to load. What it produces is still treated as untrusted: the server
 * cleans it before anything is previewed or sent (lib/composeEmail).
 */

type Popover = "fore" | "back" | "link" | null;

/** Small line icons for the toolbar, kept here so the public site never loads them. */
const ICONS: Record<string, ReactNode> = {
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  redo: <path d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />,
  alignLeft: <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />,
  alignCenter: <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />,
  alignRight: <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />,
  alignJustify: <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />,
  bullets: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  numbers: <path d="M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M4 9h3M4 14.5c.4-.6 1-1 1.7-1 .8 0 1.3.5 1.3 1.2 0 1.3-3 2-3 3.8h3" />,
  link: <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />,
  unlink: <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1M4 4l16 16" />,
  hr: <path d="M4 12h16M8 7h8M8 17h8" />,
  clear: <path d="M6 5h11M11 5 8 19M14 14l5 5M19 14l-5 5" />,
};

function Svg({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children,
  disabled,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      // Keep the cursor and the selection in the text while the button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm transition disabled:opacity-40 ${
        active ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-navy-100"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-navy-200" />;
}

const KEEP_TAGS = new Set([
  "P", "DIV", "BR", "SPAN", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SUB", "SUP",
  "UL", "OL", "LI", "H1", "H2", "H3", "BLOCKQUOTE", "HR", "A", "FONT",
]);
/** Removed together with everything inside them. */
const DROP_TAGS = new Set([
  "SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "FORM", "INPUT", "TEXTAREA", "SELECT", "BUTTON",
  "IMG", "SVG", "VIDEO", "AUDIO", "CANVAS", "LINK", "META", "TITLE", "HEAD", "NOSCRIPT", "TEMPLATE",
]);
const KEEP_STYLES = [
  "color", "background-color", "font-family", "font-size", "font-weight", "font-style",
  "text-decoration", "text-decoration-line", "text-align",
];

/**
 * Pasted or restored HTML, reduced to formatting before it touches the page.
 *
 * Parsed in a detached document, where nothing runs and nothing loads, then
 * rebuilt from the formatting the toolbar itself can make. Without this a
 * paste from a web page could restyle the Admin Panel around the editor. The
 * server cleans again before sending; this is about the page you are on.
 */
export function cleanForEditor(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out = document.createElement("div");
  const copy = (from: Node, to: Node) => {
    from.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        to.appendChild(document.createTextNode(node.textContent ?? ""));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      if (DROP_TAGS.has(el.tagName)) return;
      if (!KEEP_TAGS.has(el.tagName)) {
        copy(el, to); // unknown wrapper: keep its text, lose the tag
        return;
      }
      const clean = document.createElement(el.tagName === "FONT" ? "span" : el.tagName.toLowerCase());
      for (const prop of KEEP_STYLES) {
        const v = el.style.getPropertyValue(prop);
        if (v && !/url\(|expression|javascript:/i.test(v)) clean.style.setProperty(prop, v);
      }
      if (el.tagName === "FONT") {
        const face = el.getAttribute("face");
        const color = el.getAttribute("color");
        if (face) clean.style.fontFamily = face;
        if (color) clean.style.color = color;
      }
      if (el.tagName === "A") {
        const href = el.getAttribute("href") ?? "";
        if (/^(https?:|mailto:)/i.test(href.trim())) clean.setAttribute("href", href.trim());
      }
      copy(el, clean);
      to.appendChild(clean);
    });
  };
  copy(doc.body, out);
  return out.innerHTML;
}

/** A link typed without a scheme: an address becomes mailto:, anything else https://. */
function normaliseLink(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^(https?:|mailto:)/i.test(v)) return v;
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(v)) return `mailto:${v}`;
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(v)) return `https://${v}`;
  return null;
}

export function RichTextEditor({
  editorRef,
  onChange,
  placeholder,
  disabled,
}: {
  editorRef: RefObject<HTMLDivElement | null>;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const saved = useRef<Range | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [font, setFont] = useState("");
  const [size, setSize] = useState("");
  const [block, setBlock] = useState("div");
  const [popover, setPopover] = useState<Popover>(null);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState("");
  const [customColor, setCustomColor] = useState("#b06e0c");

  const inEditor = useCallback(
    (node: Node | null) => !!node && !!editorRef.current && editorRef.current.contains(node),
    [editorRef],
  );

  /** What the toolbar should show for where the cursor is now. */
  const refresh = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !inEditor(sel.anchorNode)) return;
    saved.current = sel.getRangeAt(0).cloneRange();
    const q = (c: string) => {
      try {
        return document.queryCommandState(c);
      } catch {
        return false;
      }
    };
    setActive({
      bold: q("bold"),
      italic: q("italic"),
      underline: q("underline"),
      strikeThrough: q("strikeThrough"),
      insertUnorderedList: q("insertUnorderedList"),
      insertOrderedList: q("insertOrderedList"),
      justifyLeft: q("justifyLeft"),
      justifyCenter: q("justifyCenter"),
      justifyRight: q("justifyRight"),
      justifyFull: q("justifyFull"),
    });
    const el = sel.anchorNode?.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentElement : (sel.anchorNode as HTMLElement | null);
    if (el) {
      const cs = window.getComputedStyle(el);
      const first = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim().toLowerCase();
      setFont(FONT_FAMILIES.find((f) => f.label.toLowerCase() === first)?.value ?? "");
      const px = Math.round(parseFloat(cs.fontSize));
      setSize((FONT_SIZES as readonly number[]).includes(px) ? String(px) : "");
      const blockEl = el.closest("h2,h3,p,div,li");
      setBlock(blockEl && inEditor(blockEl) ? (["H2", "H3"].includes(blockEl.tagName) ? blockEl.tagName.toLowerCase() : "div") : "div");
    }
  }, [inEditor]);

  useEffect(() => {
    document.addEventListener("selectionchange", refresh);
    return () => document.removeEventListener("selectionchange", refresh);
  }, [refresh]);

  useEffect(() => {
    try {
      document.execCommand("defaultParagraphSeparator", false, "div");
    } catch {
      /* older browsers keep their own */
    }
  }, []);

  /**
   * Put the cursor back in the text before a command. The live selection wins
   * when it is still in the editor; the saved one covers a toolbar control
   * (a list, a colour panel) having taken the focus.
   */
  function restore() {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    const live = sel && sel.rangeCount && inEditor(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
    el.focus();
    const range = live ?? saved.current;
    if (range && sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function changed() {
    const el = editorRef.current;
    if (el) onChange(el.innerHTML);
    refresh();
  }

  function exec(command: string, value?: string) {
    restore();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
    changed();
  }

  /** Any pixel size, not just the browser's seven: mark with size 7, then swap in the real one. */
  function applySize(px: string) {
    const el = editorRef.current;
    if (!el || !px) return;
    restore();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("fontSize", false, "7");
    document.execCommand("styleWithCSS", false, "true");
    const spans: HTMLSpanElement[] = [];
    el.querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement("span");
      span.style.fontSize = `${px}px`;
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
      spans.push(span);
    });
    if (spans.length) {
      const range = document.createRange();
      range.setStartBefore(spans[0]);
      range.setEndAfter(spans[spans.length - 1]);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    changed();
  }

  function insertLink() {
    const url = normaliseLink(linkValue);
    if (!url) {
      setLinkError("Enter a web address (e.g. workroute.co.uk/jobs) or an email address.");
      return;
    }
    restore();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      // Nothing selected: the address itself becomes the link text.
      const text = url.replace(/^mailto:/, "");
      const a = `<a href="${url.replace(/"/g, "&quot;")}">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</a>&nbsp;`;
      document.execCommand("insertHTML", false, a);
    } else {
      document.execCommand("createLink", false, url);
    }
    setPopover(null);
    setLinkValue("");
    setLinkError("");
    changed();
  }

  function openLink() {
    const sel = window.getSelection();
    const a = sel?.anchorNode ? (sel.anchorNode.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentElement : (sel.anchorNode as HTMLElement))?.closest("a") : null;
    setLinkValue(a && inEditor(a) ? a.getAttribute("href") ?? "" : "");
    setLinkError("");
    setPopover("link");
  }

  function colourPanel(kind: "fore" | "back") {
    const apply = (c: string) => {
      exec(kind === "fore" ? "foreColor" : "hiliteColor", c);
      setPopover(null);
    };
    return (
      <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-navy-200 bg-white p-3 shadow-lg" data-color-panel={kind}>
        <p className="mb-2 text-xs font-semibold text-navy-500">{kind === "fore" ? "Text colour" : "Highlight colour"}</p>
        <div className="grid grid-cols-5 gap-1.5">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              aria-label={`${kind === "fore" ? "Text" : "Highlight"} colour ${c}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(c)}
              className="h-8 w-full rounded-md ring-1 ring-inset ring-navy-200 transition hover:scale-105"
              style={{ backgroundColor: c }}
              data-swatch={c}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="color"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            aria-label="Choose any colour"
            className="h-9 w-12 cursor-pointer rounded border border-navy-200 bg-white p-0.5"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(customColor)}
            className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-800"
          >
            Use this colour
          </button>
        </div>
        {kind === "back" ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply("transparent")}
            className="mt-2 text-xs font-semibold text-navy-600 underline"
          >
            No highlight
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-visible rounded-xl border border-navy-200 bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
      {/* The toolbar */}
      <div role="toolbar" aria-label="Formatting" className="relative flex flex-wrap items-center gap-0.5 border-b border-navy-100 bg-navy-50/50 px-2 py-1.5">
        <ToolButton label="Undo (Ctrl+Z)" onClick={() => exec("undo")} disabled={disabled}>
          <Svg name="undo" />
        </ToolButton>
        <ToolButton label="Redo (Ctrl+Y)" onClick={() => exec("redo")} disabled={disabled}>
          <Svg name="redo" />
        </ToolButton>
        <Divider />

        <select
          aria-label="Font"
          title="Font"
          value={font}
          disabled={disabled}
          onMouseDown={() => refresh()}
          onChange={(e) => {
            setFont(e.target.value);
            if (e.target.value) exec("fontName", e.target.value);
          }}
          className="h-9 w-[8.5rem] rounded-lg border border-navy-200 bg-white px-2 text-sm text-navy-800"
          data-tool="font"
        >
          <option value="">Font</option>
          {FONT_FAMILIES.map((f) => (
            <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Text size"
          title="Text size"
          value={size}
          disabled={disabled}
          onChange={(e) => {
            setSize(e.target.value);
            applySize(e.target.value);
          }}
          className="ml-1 h-9 w-[4.75rem] rounded-lg border border-navy-200 bg-white px-2 text-sm text-navy-800"
          data-tool="size"
        >
          <option value="">Size</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}px{s === DEFAULT_FONT_SIZE ? " ·" : ""}
            </option>
          ))}
        </select>
        <select
          aria-label="Paragraph style"
          title="Paragraph style"
          value={block}
          disabled={disabled}
          onChange={(e) => {
            setBlock(e.target.value);
            exec("formatBlock", `<${e.target.value}>`);
          }}
          className="ml-1 h-9 w-[7.5rem] rounded-lg border border-navy-200 bg-white px-2 text-sm text-navy-800"
          data-tool="block"
        >
          <option value="div">Normal text</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
        </select>
        <Divider />

        <ToolButton label="Bold (Ctrl+B)" active={active.bold} onClick={() => exec("bold")} disabled={disabled}>
          <span className="font-extrabold">B</span>
        </ToolButton>
        <ToolButton label="Italic (Ctrl+I)" active={active.italic} onClick={() => exec("italic")} disabled={disabled}>
          <span className="font-serif text-base italic">I</span>
        </ToolButton>
        <ToolButton label="Underline (Ctrl+U)" active={active.underline} onClick={() => exec("underline")} disabled={disabled}>
          <span className="underline underline-offset-2">U</span>
        </ToolButton>
        <ToolButton label="Strikethrough" active={active.strikeThrough} onClick={() => exec("strikeThrough")} disabled={disabled}>
          <span className="line-through">S</span>
        </ToolButton>

        <span className="relative">
          <ToolButton label="Text colour" active={popover === "fore"} onClick={() => setPopover(popover === "fore" ? null : "fore")} disabled={disabled}>
            <span className="flex flex-col items-center leading-none">
              <span className="font-bold">A</span>
              <span className="mt-0.5 h-1 w-4 rounded-sm bg-gradient-to-r from-red-500 via-brand-500 to-blue-500" />
            </span>
          </ToolButton>
          {popover === "fore" ? colourPanel("fore") : null}
        </span>
        <span className="relative">
          <ToolButton label="Highlight colour" active={popover === "back"} onClick={() => setPopover(popover === "back" ? null : "back")} disabled={disabled}>
            <span className="rounded bg-yellow-200 px-1 font-bold">ab</span>
          </ToolButton>
          {popover === "back" ? colourPanel("back") : null}
        </span>
        <Divider />

        <ToolButton label="Align left" active={active.justifyLeft} onClick={() => exec("justifyLeft")} disabled={disabled}>
          <Svg name="alignLeft" />
        </ToolButton>
        <ToolButton label="Align centre" active={active.justifyCenter} onClick={() => exec("justifyCenter")} disabled={disabled}>
          <Svg name="alignCenter" />
        </ToolButton>
        <ToolButton label="Align right" active={active.justifyRight} onClick={() => exec("justifyRight")} disabled={disabled}>
          <Svg name="alignRight" />
        </ToolButton>
        <ToolButton label="Justify" active={active.justifyFull} onClick={() => exec("justifyFull")} disabled={disabled}>
          <Svg name="alignJustify" />
        </ToolButton>
        <Divider />

        <ToolButton label="Bulleted list" active={active.insertUnorderedList} onClick={() => exec("insertUnorderedList")} disabled={disabled}>
          <Svg name="bullets" />
        </ToolButton>
        <ToolButton label="Numbered list" active={active.insertOrderedList} onClick={() => exec("insertOrderedList")} disabled={disabled}>
          <Svg name="numbers" />
        </ToolButton>
        <Divider />

        <span className="relative">
          <ToolButton label="Insert link (Ctrl+K)" active={popover === "link"} onClick={() => (popover === "link" ? setPopover(null) : openLink())} disabled={disabled}>
            <Svg name="link" />
          </ToolButton>
          {popover === "link" ? (
            <div className="absolute left-0 top-full z-20 mt-1 w-80 rounded-xl border border-navy-200 bg-white p-3 shadow-lg" data-link-panel>
              <label htmlFor="compose-link" className="text-xs font-semibold text-navy-500">
                Link to (web or email address)
              </label>
              <input
                id="compose-link"
                autoFocus
                value={linkValue}
                onChange={(e) => {
                  setLinkValue(e.target.value);
                  setLinkError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    insertLink();
                  }
                  if (e.key === "Escape") setPopover(null);
                }}
                placeholder="https://workroute.co.uk/jobs"
                className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm"
              />
              {linkError ? <p className="mt-1 text-xs text-red-600">{linkError}</p> : (
                <p className="mt-1 text-xs text-navy-400">Select some text first to turn it into the link.</p>
              )}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={insertLink} className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-800">
                  Insert link
                </button>
                <button type="button" onClick={() => setPopover(null)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-100">
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </span>
        <ToolButton label="Remove link" onClick={() => exec("unlink")} disabled={disabled}>
          <Svg name="unlink" />
        </ToolButton>
        <ToolButton label="Dividing line" onClick={() => exec("insertHorizontalRule")} disabled={disabled}>
          <Svg name="hr" />
        </ToolButton>
        <ToolButton
          label="Clear formatting"
          onClick={() => {
            exec("removeFormat");
            exec("formatBlock", "<div>");
          }}
          disabled={disabled}
        >
          <Svg name="clear" />
        </ToolButton>
      </div>

      {/* The writing area, in the email's own font and size */}
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label="Email content"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        data-compose-editor
        onInput={changed}
        onPaste={(e) => {
          // Formatting comes along; anything else in the clipboard does not.
          const html = e.clipboardData.getData("text/html");
          const text = e.clipboardData.getData("text/plain");
          e.preventDefault();
          restore();
          if (html) document.execCommand("insertHTML", false, cleanForEditor(html));
          else if (text) document.execCommand("insertText", false, text);
          changed();
        }}
        onBlur={() => onChange(editorRef.current?.innerHTML ?? "")}
        onFocus={() => setPopover((p) => (p === "link" ? p : null))}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            refresh();
            openLink();
          }
        }}
        className="min-h-[20rem] max-h-[36rem] overflow-y-auto px-5 py-4 font-[Arial,Helvetica,sans-serif] text-[16px] leading-relaxed text-navy-600 outline-none empty:before:pointer-events-none empty:before:text-navy-300 empty:before:content-[attr(data-placeholder)] [&_a]:text-[#b06e0c] [&_a]:underline [&_blockquote]:border-l-[3px] [&_blockquote]:border-cream-300 [&_blockquote]:pl-3 [&_h2]:mb-2 [&_h2]:text-[22px] [&_h2]:leading-tight [&_h3]:mb-2 [&_h3]:text-[18px] [&_hr]:my-4 [&_hr]:border-navy-200 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6"
      />
    </div>
  );
}
