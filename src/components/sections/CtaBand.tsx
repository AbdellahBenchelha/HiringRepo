import Link from "next/link";
import { ApplyButton } from "@/components/apply/ApplyButton";

export function CtaBand() {
  return (
    <section className="bg-gradient-to-r from-brand-700 to-navy-800 py-16 text-white">
      <div className="container-page text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Ready to start your customer-support career?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-brand-100">
          Apply in minutes. A CV is optional, and our team will review every application.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ApplyButton label="Apply Now" variant="white" className="sm:px-10" />
          <Link href="/jobs" className="btn-outline-white sm:px-10">
            Browse All Positions
          </Link>
        </div>
      </div>
    </section>
  );
}
