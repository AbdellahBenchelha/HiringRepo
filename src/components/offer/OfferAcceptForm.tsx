"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Field, TextInput, Textarea } from "@/components/forms/fields";
import { CountrySelect } from "@/components/forms/CountrySelect";
import { PhoneInput } from "@/components/forms/PhoneInput";
import { DateSelect } from "@/components/forms/DateSelect";
import { ENGAGED_AS, validateConfirmed, type EngagedAs } from "@/lib/hiring";

/**
 * Accepting an offer, and correcting the record while doing it.
 *
 * Everything is pre-filled from what the candidate told us when they applied.
 * That is the point: an application is filled in to get past a form, so the
 * address may be "-" and the surname may be an initial. Asking them to retype
 * it all invites the same shortcuts a second time; showing what we hold and
 * asking them to fix it does not.
 *
 * Accepting is one deliberate act — the terms are in view, the tick is
 * explicit, and only submitting this form records anything. Following the link
 * from the email does nothing on its own, because mail scanners follow links.
 */

export interface OfferAcceptFormProps {
  token: string;
  /** Read-only: the link was sent here, and changing it mid-acceptance is a mistake. */
  email: string;
  /** Whatever is on file, used as the starting point. */
  initial: {
    firstName: string;
    lastName: string;
    dob: string;
    phone: string;
    country: string;
    city: string;
    address: string;
  };
  /** Open on the decline panel, for the "let us know" link in the email. */
  declineFirst?: boolean;
}

type Outcome = "accepted" | "declined";

export function OfferAcceptForm({ token, email, initial, declineFirst }: OfferAcceptFormProps) {
  const [engagedAs, setEngagedAs] = useState<EngagedAs>("Individual");
  const [companyName, setCompanyName] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [companyVat, setCompanyVat] = useState("");

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [dob, setDob] = useState(initial.dob);
  const [nationality, setNationality] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState(initial.phone);
  const [country, setCountry] = useState(initial.country);
  const [city, setCity] = useState(initial.city);
  const [address, setAddress] = useState(initial.address);
  const [postcode, setPostcode] = useState("");

  const [agreed, setAgreed] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const [declining, setDeclining] = useState(!!declineFirst);
  const [declineReason, setDeclineReason] = useState("");

  function details() {
    return {
      engagedAs, companyName, companyNumber, companyVat,
      firstName, lastName, dob, nationality, idNumber,
      phone, country, city, address, postcode,
    };
  }

  async function submit() {
    if (busy) return;
    setFailed("");

    // Checked here so the candidate is told before a round trip; checked again
    // on the server, because a browser check is a courtesy, not a control.
    const check = validateConfirmed(details());
    const found = check.ok ? [] : check.problems;
    if (!agreed) found.push("Please tick the box to confirm you accept the offer.");
    setProblems(found);
    if (found.length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/offer/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "accept", details: details() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; problems?: string[] };
      if (data.ok) {
        setOutcome("accepted");
      } else if (data.problems?.length) {
        setProblems(data.problems);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setFailed(messageFor(data.error));
      }
    } catch {
      setFailed("We could not reach the server. Please check your connection and try again.");
    }
    setBusy(false);
  }

  async function decline() {
    if (busy) return;
    setBusy(true);
    setFailed("");
    try {
      const res = await fetch("/api/offer/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "decline", reason: declineReason }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) setOutcome("declined");
      else setFailed(messageFor(data.error));
    } catch {
      setFailed("We could not reach the server. Please check your connection and try again.");
    }
    setBusy(false);
  }

  if (outcome === "accepted") {
    return (
      <Done
        icon="checkCircle"
        tone="green"
        title="Thank you — your acceptance is confirmed"
        body="We have everything we need. Our recruitment team will prepare your written agreement and send it to you for signature, along with everything you need for your first day."
      />
    );
  }

  if (outcome === "declined") {
    return (
      <Done
        icon="close"
        tone="navy"
        title="Thank you for letting us know"
        body="We are sorry it did not work out this time. Your application has been closed, and you are very welcome to apply again in the future."
      />
    );
  }

  return (
    <div className="space-y-6">
      {problems.length > 0 ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-800">Please check the following:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {failed ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {failed}
        </div>
      ) : null}

      {declining ? (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy-900">Decline this offer</h2>
          <p className="mt-2 text-sm text-navy-600">
            If you have decided not to take up this offer, let us know below. Telling us why is
            entirely optional, but it helps us improve.
          </p>
          <Field label="Reason" htmlFor="reason" optional className="mt-4">
            <Textarea
              id="reason"
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. I have accepted another role"
              maxLength={300}
            />
          </Field>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void decline()}
              disabled={busy}
              className="rounded-full bg-navy-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Decline the offer"}
            </button>
            <button
              type="button"
              onClick={() => setDeclining(false)}
              className="rounded-full border border-navy-200 px-5 py-2.5 text-sm font-bold text-navy-700 transition hover:bg-navy-50"
            >
              Back to the offer
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card p-6">
            <h2 className="text-lg font-bold text-navy-900">
              Are you joining as an individual or through a company?
            </h2>
            <p className="mt-1 text-sm text-navy-500">
              This decides whose name the agreement and invoices are in.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {ENGAGED_AS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setEngagedAs(option)}
                  aria-pressed={engagedAs === option}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    engagedAs === option
                      ? "border-brand-500 bg-brand-50"
                      : "border-navy-200 hover:border-navy-300"
                  }`}
                >
                  <span className="block text-sm font-bold text-navy-900">{option}</span>
                  <span className="mt-0.5 block text-xs text-navy-500">
                    {option === "Individual"
                      ? "You are contracting in your own name."
                      : "You invoice through a registered company."}
                  </span>
                </button>
              ))}
            </div>

            {engagedAs === "Company" ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Company name" htmlFor="companyName" required>
                  <TextInput
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    autoComplete="organization"
                  />
                </Field>
                <Field label="Company registration number" htmlFor="companyNumber" required>
                  <TextInput
                    id="companyNumber"
                    value={companyNumber}
                    onChange={(e) => setCompanyNumber(e.target.value)}
                  />
                </Field>
                <Field
                  label="VAT / tax number"
                  htmlFor="companyVat"
                  optional
                  hint="Only if your company is registered for VAT or an equivalent tax."
                  className="sm:col-span-2"
                >
                  <TextInput
                    id="companyVat"
                    value={companyVat}
                    onChange={(e) => setCompanyVat(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold text-navy-900">Your details</h2>
            <p className="mt-1 text-sm text-navy-500">
              These are the details we hold from your application. Please correct anything that is
              wrong or out of date — they will be used to draw up your agreement.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="firstName" required>
                <TextInput
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Last name" htmlFor="lastName" required>
                <TextInput
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </Field>

              <Field label="Date of birth" htmlFor="dob" required className="sm:col-span-2">
                <DateSelect id="dob" value={dob} onChange={setDob} />
              </Field>

              <Field
                label="Nationality"
                htmlFor="nationality"
                required
                hint="As shown on your passport or national ID."
              >
                <CountrySelect
                  id="nationality"
                  value={nationality}
                  onChange={setNationality}
                  placeholder="Select your nationality"
                />
              </Field>
              <Field
                label="ID or passport number"
                htmlFor="idNumber"
                required
                hint="Exactly as written on the document."
              >
                <TextInput
                  id="idNumber"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </Field>

              <Field label="Phone number" htmlFor="phone" required>
                <PhoneInput id="phone" value={phone} onChange={setPhone} />
              </Field>
              <Field label="Email address" htmlFor="email" hint="Contact us if this is wrong.">
                <TextInput id="email" value={email} readOnly disabled />
              </Field>

              <Field
                label="Country you live in"
                htmlFor="country"
                required
                hint="Where you are actually resident, which may differ from your nationality."
              >
                <CountrySelect id="country" value={country} onChange={setCountry} />
              </Field>
              <Field label="City" htmlFor="city" required>
                <TextInput
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoComplete="address-level2"
                />
              </Field>

              <Field label="Full address" htmlFor="address" required className="sm:col-span-2">
                <TextInput
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, building and number"
                  autoComplete="street-address"
                />
              </Field>
              <Field label="Postcode / ZIP code" htmlFor="postcode" required>
                <TextInput
                  id="postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  autoComplete="postal-code"
                />
              </Field>
            </div>
          </div>

          <div className="card p-6">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-navy-300 text-brand-600"
              />
              <span className="text-sm text-navy-700">
                I accept the offer on the terms shown above, and I confirm that the details I have
                given here are true and correct.
              </span>
            </label>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-green-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                <Icon name="checkCircle" className="h-4 w-4" />
                {busy ? "Confirming…" : "Confirm and accept"}
              </button>
              <button
                type="button"
                onClick={() => setDeclining(true)}
                className="text-sm font-semibold text-navy-500 underline transition hover:text-navy-700"
              >
                I need to decline this offer
              </button>
            </div>

            <p className="mt-4 text-xs text-navy-400">
              We will never ask you for a payment, a bank card, or a password. Your bank details
              are needed only after your written agreement has been signed.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function messageFor(error?: string): string {
  switch (error) {
    case "already_answered":
      return "This offer has already been answered. If that was not you, please contact our recruitment team.";
    case "superseded":
      return "This link belongs to an earlier version of your offer. Please use the link in the most recent email we sent you.";
    case "expired":
      return "This link has expired. Please contact our recruitment team and we will send you a new one.";
    case "invalid":
      return "This link is not valid. Please use the link exactly as it appears in your offer email.";
    case "no_offer":
      return "We could not find an offer for this link. Please contact our recruitment team.";
    default:
      return "Something went wrong and your answer was not saved. Please try again, or contact our recruitment team.";
  }
}

function Done({
  icon,
  tone,
  title,
  body,
}: {
  icon: "checkCircle" | "close";
  tone: "green" | "navy";
  title: string;
  body: string;
}) {
  return (
    <div className="card p-8 text-center">
      <span
        className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${
          tone === "green" ? "bg-green-100 text-green-700" : "bg-navy-100 text-navy-600"
        }`}
      >
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-xl font-bold text-navy-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-600">{body}</p>
    </div>
  );
}
