"use client";

import { useRef, useState } from "react";
import { isValidEmail } from "@/lib/validation";
import { submitContact } from "@/lib/submit";
import { Icon, type IconName } from "@/components/Icon";
import { Field, TextInput, Textarea } from "./fields";

export function ContactForm({ bare = false }: { bare?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const honeypotRef = useRef<HTMLInputElement>(null);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Please enter your name.";
    if (!email.trim()) e.email = "Please enter your email.";
    else if (!isValidEmail(email)) e.email = "Please enter a valid email address.";
    if (!subject.trim()) e.subject = "Please enter a subject.";
    if (!message.trim()) e.message = "Please enter a message.";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (status === "submitting") return;
    // A hint, not a verdict: autofill reaches hidden fields too. Send the
    // message either way and let the server mark it, rather than dropping
    // something a real person wrote.
    const suspectedBot = !!honeypotRef.current?.value.trim();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setStatus("submitting");
    const fd = new FormData();
    fd.append("name", name);
    fd.append("email", email);
    fd.append("subject", subject);
    fd.append("message", message);
    if (suspectedBot) fd.append("wr_extra_field", "1");

    try {
      const result = await submitContact(fd);
      if (result.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={`${bare ? "" : "card"} text-center`} role="status" aria-live="polite">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Icon name="checkCircle" className="h-7 w-7 text-green-600" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Message sent</h3>
        <p className="mt-2 text-sm text-navy-600">
          Thank you for reaching out. We will respond as soon as possible.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={`${bare ? "" : "card"} space-y-5`}>
      <div className="pb-1">
        <h3 className="font-display text-2xl font-extrabold tracking-[-0.025em] text-navy-900 sm:text-[2rem]">
          Send us a message
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-navy-500">
          Fill out the form below and our team will get back to you as soon as possible.
        </p>
      </div>

      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact_hp">Leave empty</label>
        <input ref={honeypotRef} id="contact_hp" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full Name" htmlFor="contact-name" required error={errors.name}>
          <WithIcon icon="userLine">
            <TextInput
              id="contact-name"
              autoComplete="name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              className={inputClass(errors.name)}
            />
          </WithIcon>
        </Field>
        <Field label="Email Address" htmlFor="contact-email" required error={errors.email}>
          <WithIcon icon="mailLine">
            <TextInput
              id="contact-email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              className={inputClass(errors.email)}
            />
          </WithIcon>
        </Field>
      </div>
      <Field label="Subject" htmlFor="contact-subject" required error={errors.subject}>
        <WithIcon icon="list">
          <TextInput
            id="contact-subject"
            placeholder="What is your question about?"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            error={errors.subject}
            className={inputClass(errors.subject)}
          />
        </WithIcon>
      </Field>
      <Field label="Message" htmlFor="contact-message" required error={errors.message}>
        <WithIcon icon="chatLine" top>
          <Textarea
            id="contact-message"
            placeholder="Type your message here…"
            value={message}
            maxLength={MAX_MESSAGE}
            onChange={(e) => setMessage(e.target.value)}
            error={errors.message}
            aria-describedby={[errors.message ? "contact-message-error" : null, "contact-message-count"]
              .filter(Boolean)
              .join(" ")}
            className={`textarea min-h-[9.5rem] !resize-none !rounded-xl border-cream-300 bg-white pb-8 pl-12 pt-3.5 placeholder:text-navy-300 ${
              errors.message ? "input-invalid" : ""
            }`}
          />
          <p
            id="contact-message-count"
            className="pointer-events-none absolute bottom-3 right-4 text-xs tabular-nums text-navy-400"
          >
            {message.length}/{MAX_MESSAGE}
          </p>
        </WithIcon>
      </Field>

      {status === "error" ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          Something went wrong. Please try again.
        </p>
      ) : null}

      <button type="submit" disabled={status === "submitting"} className="btn-brand group w-full !min-h-[58px] !text-base">
        {status === "submitting" ? "Sending…" : "Send Message"}
        {status === "submitting" ? null : (
          <Icon
            name="arrowRight"
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
          />
        )}
      </button>
    </form>
  );
}

/** The server keeps this much of a message, so the box allows no more. */
const MAX_MESSAGE = 4000;

function inputClass(error?: string): string {
  return `input !min-h-[52px] !rounded-xl border-cream-300 bg-white pl-12 placeholder:text-navy-300 ${
    error ? "input-invalid" : ""
  }`;
}

/** A field with a small icon inside its left edge, as in the approved design. */
function WithIcon({
  icon,
  top = false,
  children,
}: {
  icon: IconName;
  top?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon
        name={icon}
        className={`pointer-events-none absolute left-4 h-[18px] w-[18px] text-navy-400 ${
          top ? "top-3.5" : "top-1/2 -translate-y-1/2"
        }`}
      />
      {children}
    </div>
  );
}
