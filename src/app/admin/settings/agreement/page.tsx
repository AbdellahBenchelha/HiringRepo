import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { getSealSettings } from "@/lib/agreementSeal";
import { AgreementSealEditor } from "@/components/admin/AgreementSealEditor";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Agreement signature & stamp",
  robots: { index: false, follow: false },
};

export default async function AdminAgreementSettingsPage() {
  await requireAdmin();
  const s = await getSealSettings();
  const info = (k: "signature" | "stamp") => (s[k] ? { uploadedAt: s[k]!.uploadedAt, by: s[k]!.by } : null);
  const t = siteConfig.agreement;

  return (
    <>
      <header className="mb-5">
        <h2 className="text-lg font-bold text-navy-900">Agreement signature &amp; stamp</h2>
        <p className="mt-1 max-w-3xl text-sm text-navy-500">
          Printed on every final agreement you send, so it arrives already signed for the Company by {t.signatoryName},{" "}
          {t.signatoryTitle}. Kept in private storage: only the server reads them, to draw them into an agreement.
        </p>
      </header>

      <AgreementSealEditor initial={{ signature: info("signature"), stamp: info("stamp") }} />

      <div className="card mt-5 p-5 text-sm leading-relaxed text-navy-600 sm:p-6">
        <h2 className="text-sm font-bold text-navy-900">Good to know</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            Changes apply to agreements sent from now on. Agreements already sent keep the copy that was emailed.
          </li>
          <li>
            To check how it looks, open a candidate on the{" "}
            <Link href="/admin/accepted" className="text-brand-700 underline">
              Accepted
            </Link>{" "}
            tab → Agreement → <strong className="text-navy-800">Preview agreement</strong>.
          </li>
          <li>The images are never published on the website and are not stored in the code.</li>
        </ul>
      </div>
    </>
  );
}
