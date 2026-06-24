import { buildMetadata } from "@/lib/seo";
import { ContactSection } from "@/components/sections/ContactSection";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = buildMetadata({
  title: "Contact",
  description:
    "Contact the NexaCare Support Solutions recruitment team. Find our email, phone, address, and business hours, or send us a message.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="We would love to hear from you"
        description="Questions about a role or the application process? Reach out using the details below or the form."
      />
      <ContactSection />
    </>
  );
}
