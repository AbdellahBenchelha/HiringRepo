import type { Metadata } from "next";

/**
 * The team portal, served at workroute.team (see src/proxy.ts).
 *
 * `data-portal` is the marker the stylesheet uses to drop the hiring site's
 * header, footer and cookie banner. The portal sets one cookie — the sign-in
 * it cannot work without — so there is nothing to consent to.
 */
export const metadata: Metadata = {
  title: { default: "Team portal", template: "%s | WorkRoute Team" },
  robots: { index: false, follow: false },
  // No canonical pointing at the hiring site.
  alternates: {},
};

export const dynamic = "force-dynamic";

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-portal className="min-h-screen bg-cream-100">
      {children}
    </div>
  );
}
