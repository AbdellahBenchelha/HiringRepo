import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

export default function TeamNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md text-center">
        <Logo className="mx-auto h-10 w-10" />
        <h1 className="mt-4 font-display text-2xl font-extrabold text-navy-900">Page not found</h1>
        <p className="mt-2 text-sm text-navy-500">This page does not exist, or it is not yours to see.</p>
        <Link href="/" className="btn-primary mt-6">
          Go to my portal
        </Link>
      </div>
    </div>
  );
}
