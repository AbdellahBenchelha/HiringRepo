import Link from "next/link";
import { ApplyButton } from "@/components/apply/ApplyButton";

export function CtaBand() {
  return (
    <section className="section bg-white">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-900 to-brand-800 px-6 py-16 text-center text-white shadow-card sm:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:26px_26px]" />
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to start your customer-support career?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-navy-200">
              Apply in minutes. A CV is optional, and our team will review every application.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ApplyButton label="Apply Now" variant="white" className="sm:px-10" />
              <Link href="/jobs" className="btn-outline-white sm:px-10">
                Browse All Positions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
