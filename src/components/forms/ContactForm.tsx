"use client";

import { useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import { isValidEmail } from "@/lib/validation";
import { submitContact } from "@/lib/submit";
import { Icon } from "@/components/Icon";
import { Field, TextInput, Textarea } from "./fields";

export function ContactForm({ bare = false }: { bare?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [isDemo, setIsDemo] = useState(false);
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
    if (honeypotRef.current?.value) {
      setStatus("success");
      setIsDemo(siteConfig.demoMode);
      return;
    }
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setStatus("submitting");
    const fd = new FormData();
    fd.append("name", name);
    fd.append("email", email);
    fd.append("subject", subject);
    fd.append("message", message);

    try {
      const result = await submitContact(fd);
      if (result.ok) {
        setStatus("success");
        setIsDemo(result.demo);
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
        {isDemo ? (
          <p className="mx-auto mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Demonstration mode — TEST message, nothing was sent.
          </p>
        ) : null}
        <p className="mt-2 text-sm text-navy-600">
          Thank you for reaching out. We will respond as soon as possible.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={`${bare ? "" : "card"} space-y-4`}>
      <h3 className="text-lg font-semibold text-navy-900">Send us a message</h3>

      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact_hp">Leave empty</label>
        <input ref={honeypotRef} id="contact_hp" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Field label="Name" htmlFor="contact-name" required error={errors.name}>
        <TextInput id="contact-name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      </Field>
      <Field label="Email" htmlFor="contact-email" required error={errors.email}>
        <TextInput id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      </Field>
      <Field label="Subject" htmlFor="contact-subject" required error={errors.subject}>
        <TextInput id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)} error={errors.subject} />
      </Field>
      <Field label="Message" htmlFor="contact-message" required error={errors.message}>
        <Textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} error={errors.message} />
      </Field>

      {status === "error" ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          Something went wrong. Please try again.
        </p>
      ) : null}

      <button type="submit" disabled={status === "submitting"} className="btn-primary w-full">
        {status === "submitting" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
