import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section bg-white">
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Page not found</h1>
        <p className="mt-4 max-w-md text-navy-600">
          Sorry, we couldn&apos;t find the page you were looking for. It may have moved or no longer
          exists.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            Back to home
          </Link>
          <Link href="/jobs" className="btn-secondary">
            View open positions
          </Link>
        </div>
      </div>
    </section>
  );
}
