import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { readLiveVerifyToken } from "@/lib/token";
import { getCandidate } from "@/lib/store";
import { siteConfig } from "@/config/site";
import { Icon } from "@/components/Icon";
import { LiveVerifyStart } from "@/components/verify/LiveVerifyStart";

/**
 * Where a candidate starts their live identity check.
 *
 * Our page, not the provider's, for two reasons. A message asking somebody to
 * photograph their passport, whose only link goes to a domain they have never
 * heard of, is indistinguishable from the scam it is not — so the link in the
 * email is ours, and the handover happens after we have explained it. And the
 * open can be counted, which is the difference between a candidate who is
 * hesitating and one whose email never arrived.
 *
 * It never redirects on its own. An automatic hop to a third party is exactly
 * what a fraudulent link does, it takes the choice away from the person we are
 * asking to trust us, and it breaks the back button on the way.
 *
 * What it shows depends on the device, and shows only that: a button on a
 * phone, a QR code on a computer. Offering both with advice about which to use
 * puts the decision on the candidate — and the wrong choice ends at a camera
 * step that cannot be finished, which means starting again.
 */

/**
 * Is this a phone or a tablet?
 *
 * Read from the user agent so the first paint is already right, then checked
 * again in the browser against what the device can actually do. Neither test
 * is perfect; together they are wrong rarely, and the browser gets the last
 * word because it is the one that knows about the pointer.
 */
function looksMobile(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(
    userAgent,
  );
}

export const metadata: Metadata = {
  title: "Confirm your identity",
  robots: { index: false, follow: false },
};

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function LiveVerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = one(params.t);
  const read = readLiveVerifyToken(token);

  if (!read.ok) {
    return (
      <Shell>
        <Notice
          title={read.reason === "expired" ? "This link has expired" : "This link is not valid"}
          body={
            read.reason === "expired"
              ? "Verification links are usable for 14 days. Reply to the email we sent you and we will send a new one straight away."
              : "Please use the link exactly as it appears in the email we sent you. If you copied it by hand, a character may have been missed."
          }
        />
      </Shell>
    );
  }

  const candidate = await getCandidate(read.link.id);
  const url = candidate?.liveVerificationUrl;

  // The link lives on the record, not in the token: a URL long enough to be
  // signed into a token would be unusable, and this way a re-sent check
  // replaces the destination for a link already in their inbox.
  if (!candidate || !url || candidate.liveVerificationSentAt !== read.link.sentAt) {
    return (
      <Shell>
        <Notice
          title="This link is no longer current"
          body="We have sent you a newer verification link. Please use the most recent email from us, or reply to it and we will help."
        />
      </Shell>
    );
  }

  // Drawn here, on the server, rather than fetched from a chart service: the
  // link is personal to this candidate and there is no reason for anybody else
  // to see it.
  const qr = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 220,
    color: { dark: "#0f1035", light: "#ffffff" },
  });

  const name = candidate.firstName || "";
  const mobile = looksMobile((await headers()).get("user-agent") ?? "");

  return (
    <Shell>
      <div className="card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
          Identity check
        </p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900">
          {mobile
            ? name
              ? `${name}, this takes about two minutes`
              : "This takes about two minutes"
            : "Continue on your phone"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-600">
          {mobile
            ? "The photographs you sent were not clear enough to complete your identity check. This way is quicker — you will be guided step by step, and there is nothing to install and nothing to fill in."
            : "The photographs you sent were not clear enough to complete your identity check. The quickest way to finish it uses your phone camera, so scan this code and it will carry on there."}
        </p>

        {/* The one control that works on this device, and only that one. On a
            computer there is no button at all: pressing one would lead to a
            camera step that cannot be finished, and starting again is worse
            than never having started. */}
        <div className="mt-7">
          <LiveVerifyStart
            token={token ?? ""}
            url={url}
            qrSvg={qr}
            serverIsMobile={mobile}
          />
        </div>

        <div className="mt-8 rounded-xl bg-cream-100 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-navy-700">What happens</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-navy-600">
            {[
              "You photograph your identity document, guided step by step.",
              "You take a short live selfie, so we can see it is really you.",
              "Our recruitment team reviews it and lets you know.",
            ].map((line) => (
              <li key={line} className="flex gap-2.5">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-navy-500">
          <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          <span>
            We will never ask you for a payment, a bank card or a password at any stage. This link
            is personal to you — please do not forward it.
          </span>
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-xl">
        <Link href="/" className="mb-8 inline-flex flex-col">
          <span className="text-xl font-extrabold tracking-tight text-navy-900">
            {siteConfig.company.name}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-700">
            {siteConfig.company.descriptor}
          </span>
        </Link>
        {children}
        <p className="mt-8 text-center text-xs text-navy-400">
          Questions? Write to{" "}
          <a
            href={`mailto:${siteConfig.contact.recruitmentEmail}`}
            className="text-brand-700 underline"
          >
            {siteConfig.contact.recruitmentEmail}
          </a>
        </p>
      </div>
    </main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-8 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <Icon name="shield" className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-navy-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-600">{body}</p>
    </div>
  );
}
