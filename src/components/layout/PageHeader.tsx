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
    <header className="border-b border-navy-100 bg-gradient-to-b from-navy-50 to-white">
      <div className="container-page py-14 sm:py-20">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">
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
