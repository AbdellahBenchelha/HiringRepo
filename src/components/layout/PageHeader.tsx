import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-navy-100 bg-gradient-to-b from-navy-50 to-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_60%_80%_at_30%_0%,black,transparent)]" />
        <div className="absolute -left-20 top-[-6rem] h-72 w-72 rounded-full bg-brand-200/30 blur-3xl" />
      </div>
      <div className="container-page relative py-14 sm:py-20">
        {eyebrow ? (
          <span className="pill uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {eyebrow}
          </span>
        ) : null}
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-navy-600">{description}</p>
        ) : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </header>
  );
}
