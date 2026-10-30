"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { teamPost } from "@/lib/teamClient";

/**
 * The welcome tour: one short card per part of the portal.
 *
 * Opens by itself the first time a member reaches a portal page after
 * choosing their password, and never again once finished or closed — the
 * Guide button in the header brings it back whenever they want it.
 */

const CLOSED_KEY = "wr-tour-closed";

type Step = { icon: IconName; title: string; body: string; href?: string; link?: string };

function stepsFor(firstName: string, workEmail: string | undefined, startDate: string, activated: boolean): Step[] {
  return [
    {
      icon: "sparkles",
      title: `Welcome to WorkRoute, ${firstName}!`,
      body: `This is your team portal — everything for your work is here. Your work starts on ${startDate}.${
        activated ? "" : " First, add your bank details: your account is activated once we approve them."
      } This short tour shows you where things are. It takes about a minute.`,
    },
    {
      icon: "chartBar",
      title: "Dashboard",
      body: "Your hours and earnings, added automatically after each work day, and your next payday. Start with the “Get started” list on this page and finish every step.",
      href: "/",
      link: "Open Dashboard",
    },
    {
      icon: "mail",
      title: "Mail",
      body: `Your professional mailbox${workEmail ? `, ${workEmail}` : ""}. Use it for all work emails: read, reply, forward and write new ones. Please check it every work day.`,
      href: "/mail",
      link: "Open Mail",
    },
    {
      icon: "chatDots",
      title: "Tickets",
      body: "How you talk to us. We send you tasks and messages here, and you can open a New ticket for any question or problem. The answer comes in the same ticket.",
      href: "/tickets",
      link: "Open Tickets",
    },
    {
      icon: "phone",
      title: "Phone",
      body: "Your WorkRoute work phone number and the messages it receives. Use this number for work only.",
      href: "/phone",
      link: "Open Phone",
    },
    {
      icon: "wallet",
      title: "Bank details",
      body: `${
        activated ? "" : "Required to activate your account. "
      }Add the account your earnings are paid to: the account holder name, IBAN and BIC. We check it and email you when it is approved${
        activated ? "" : " — your account is active from then, and your hours are counted"
      }. Never send bank or card details by chat or email.`,
      href: "/bank",
      link: "Add bank details",
    },
    {
      icon: "user",
      title: "Profile and documents",
      body: "Profile has your details and work schedule, and is where you change your password. Documents has your offer, your monthly statements and the files we share with you. Forgot your password? Email us — nobody from WorkRoute will ever ask you for it.",
      href: "/profile",
      link: "Open Profile",
    },
  ];
}

export function PortalTour({
  autoOpen,
  firstName,
  workEmail,
  startDate,
  activated,
}: {
  autoOpen: boolean;
  firstName: string;
  workEmail?: string;
  /** "Monday, 9 November 2026". */
  startDate: string;
  activated: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const recorded = useRef(!autoOpen);
  const dialog = useRef<HTMLDivElement>(null);
  const steps = stepsFor(firstName || "there", workEmail, startDate, activated);
  const step = steps[i];
  const last = i === steps.length - 1;

  useEffect(() => {
    // Closed a moment ago and the save not landed yet: do not open it again.
    let closedHere = false;
    try {
      closedHere = sessionStorage.getItem(CLOSED_KEY) === "1";
    } catch {
      /* storage unavailable: the server's answer decides */
    }
    if (autoOpen && !closedHere) setOpen(true);
  }, [autoOpen]);

  useEffect(() => {
    if (!open) return;
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function close() {
    setOpen(false);
    // Once is enough: finished or closed, it does not open by itself again.
    if (!recorded.current) {
      recorded.current = true;
      try {
        sessionStorage.setItem(CLOSED_KEY, "1");
      } catch {
        /* not remembered here; the server still records it */
      }
      void teamPost("/api/team/account", { action: "tour_done" }, { keepalive: true }).catch(() => {});
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setI(0);
          setOpen(true);
        }}
        data-tour-open
        title="A short tour of the portal"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-navy-600 hover:bg-cream-200 hover:text-navy-900"
      >
        <Icon name="question" className="h-4 w-4" />
        <span className="hidden sm:inline">Guide</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/50 p-4 backdrop-blur-sm sm:items-center" onClick={close}>
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            tabIndex={-1}
            data-tour-step={i + 1}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl outline-none"
          >
            <div className="relative bg-navy-900 px-6 pb-6 pt-5 text-white">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/20 blur-2xl" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-300">
                  Portal guide · {i + 1} of {steps.length}
                </span>
                <button type="button" onClick={close} aria-label="Close the guide" className="rounded-lg p-1.5 text-navy-200 hover:bg-white/10 hover:text-white">
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
              <span className="mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-navy-900">
                <Icon name={step.icon} className="h-6 w-6" />
              </span>
              <h2 id="tour-title" className="mt-3 font-display text-xl font-extrabold leading-tight text-white">
                {step.title}
              </h2>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-relaxed text-navy-700">{step.body}</p>
              {step.href && step.link ? (
                <Link href={step.href} onClick={close} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                  {step.link} <Icon name="arrowRight" className="h-3.5 w-3.5" />
                </Link>
              ) : null}

              <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
                {steps.map((_, n) => (
                  <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-brand-500" : "w-1.5 bg-cream-300"}`} />
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                {i === 0 ? (
                  <button type="button" onClick={close} className="text-sm font-semibold text-navy-500 hover:text-navy-900" data-tour-skip>
                    Skip tour
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setI((n) => n - 1)}
                    className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-navy-600 hover:bg-cream-200"
                  >
                    <Icon name="chevronLeft" className="h-4 w-4" /> Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => (last ? close() : setI((n) => n + 1))}
                  data-tour-next={last ? "finish" : "next"}
                  className="btn-primary !px-5 !py-2.5 text-sm"
                >
                  {last ? "Finish" : i === 0 ? "Start the tour" : "Next"}
                  {last ? null : <Icon name="chevronRight" className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
