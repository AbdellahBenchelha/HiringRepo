import { Icon } from "@/components/Icon";

/**
 * What happens between accepting and being sent an agreement.
 *
 * Written once and shown at every point somebody might be standing: before
 * they accept, on the screen straight after they accept, and when they come
 * back to a link they have already answered.
 *
 * The reason it exists is the quiet stretch in the middle. Somebody who has
 * just accepted a remote job and photographed their passport, and then hears
 * nothing for two days, does not conclude that we are busy — they conclude
 * they have been had. Naming the next step turns that silence into a wait.
 */

const STEPS: { title: string; body: string }[] = [
  {
    title: "You accept this offer",
    body: "You confirm your details and the hours you are available, and we record your acceptance.",
  },
  {
    title: "You confirm your identity",
    body: "A photograph of your passport, national identity card or driver's licence, and one of you holding it. About a minute from a phone.",
  },
  {
    // Named for the thing that happens to them, not for the work we do. "Our
    // team reviews your file" describes our afternoon; this describes their
    // next appointment, which is what somebody reading a list of steps is
    // looking for.
    title: "A short video interview",
    body: "Our team checks everything is in order, then emails you a date and time with a Google Meet link. It is a short conversation, not another test.",
  },
  {
    title: "Your written agreement",
    body: "After the video interview we send your agreement for signature, with everything you need for your first day.",
  },
];

export function NextSteps({ className = "" }: { className?: string }) {
  return (
    <div className={`card p-6 ${className}`}>
      <h2 className="text-lg font-bold text-navy-900">What happens next</h2>
      <ol className="mt-4 space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-navy-900">{step.title}</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-navy-600">
                {step.body}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-5 flex items-start gap-2 rounded-xl bg-cream-100 p-3.5 text-xs leading-relaxed text-navy-600">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
        <span>
          We will never ask you for a payment, a bank card or a password at any stage. Your bank
          details are needed only after your agreement has been signed.
        </span>
      </p>
    </div>
  );
}
