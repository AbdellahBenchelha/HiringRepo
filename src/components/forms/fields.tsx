"use client";

import { useId, type ReactNode } from "react";

/** Shared field wrapper providing a label, optional hint, and error message. */
export function Field({
  label,
  htmlFor,
  required,
  optional,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
        {optional ? <span className="font-normal text-navy-400"> (optional)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="mb-1.5 text-xs text-navy-500">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  id,
  error,
  describedBy,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  error?: string;
  describedBy?: string;
}) {
  return (
    <input
      id={id}
      className={`input ${error ? "input-invalid" : ""}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={[error ? `${id}-error` : null, describedBy].filter(Boolean).join(" ") || undefined}
      {...props}
    />
  );
}

export function Select({
  id,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  error?: string;
}) {
  return (
    <select
      id={id}
      className={`select ${error ? "input-invalid" : ""}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  id,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  error?: string;
}) {
  return (
    <textarea
      id={id}
      className={`textarea ${error ? "input-invalid" : ""}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      {...props}
    />
  );
}

/** Accessible radio group rendered as a fieldset. */
export function RadioGroup({
  legend,
  name,
  options,
  value,
  onChange,
  required,
  optional,
  inline = true,
}: {
  legend: string;
  name: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  optional?: boolean;
  inline?: boolean;
}) {
  return (
    <fieldset>
      <legend className="label">
        {legend}
        {required ? <span className="text-red-600"> *</span> : null}
        {optional ? <span className="font-normal text-navy-400"> (optional)</span> : null}
      </legend>
      <div className={inline ? "flex flex-wrap gap-x-5 gap-y-2" : "space-y-2"}>
        {options.map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-navy-700">
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="h-4 w-4 border-navy-300 text-brand-600 focus:ring-brand-500"
            />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Accessible multi-select checkbox group. */
export function CheckboxGroup({
  legend,
  options,
  values,
  onToggle,
}: {
  legend: string;
  options: string[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-navy-700">
            <input
              type="checkbox"
              checked={values.includes(opt)}
              onChange={() => onToggle(opt)}
              className="h-4 w-4 rounded border-navy-300 text-brand-600 focus:ring-brand-500"
            />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Single checkbox with rich label content (used for consent statements). */
export function Checkbox({
  checked,
  onChange,
  required,
  error,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-navy-700">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-navy-300 text-brand-600 focus:ring-brand-500"
        />
        <span>
          {children}
          {required ? <span className="text-red-600"> *</span> : null}
        </span>
      </label>
      {error ? (
        <p role="alert" className="field-error ml-7">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Section heading used to divide the application form. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-navy-100 pt-8 first:border-t-0 first:pt-0">
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-navy-500">{description}</p> : null}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}
