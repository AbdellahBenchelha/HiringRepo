import { buildMetadata } from "@/lib/seo";
import { jobs } from "@/config/jobs";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApplicationForm } from "@/components/forms/ApplicationForm";

export const metadata = buildMetadata({
  title: "Apply",
  description:
    "Apply to NexaCare Support Solutions. Complete our application form — a CV is optional and all documents are sent securely to our recruitment team.",
  path: "/apply",
});

export default async function ApplyPage({
  searchParams,
}: {
  searchParams?: Promise<{ position?: string }>;
}) {
  // Pre-select a position if a valid one is passed via ?position=…
  const requested = (await searchParams)?.position;
  const initialPosition =
    requested && jobs.some((j) => j.title === requested) ? requested : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Apply Now"
        title="Submit your application"
        description="Tell us about yourself and your experience. Required fields are marked with an asterisk (*). A CV is optional."
      />
      <section className="section bg-white">
        <div className="container-page max-w-3xl">
          <ApplicationForm initialPosition={initialPosition} />
        </div>
      </section>
    </>
  );
}
