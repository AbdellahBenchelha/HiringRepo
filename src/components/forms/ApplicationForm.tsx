"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { jobs } from "@/config/jobs";
import { isValidEmail, isValidPhone, isValidUrl } from "@/lib/validation";
import { notifyTelegram } from "@/lib/notify";
import { Icon, type IconName } from "@/components/Icon";
import { FileUploader } from "./FileUploader";
import { CountrySelect } from "./CountrySelect";
import { PhoneInput } from "./PhoneInput";
import {
  Checkbox,
  CheckboxGroup,
  Field,
  RadioGroup,
  Select,
  Textarea,
  TextInput,
} from "./fields";

interface LanguageRow {
  language: string;
  speaking: string;
  writing: string;
  reading: string;
}

interface ExperienceRow {
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  responsibilities: string;
}

interface ApplicationFormProps {
  initialPosition?: string;
  onSubmitted?: () => void;
}

const yesNo = ["Yes", "No"];

const applicationQuestions = [
  { key: "q_whyCustomerSupport", label: "Why would you like to work in customer support?" },
  { key: "q_whyCompany", label: "Why are you interested in joining our company?" },
  { key: "q_helpedSolve", label: "Describe a situation where you helped solve someone's problem." },
  { key: "q_angryCustomer", label: "How would you handle an angry or frustrated customer?" },
  { key: "q_excellentService", label: "What does excellent customer service mean to you?" },
] as const;

/** The wizard steps, in order. Each maps to one screen of the form. */
const STEPS: { id: string; label: string; title: string; description?: string; icon: IconName }[] = [
  {
    id: "personal",
    label: "Personal",
    title: "Personal Information",
    description: "Tell us who you are and how we can reach you.",
    icon: "users",
  },
  {
    id: "position",
    label: "Position",
    title: "Position & Availability",
    description: "Choose the role you want and when you can start.",
    icon: "headset",
  },
  {
    id: "languages",
    label: "Languages",
    title: "Language Skills",
    description: "Add every language you speak and your proficiency in each.",
    icon: "globe",
  },
  {
    id: "experience",
    label: "Experience",
    title: "Work Experience",
    description: "Share your relevant background — beginners are welcome too.",
    icon: "trendingUp",
  },
  {
    id: "education",
    label: "Education",
    title: "Education",
    description: "Your educational background and any certifications.",
    icon: "graduation",
  },
  {
    id: "questions",
    label: "Questions",
    title: "Application Questions",
    description: "A few short questions to help us get to know you.",
    icon: "chat",
  },
  {
    id: "documents",
    label: "Documents",
    title: "CV & Documents",
    description: "Optional — you can apply without uploading anything.",
    icon: "upload",
  },
  {
    id: "review",
    label: "Review",
    title: "Review & Submit",
    description: "Check your details and confirm the declarations below.",
    icon: "checkCircle",
  },
];

export function ApplicationForm({ initialPosition, onSubmitted }: ApplicationFormProps) {
  const positionOptions = useMemo(() => jobs.map((j) => j.title), []);

  // ---- Wizard state ----
  const [current, setCurrent] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [stepError, setStepError] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  // ---- Personal information ----
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [linkedin, setLinkedin] = useState("");

  // ---- Position information ----
  // All roles are fully remote, so work arrangement is fixed rather than chosen.
  const workArrangement = "Remote";
  const [position, setPosition] = useState(
    initialPosition && positionOptions.includes(initialPosition) ? initialPosition : ""
  );
  const [employmentType, setEmploymentType] = useState("No preference");
  const [startDate, setStartDate] = useState("");
  const [schedule, setSchedule] = useState("");
  const [evenings, setEvenings] = useState("No");
  const [weekends, setWeekends] = useState("No");
  const [rotating, setRotating] = useState("No");

  // ---- Languages ----
  const [languages, setLanguages] = useState<LanguageRow[]>([
    { language: "", speaking: "", writing: "", reading: "" },
  ]);

  // ---- Work experience ----
  const [hasExperience, setHasExperience] = useState("No");
  const [yearsExperience, setYearsExperience] = useState("");
  const [supportTypes, setSupportTypes] = useState<string[]>([]);
  const [crmTools, setCrmTools] = useState("");
  const [experienceDetails, setExperienceDetails] = useState("");
  const [experiences, setExperiences] = useState<ExperienceRow[]>([
    { jobTitle: "", company: "", startDate: "", endDate: "", responsibilities: "" },
  ]);

  // ---- Education ----
  const [educationLevel, setEducationLevel] = useState("");
  const [institution, setInstitution] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [certifications, setCertifications] = useState("");

  // ---- Application questions ----
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phoneComfort, setPhoneComfort] = useState("Yes");
  const [targetsComfort, setTargetsComfort] = useState("Yes");
  const [referralSource, setReferralSource] = useState("");
  const [anythingElse, setAnythingElse] = useState("");

  // ---- Documents ----
  const [cv, setCv] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState<File | null>(null);
  const [certificate, setCertificate] = useState<File | null>(null);

  // ---- Consent ----
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [consentProcessing, setConsentProcessing] = useState(false);
  const [understandNoGuarantee, setUnderstandNoGuarantee] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // ---- Spam protection (honeypot) ----
  const honeypotRef = useRef<HTMLInputElement>(null);

  // ---- Form meta ----
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  const isLastStep = current === STEPS.length - 1;
  const step = STEPS[current];

  function setField<T>(setter: (v: T) => void, key: string) {
    return (value: T) => {
      setter(value);
      if (errors[key]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    };
  }

  function updateLanguage(index: number, patch: Partial<LanguageRow>) {
    setLanguages((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function updateExperience(index: number, patch: Partial<ExperienceRow>) {
    setExperiences((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function toggleSupportType(value: string) {
    setSupportTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function scrollToTop() {
    window.setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  /** Validate only the fields that live on a given step. */
  function validateStep(index: number): Record<string, string> {
    const e: Record<string, string> = {};
    switch (STEPS[index].id) {
      case "personal":
        if (!firstName.trim()) e.firstName = "First name is required.";
        if (!lastName.trim()) e.lastName = "Last name is required.";
        if (!dob.trim()) e.dob = "Date of birth is required.";
        if (!email.trim()) e.email = "Email address is required.";
        else if (!isValidEmail(email)) e.email = "Please enter a valid email address.";
        if (!phone.trim()) e.phone = "Phone number is required.";
        else if (!isValidPhone(phone)) e.phone = "Please enter a valid phone number with country code.";
        if (!country.trim()) e.country = "Country is required.";
        if (!city.trim()) e.city = "City is required.";
        if (linkedin && !isValidUrl(linkedin)) e.linkedin = "Please enter a valid URL (https://…).";
        break;
      case "position":
        if (!position) e.position = "Please select the position you are applying for.";
        break;
      case "languages":
        if (!languages.some((l) => l.language.trim())) {
          e.languages = "Please add at least one language.";
        }
        break;
      case "review":
        if (!confirmAccurate) e.confirmAccurate = "Please confirm your information is accurate.";
        if (!agreePrivacy) e.agreePrivacy = "Please agree to the Privacy Policy to continue.";
        if (!consentProcessing) e.consentProcessing = "Your consent is required to process the application.";
        if (!understandNoGuarantee) e.understandNoGuarantee = "Please acknowledge this statement.";
        break;
    }
    return e;
  }

  function goToStep(index: number) {
    if (index < 0 || index > STEPS.length - 1) return;
    setStepError("");
    setCurrent(index);
    setMaxReached((m) => Math.max(m, index));
    scrollToTop();
  }

  function handleNext() {
    const e = validateStep(current);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      setStepError("Please complete the required fields before continuing.");
      scrollToTop();
      return;
    }
    setErrors({});
    // When the applicant completes the Personal Information step, send their
    // details to the recruitment team's Telegram.
    if (STEPS[current].id === "personal") {
      void notifyTelegram({
        type: "personal",
        fields: { firstName, lastName, dob, email, phone, country, city, address, linkedin },
      });
    }
    goToStep(current + 1);
  }

  function handleBack() {
    setStepError("");
    setErrors({});
    goToStep(current - 1);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();

    // On the earlier steps the primary button just advances the wizard.
    if (!isLastStep) {
      handleNext();
      return;
    }

    // FINAL STEP: send the Telegram notification immediately, with NO checks at
    // all — no validation, no honeypot, no required-field gating. The message
    // goes out on every submit click, even if the form is completely empty.
    notifyTelegram({ type: "submitted", name: `${firstName} ${lastName}`.trim() });

    setStatus("success");
    onSubmitted?.();
    scrollToTop();
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-xl py-8 text-center" role="status" aria-live="polite">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Icon name="checkCircle" className="h-9 w-9 text-green-600" />
        </div>
        <h3 className="mt-6 text-2xl font-semibold">Application Submitted Successfully</h3>
        <p className="mt-4 leading-relaxed text-navy-600">
          Thank you for applying to {siteConfig.company.name}. Our recruitment team will review your
          application. Candidates whose qualifications match our current requirements may be
          contacted for the next stage.
        </p>
      </div>
    );
  }

  const progress = Math.round(((current + 1) / STEPS.length) * 100);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div ref={topRef} />

      {/* ---------- STEP NAVIGATION / PROGRESS ---------- */}
      <div className="mb-8">
        {/* Desktop: full stepper */}
        <ol className="hidden items-center md:flex" role="list" aria-label="Application progress">
          {STEPS.map((s, i) => {
            const state = i < current ? "complete" : i === current ? "current" : "upcoming";
            const reachable = i <= maxReached;
            return (
              <li key={s.id} className={`relative flex flex-col items-center ${i === STEPS.length - 1 ? "" : "flex-1"}`}>
                {/* connector line to the previous step */}
                {i !== 0 ? (
                  <span
                    aria-hidden="true"
                    className={`absolute right-1/2 top-5 h-0.5 w-full -translate-y-1/2 ${
                      i <= current ? "bg-brand-600" : "bg-navy-200"
                    }`}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => (reachable ? goToStep(i) : undefined)}
                  disabled={!reachable}
                  aria-current={state === "current" ? "step" : undefined}
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition ${
                    state === "complete"
                      ? "border-brand-600 bg-brand-600 text-white hover:bg-brand-700"
                      : state === "current"
                        ? "border-brand-600 bg-white text-brand-700 ring-4 ring-brand-100"
                        : "border-navy-200 bg-white text-navy-400"
                  } ${reachable && state !== "current" ? "cursor-pointer" : ""} ${!reachable ? "cursor-not-allowed" : ""}`}
                >
                  {state === "complete" ? (
                    <Icon name="check" className="h-5 w-5" />
                  ) : (
                    <Icon name={s.icon} className="h-5 w-5" />
                  )}
                </button>
                <span
                  className={`relative z-10 mt-2 max-w-[7rem] text-center text-xs font-medium ${
                    state === "upcoming" ? "text-navy-400" : "text-navy-800"
                  }`}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Mobile: compact progress bar */}
        <div className="md:hidden">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-brand-700">
              Step {current + 1} of {STEPS.length}
            </span>
            <span className="text-navy-500">{progress}% complete</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-navy-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ---------- STEP HEADER ---------- */}
      <div className="mb-6 flex items-start gap-4 border-b border-navy-100 pb-5">
        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:flex">
          <Icon name={step.icon} className="h-6 w-6" />
        </span>
        <div>
          <p className="eyebrow">Step {current + 1} of {STEPS.length}</p>
          <h3 className="mt-1 text-2xl font-bold text-navy-900">{step.title}</h3>
          {step.description ? <p className="mt-1 text-sm text-navy-500">{step.description}</p> : null}
        </div>
      </div>

      {/* ---------- STEP-LEVEL ERROR BANNER ---------- */}
      {stepError ? (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {stepError}
        </div>
      ) : null}

      {/* Honeypot field — hidden from users, catches bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="company_website_hp">Leave this field empty</label>
        <input
          ref={honeypotRef}
          id="company_website_hp"
          name="company_website_hp"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* ---------- STEP PANELS ---------- */}
      <div className="min-h-[18rem]">
        {/* STEP 1 — PERSONAL INFORMATION */}
        {step.id === "personal" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="First name" htmlFor="firstName" required error={errors.firstName}>
              <TextInput id="firstName" value={firstName} autoComplete="given-name"
                onChange={(e) => setField(setFirstName, "firstName")(e.target.value)} error={errors.firstName} />
            </Field>
            <Field label="Last name" htmlFor="lastName" required error={errors.lastName}>
              <TextInput id="lastName" value={lastName} autoComplete="family-name"
                onChange={(e) => setField(setLastName, "lastName")(e.target.value)} error={errors.lastName} />
            </Field>
            <Field label="Date of birth" htmlFor="dob" required error={errors.dob}>
              <TextInput id="dob" type="date" value={dob} autoComplete="bday"
                onChange={(e) => setField(setDob, "dob")(e.target.value)} error={errors.dob} />
            </Field>
            <Field label="Email address" htmlFor="email" required error={errors.email}>
              <TextInput id="email" type="email" inputMode="email" value={email} autoComplete="email"
                onChange={(e) => setField(setEmail, "email")(e.target.value)} error={errors.email} />
            </Field>
            <Field label="Phone number" htmlFor="phone" required
              hint="Pick your country code, then enter your number. This number must be reachable on WhatsApp — our recruitment team will contact you there."
              error={errors.phone} className="sm:col-span-2">
              <PhoneInput id="phone" value={phone} error={errors.phone}
                onChange={(v) => setField(setPhone, "phone")(v)} />
            </Field>
            <Field label="Country" htmlFor="country" required error={errors.country}>
              <CountrySelect id="country" value={country} error={errors.country}
                onChange={(v) => setField(setCountry, "country")(v)} />
            </Field>
            <Field label="City" htmlFor="city" required error={errors.city}>
              <TextInput id="city" value={city} autoComplete="address-level2"
                onChange={(e) => setField(setCity, "city")(e.target.value)} error={errors.city} />
            </Field>
            <Field label="Full address" htmlFor="address" optional className="sm:col-span-2">
              <TextInput id="address" value={address} autoComplete="street-address"
                onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Field label="LinkedIn profile" htmlFor="linkedin" optional error={errors.linkedin} className="sm:col-span-2">
              <TextInput id="linkedin" type="url" placeholder="https://www.linkedin.com/in/…" value={linkedin}
                onChange={(e) => setField(setLinkedin, "linkedin")(e.target.value)} error={errors.linkedin} />
            </Field>
          </div>
        ) : null}

        {/* STEP 2 — POSITION INFORMATION */}
        {step.id === "position" ? (
          <div className="space-y-5">
            {/* All roles are fully remote. */}
            <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
              <Icon name="globe" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div className="text-sm text-navy-700">
                <p className="font-semibold text-navy-900">All our positions are 100% remote</p>
                <p className="mt-0.5">
                  You will work from home. A reliable internet connection and a quiet workspace are
                  all you need to get started.
                </p>
              </div>
            </div>
            <Field label="Position applied for" htmlFor="position" required error={errors.position}>
              <Select id="position" value={position}
                onChange={(e) => setField(setPosition, "position")(e.target.value)} error={errors.position}>
                <option value="">Select a position…</option>
                {positionOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <RadioGroup legend="Employment preference" name="employmentType" optional
                options={siteConfig.employmentTypes as unknown as string[]} value={employmentType}
                onChange={setEmploymentType} />
              <Field label="Available starting date" htmlFor="startDate" optional>
                <TextInput id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
              <Field label="Preferred working schedule" htmlFor="schedule" optional hint="e.g. mornings, afternoons, full days">
                <TextInput id="schedule" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <RadioGroup legend="Willing to work evenings?" name="evenings" options={yesNo} value={evenings} onChange={setEvenings} />
              <RadioGroup legend="Willing to work weekends?" name="weekends" options={yesNo} value={weekends} onChange={setWeekends} />
              <RadioGroup legend="Willing to work rotating shifts?" name="rotating" options={yesNo} value={rotating} onChange={setRotating} />
            </div>
          </div>
        ) : null}

        {/* STEP 3 — LANGUAGE SKILLS */}
        {step.id === "languages" ? (
          <div className="space-y-5">
            {errors.languages ? <p role="alert" className="field-error">{errors.languages}</p> : null}
            <div className="space-y-4">
              {languages.map((row, i) => (
                <div key={i} className="rounded-xl border border-navy-100 bg-navy-50/40 p-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Language" htmlFor={`lang-${i}`}>
                      <Select id={`lang-${i}`} value={row.language}
                        onChange={(e) => { updateLanguage(i, { language: e.target.value });
                          if (errors.languages) setErrors((p) => { const n = { ...p }; delete n.languages; return n; }); }}>
                        <option value="">Select…</option>
                        {siteConfig.languages.map((l) => <option key={l} value={l}>{l}</option>)}
                      </Select>
                    </Field>
                    {(["speaking", "writing", "reading"] as const).map((skill) => (
                      <Field key={skill} label={skill.charAt(0).toUpperCase() + skill.slice(1)} htmlFor={`lang-${i}-${skill}`}>
                        <Select id={`lang-${i}-${skill}`} value={row[skill]}
                          onChange={(e) => updateLanguage(i, { [skill]: e.target.value })}>
                          <option value="">Select…</option>
                          {siteConfig.proficiencyLevels.map((p) => <option key={p} value={p}>{p}</option>)}
                        </Select>
                      </Field>
                    ))}
                  </div>
                  {languages.length > 1 ? (
                    <div className="mt-3 text-right">
                      <button type="button"
                        onClick={() => setLanguages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700">
                        <Icon name="trash" className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <button type="button"
              onClick={() => setLanguages((prev) => [...prev, { language: "", speaking: "", writing: "", reading: "" }])}
              className="btn-secondary">
              <Icon name="plus" className="h-4 w-4" /> Add Another Language
            </button>
          </div>
        ) : null}

        {/* STEP 4 — WORK EXPERIENCE */}
        {step.id === "experience" ? (
          <div className="space-y-5">
            <RadioGroup legend="Do you have previous call-center or customer-support experience?"
              name="hasExperience" options={yesNo} value={hasExperience}
              onChange={(v) => {
                setHasExperience(v);
                if (v === "No") {
                  setYearsExperience("");
                  setSupportTypes([]);
                  setCrmTools("");
                  setExperienceDetails("");
                  setExperiences([{ jobTitle: "", company: "", startDate: "", endDate: "", responsibilities: "" }]);
                }
              }} />

            {hasExperience === "Yes" ? (
              <div className="space-y-5 border-l-2 border-brand-100 pl-5">
                <Field label="Total years of relevant experience" htmlFor="yearsExperience">
                  <Select id="yearsExperience" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)}>
                    <option value="">Select…</option>
                    <option>Less than 1 year</option>
                    <option>1–2 years</option>
                    <option>3–5 years</option>
                    <option>5+ years</option>
                  </Select>
                </Field>

                <CheckboxGroup legend="Type of customer support performed"
                  options={siteConfig.supportTypes as unknown as string[]} values={supportTypes} onToggle={toggleSupportType} />

                <Field label="CRM or customer-support tools previously used" htmlFor="crmTools" optional
                  hint="e.g. Zendesk, Salesforce, Freshdesk, Intercom">
                  <TextInput id="crmTools" value={crmTools} onChange={(e) => setCrmTools(e.target.value)} />
                </Field>

                <div className="space-y-4">
                  <p className="text-sm font-medium text-navy-800">Employment history</p>
                  {experiences.map((row, i) => (
                    <div key={i} className="rounded-xl border border-navy-100 bg-navy-50/40 p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Most recent job title" htmlFor={`exp-${i}-title`}>
                          <TextInput id={`exp-${i}-title`} value={row.jobTitle}
                            onChange={(e) => updateExperience(i, { jobTitle: e.target.value })} />
                        </Field>
                        <Field label="Previous company name" htmlFor={`exp-${i}-company`}>
                          <TextInput id={`exp-${i}-company`} value={row.company}
                            onChange={(e) => updateExperience(i, { company: e.target.value })} />
                        </Field>
                        <Field label="Start date" htmlFor={`exp-${i}-start`}>
                          <TextInput id={`exp-${i}-start`} type="month" value={row.startDate}
                            onChange={(e) => updateExperience(i, { startDate: e.target.value })} />
                        </Field>
                        <Field label="End date" htmlFor={`exp-${i}-end`} hint="Leave empty if current">
                          <TextInput id={`exp-${i}-end`} type="month" value={row.endDate}
                            onChange={(e) => updateExperience(i, { endDate: e.target.value })} />
                        </Field>
                      </div>
                      <Field label="Main responsibilities" htmlFor={`exp-${i}-resp`} optional className="mt-4">
                        <Textarea id={`exp-${i}-resp`} value={row.responsibilities}
                          onChange={(e) => updateExperience(i, { responsibilities: e.target.value })} />
                      </Field>
                      {experiences.length > 1 ? (
                        <div className="mt-3 text-right">
                          <button type="button"
                            onClick={() => setExperiences((prev) => prev.filter((_, idx) => idx !== i))}
                            className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700">
                            <Icon name="trash" className="h-4 w-4" /> Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setExperiences((prev) => [...prev, { jobTitle: "", company: "", startDate: "", endDate: "", responsibilities: "" }])}
                    className="btn-secondary">
                    <Icon name="plus" className="h-4 w-4" /> Add Another Employment Record
                  </button>
                </div>

                <Field label="Detailed experience" htmlFor="experienceDetails" optional
                  hint="Tell us more about your relevant experience.">
                  <Textarea id="experienceDetails" value={experienceDetails}
                    onChange={(e) => setExperienceDetails(e.target.value)} />
                </Field>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-green-100 bg-green-50/60 p-4">
                <Icon name="checkCircle" className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <p className="text-sm text-navy-700">
                  No problem — previous experience is not required. We provide full, paid training,
                  so a positive attitude and willingness to learn are what matter most.
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* STEP 5 — EDUCATION */}
        {step.id === "education" ? (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Highest level of education" htmlFor="educationLevel" optional>
                <Select id="educationLevel" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}>
                  <option value="">Select…</option>
                  {siteConfig.educationLevels.map((l) => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label="School, university, or training institution" htmlFor="institution" optional>
                <TextInput id="institution" value={institution} onChange={(e) => setInstitution(e.target.value)} />
              </Field>
              <Field label="Field of study" htmlFor="fieldOfStudy" optional>
                <TextInput id="fieldOfStudy" value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} />
              </Field>
              <Field label="Graduation year" htmlFor="graduationYear" optional>
                <TextInput id="graduationYear" inputMode="numeric" placeholder="e.g. 2022" value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)} />
              </Field>
            </div>
            <Field label="Relevant certifications" htmlFor="certifications" optional>
              <Textarea id="certifications" value={certifications} onChange={(e) => setCertifications(e.target.value)} />
            </Field>
          </div>
        ) : null}

        {/* STEP 6 — APPLICATION QUESTIONS */}
        {step.id === "questions" ? (
          <div className="space-y-5">
            {applicationQuestions.map((q, idx) => (
              <Field key={q.key} label={`${idx + 1}. ${q.label}`} htmlFor={q.key} optional>
                <Textarea id={q.key} value={answers[q.key] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))} />
              </Field>
            ))}
            <div className="grid gap-5 sm:grid-cols-2">
              <RadioGroup legend="6. Are you comfortable communicating with customers by phone?"
                name="phoneComfort" options={yesNo} value={phoneComfort} onChange={setPhoneComfort} />
              <RadioGroup legend="7. Are you comfortable working with performance targets?"
                name="targetsComfort" options={yesNo} value={targetsComfort} onChange={setTargetsComfort} />
            </div>
            <Field label="8. How did you hear about this opportunity?" htmlFor="referralSource" optional>
              <Select id="referralSource" value={referralSource} onChange={(e) => setReferralSource(e.target.value)}>
                <option value="">Select…</option>
                {siteConfig.referralSources.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="9. Is there anything else you would like us to know?" htmlFor="anythingElse" optional>
              <Textarea id="anythingElse" value={anythingElse} onChange={(e) => setAnythingElse(e.target.value)} />
            </Field>
          </div>
        ) : null}

        {/* STEP 7 — CV AND DOCUMENTS */}
        {step.id === "documents" ? (
          <div className="space-y-5">
            <p className="text-sm text-navy-500">
              A CV is optional — you can apply without one. Documents are sent securely to our
              recruitment team.
            </p>
            <FileUploader label="CV / Résumé" optional onChange={setCv} />
            <FileUploader label="Cover letter" optional onChange={setCoverLetter} />
            <FileUploader label="Supporting certificate" optional onChange={setCertificate} />
          </div>
        ) : null}

        {/* STEP 8 — REVIEW & CONSENT */}
        {step.id === "review" ? (
          <div className="space-y-6">
            {/* Quick summary of key details */}
            <div className="rounded-xl border border-navy-100 bg-navy-50/40 p-5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-navy-900">Your details</h4>
                <button type="button" onClick={() => goToStep(0)}
                  className="text-sm font-medium text-brand-700 hover:text-brand-800">
                  Edit
                </button>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <ReviewItem label="Name" value={[firstName, lastName].filter(Boolean).join(" ")} />
                <ReviewItem label="Email" value={email} />
                <ReviewItem label="Phone" value={phone} />
                <ReviewItem label="Location" value={[city, country].filter(Boolean).join(", ")} />
                <ReviewItem label="Position" value={position} />
                <ReviewItem
                  label="Languages"
                  value={languages.filter((l) => l.language.trim()).map((l) => l.language).join(", ")}
                />
                <ReviewItem label="CV attached" value={cv ? cv.name : "Not attached"} />
              </dl>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-navy-900">Consent and declaration</h4>
              <Checkbox checked={confirmAccurate} required error={errors.confirmAccurate}
                onChange={setField(setConfirmAccurate, "confirmAccurate")}>
                I confirm that the information provided in this application is accurate and complete.
              </Checkbox>
              <Checkbox checked={agreePrivacy} required error={errors.agreePrivacy}
                onChange={setField(setAgreePrivacy, "agreePrivacy")}>
                I have read and agree to the{" "}
                <Link href="/privacy-policy" target="_blank" className="font-medium text-brand-700 underline">Privacy Policy</Link>.
              </Checkbox>
              <Checkbox checked={consentProcessing} required error={errors.consentProcessing}
                onChange={setField(setConsentProcessing, "consentProcessing")}>
                I consent to the processing of my personal information for recruitment purposes, as
                described in the{" "}
                <Link href="/applicant-privacy" target="_blank" className="font-medium text-brand-700 underline">Applicant Privacy Notice</Link>.
              </Checkbox>
              <Checkbox checked={understandNoGuarantee} required error={errors.understandNoGuarantee}
                onChange={setField(setUnderstandNoGuarantee, "understandNoGuarantee")}>
                I understand that submitting an application does not guarantee employment.
              </Checkbox>
              <Checkbox checked={marketingOptIn} onChange={setMarketingOptIn}>
                I agree to receive future job opportunities and recruitment updates. (Optional)
              </Checkbox>
            </div>
          </div>
        ) : null}
      </div>

      {/* ---------- WIZARD NAVIGATION ---------- */}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-navy-100 pt-6">
        <button
          type="button"
          onClick={handleBack}
          disabled={current === 0}
          className={`btn-secondary ${current === 0 ? "invisible" : ""}`}
        >
          <Icon name="arrowRight" className="h-4 w-4 rotate-180" /> Back
        </button>

        <span className="hidden text-sm text-navy-400 sm:block">
          {current + 1} / {STEPS.length}
        </span>

        {isLastStep ? (
          <button type="submit" disabled={status === "submitting"} className="btn-primary sm:px-10">
            {status === "submitting" ? "Submitting…" : "Submit Application"}
            {status !== "submitting" ? <Icon name="check" className="h-4 w-4" /> : null}
          </button>
        ) : (
          <button type="submit" className="btn-primary sm:px-10">
            Next <Icon name="arrowRight" className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
}

/** Small labelled value used in the review summary. */
function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className="mt-0.5 text-navy-800">{value || "—"}</dd>
    </div>
  );
}
