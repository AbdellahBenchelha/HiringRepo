"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { jobs } from "@/config/jobs";
import { isValidEmail, isValidPhone, isValidUrl } from "@/lib/validation";
import { submitApplication } from "@/lib/submit";
import { Icon } from "@/components/Icon";
import { FileUploader } from "./FileUploader";
import {
  Checkbox,
  CheckboxGroup,
  Field,
  FormSection,
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

export function ApplicationForm({ initialPosition, onSubmitted }: ApplicationFormProps) {
  const positionOptions = useMemo(() => jobs.map((j) => j.title), []);

  // ---- Personal information ----
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [preferredContact, setPreferredContact] = useState("Email");
  const [linkedin, setLinkedin] = useState("");

  // ---- Position information ----
  const [position, setPosition] = useState(
    initialPosition && positionOptions.includes(initialPosition) ? initialPosition : ""
  );
  const [workArrangement, setWorkArrangement] = useState("No preference");
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
  const [salaryExpectations, setSalaryExpectations] = useState("");
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
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState<string>("");
  const [isDemo, setIsDemo] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

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

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required.";
    if (!lastName.trim()) e.lastName = "Last name is required.";
    if (!email.trim()) e.email = "Email address is required.";
    else if (!isValidEmail(email)) e.email = "Please enter a valid email address.";
    if (!phone.trim()) e.phone = "Phone number is required.";
    else if (!isValidPhone(phone)) e.phone = "Please enter a valid phone number with country code.";
    if (!country.trim()) e.country = "Country is required.";
    if (!city.trim()) e.city = "City is required.";
    if (linkedin && !isValidUrl(linkedin)) e.linkedin = "Please enter a valid URL (https://…).";
    if (!position) e.position = "Please select the position you are applying for.";

    // At least one language with a name.
    if (!languages.some((l) => l.language.trim())) {
      e.languages = "Please add at least one language.";
    }

    if (!confirmAccurate) e.confirmAccurate = "Please confirm your information is accurate.";
    if (!agreePrivacy) e.agreePrivacy = "Please agree to the Privacy Policy to continue.";
    if (!consentProcessing) e.consentProcessing = "Your consent is required to process the application.";
    if (!understandNoGuarantee) e.understandNoGuarantee = "Please acknowledge this statement.";

    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (status === "submitting") return;

    // Honeypot: if filled, silently treat as spam (pretend success, send nothing).
    if (honeypotRef.current?.value) {
      setStatus("success");
      setIsDemo(siteConfig.demoMode);
      return;
    }

    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setStatus("error");
      setSubmitMessage("Please correct the highlighted fields and try again.");
      window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    setStatus("submitting");
    setSubmitMessage("");

    const fd = new FormData();
    const data = {
      firstName, lastName, email, phone, country, city, address, dob,
      preferredContact, linkedin, position, workArrangement, employmentType,
      startDate, schedule, evenings, weekends, rotating,
      languages, hasExperience, yearsExperience, supportTypes, crmTools,
      experienceDetails, experiences, educationLevel, institution, fieldOfStudy,
      graduationYear, certifications, ...answers, phoneComfort, targetsComfort,
      salaryExpectations, referralSource, anythingElse,
      consent: { confirmAccurate, agreePrivacy, consentProcessing, understandNoGuarantee, marketingOptIn },
    };
    fd.append("application", JSON.stringify(data));
    if (cv) fd.append("cv", cv);
    if (coverLetter) fd.append("coverLetter", coverLetter);
    if (certificate) fd.append("certificate", certificate);

    try {
      const result = await submitApplication(fd);
      if (result.ok) {
        setStatus("success");
        setIsDemo(result.demo);
        onSubmitted?.();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setStatus("error");
        setSubmitMessage(result.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setSubmitMessage("A network error occurred. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-xl py-8 text-center" role="status" aria-live="polite">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Icon name="checkCircle" className="h-9 w-9 text-green-600" />
        </div>
        <h3 className="mt-6 text-2xl font-semibold">Application Submitted Successfully</h3>
        {isDemo ? (
          <p className="mx-auto mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Demonstration mode — this was a TEST submission. No data was sent.
          </p>
        ) : null}
        <p className="mt-4 leading-relaxed text-navy-600">
          Thank you for applying to {siteConfig.company.name}. Our recruitment team will review your
          application. Candidates whose qualifications match our current requirements may be
          contacted for the next stage.
        </p>
      </div>
    );
  }

  const errorList = Object.entries(errors);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {status === "error" && errorList.length > 0 ? (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p className="font-semibold text-red-800">Please review the following:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
            {errorList.map(([key, msg]) => (
              <li key={key}>{msg}</li>
            ))}
          </ul>
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

      {/* PERSONAL INFORMATION */}
      <FormSection title="Personal Information">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" htmlFor="firstName" required error={errors.firstName}>
            <TextInput id="firstName" value={firstName} autoComplete="given-name"
              onChange={(e) => setField(setFirstName, "firstName")(e.target.value)} error={errors.firstName} />
          </Field>
          <Field label="Last name" htmlFor="lastName" required error={errors.lastName}>
            <TextInput id="lastName" value={lastName} autoComplete="family-name"
              onChange={(e) => setField(setLastName, "lastName")(e.target.value)} error={errors.lastName} />
          </Field>
          <Field label="Email address" htmlFor="email" required error={errors.email}>
            <TextInput id="email" type="email" inputMode="email" value={email} autoComplete="email"
              onChange={(e) => setField(setEmail, "email")(e.target.value)} error={errors.email} />
          </Field>
          <Field label="Phone number (with country code)" htmlFor="phone" required error={errors.phone}>
            <TextInput id="phone" type="tel" inputMode="tel" placeholder="+1 555 000 0000" value={phone}
              autoComplete="tel" onChange={(e) => setField(setPhone, "phone")(e.target.value)} error={errors.phone} />
          </Field>
          <Field label="Country" htmlFor="country" required error={errors.country}>
            <TextInput id="country" value={country} autoComplete="country-name"
              onChange={(e) => setField(setCountry, "country")(e.target.value)} error={errors.country} />
          </Field>
          <Field label="City" htmlFor="city" required error={errors.city}>
            <TextInput id="city" value={city} autoComplete="address-level2"
              onChange={(e) => setField(setCity, "city")(e.target.value)} error={errors.city} />
          </Field>
          <Field label="Full address" htmlFor="address" hint="Optional" className="sm:col-span-2">
            <TextInput id="address" value={address} autoComplete="street-address"
              onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field label="Date of birth" htmlFor="dob" hint="Optional">
            <TextInput id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </Field>
          <Field label="Preferred contact method" htmlFor="preferredContact">
            <Select id="preferredContact" value={preferredContact}
              onChange={(e) => setPreferredContact(e.target.value)}>
              <option>Email</option>
              <option>Phone</option>
              <option>Either</option>
            </Select>
          </Field>
          <Field label="LinkedIn profile" htmlFor="linkedin" hint="Optional" error={errors.linkedin} className="sm:col-span-2">
            <TextInput id="linkedin" type="url" placeholder="https://www.linkedin.com/in/…" value={linkedin}
              onChange={(e) => setField(setLinkedin, "linkedin")(e.target.value)} error={errors.linkedin} />
          </Field>
        </div>
      </FormSection>

      {/* POSITION INFORMATION */}
      <FormSection title="Position Information">
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
          <RadioGroup legend="Preferred work arrangement" name="workArrangement"
            options={siteConfig.workArrangements as unknown as string[]} value={workArrangement}
            onChange={setWorkArrangement} />
          <RadioGroup legend="Employment preference" name="employmentType"
            options={siteConfig.employmentTypes as unknown as string[]} value={employmentType}
            onChange={setEmploymentType} />
          <Field label="Available starting date" htmlFor="startDate">
            <TextInput id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Preferred working schedule" htmlFor="schedule" hint="e.g. mornings, afternoons, full days">
            <TextInput id="schedule" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <RadioGroup legend="Willing to work evenings?" name="evenings" options={yesNo} value={evenings} onChange={setEvenings} />
          <RadioGroup legend="Willing to work weekends?" name="weekends" options={yesNo} value={weekends} onChange={setWeekends} />
          <RadioGroup legend="Willing to work rotating shifts?" name="rotating" options={yesNo} value={rotating} onChange={setRotating} />
        </div>
      </FormSection>

      {/* LANGUAGE SKILLS */}
      <FormSection title="Language Skills" description="Add every language you speak and your proficiency in each.">
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
      </FormSection>

      {/* WORK EXPERIENCE */}
      <FormSection title="Work Experience">
        <div className="grid gap-5 sm:grid-cols-2">
          <RadioGroup legend="Do you have previous call-center or customer-support experience?"
            name="hasExperience" options={yesNo} value={hasExperience} onChange={setHasExperience} />
          <Field label="Total years of relevant experience" htmlFor="yearsExperience">
            <Select id="yearsExperience" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)}>
              <option value="">Select…</option>
              <option>None</option>
              <option>Less than 1 year</option>
              <option>1–2 years</option>
              <option>3–5 years</option>
              <option>5+ years</option>
            </Select>
          </Field>
        </div>

        <CheckboxGroup legend="Type of customer support performed"
          options={siteConfig.supportTypes as unknown as string[]} values={supportTypes} onToggle={toggleSupportType} />

        <Field label="CRM or customer-support tools previously used" htmlFor="crmTools"
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
              <Field label="Main responsibilities" htmlFor={`exp-${i}-resp`} className="mt-4">
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

        <Field label="Detailed experience" htmlFor="experienceDetails"
          hint="Tell us more about your relevant experience.">
          <Textarea id="experienceDetails" value={experienceDetails}
            onChange={(e) => setExperienceDetails(e.target.value)} />
        </Field>
      </FormSection>

      {/* EDUCATION */}
      <FormSection title="Education">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Highest level of education" htmlFor="educationLevel">
            <Select id="educationLevel" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}>
              <option value="">Select…</option>
              {siteConfig.educationLevels.map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
          </Field>
          <Field label="School, university, or training institution" htmlFor="institution">
            <TextInput id="institution" value={institution} onChange={(e) => setInstitution(e.target.value)} />
          </Field>
          <Field label="Field of study" htmlFor="fieldOfStudy">
            <TextInput id="fieldOfStudy" value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} />
          </Field>
          <Field label="Graduation year" htmlFor="graduationYear">
            <TextInput id="graduationYear" inputMode="numeric" placeholder="e.g. 2022" value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)} />
          </Field>
        </div>
        <Field label="Relevant certifications" htmlFor="certifications" hint="Optional">
          <Textarea id="certifications" value={certifications} onChange={(e) => setCertifications(e.target.value)} />
        </Field>
      </FormSection>

      {/* APPLICATION QUESTIONS */}
      <FormSection title="Application Questions">
        {applicationQuestions.map((q, idx) => (
          <Field key={q.key} label={`${idx + 1}. ${q.label}`} htmlFor={q.key}>
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
        <Field label="8. What are your salary expectations?" htmlFor="salaryExpectations"
          hint="Optional — you may provide a range or write 'negotiable'.">
          <TextInput id="salaryExpectations" value={salaryExpectations}
            onChange={(e) => setSalaryExpectations(e.target.value)} />
        </Field>
        <Field label="9. How did you hear about this opportunity?" htmlFor="referralSource">
          <Select id="referralSource" value={referralSource} onChange={(e) => setReferralSource(e.target.value)}>
            <option value="">Select…</option>
            {siteConfig.referralSources.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="10. Is there anything else you would like us to know?" htmlFor="anythingElse">
          <Textarea id="anythingElse" value={anythingElse} onChange={(e) => setAnythingElse(e.target.value)} />
        </Field>
      </FormSection>

      {/* CV AND DOCUMENTS */}
      <FormSection title="CV and Documents"
        description="A CV is optional — you can apply without one. Documents are sent securely to our recruitment team.">
        <FileUploader label="CV / Résumé" optional onChange={setCv} />
        <FileUploader label="Cover letter" optional onChange={setCoverLetter} />
        <FileUploader label="Supporting certificate" optional onChange={setCertificate} />
      </FormSection>

      {/* CONSENT AND DECLARATION */}
      <FormSection title="Consent and Declaration">
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
      </FormSection>

      {status === "error" && submitMessage ? (
        <p role="alert" className="text-sm font-medium text-red-600">{submitMessage}</p>
      ) : null}

      {siteConfig.demoMode ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>Demonstration mode:</strong> this form is not connected to a backend. Submitting
          will show a confirmation but will <strong>not</strong> transmit or store any data.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button type="submit" disabled={status === "submitting"} className="btn-primary sm:px-10">
          {status === "submitting" ? "Submitting…" : "Submit Application"}
          {status !== "submitting" ? <Icon name="arrowRight" className="h-4 w-4" /> : null}
        </button>
      </div>
    </form>
  );
}
